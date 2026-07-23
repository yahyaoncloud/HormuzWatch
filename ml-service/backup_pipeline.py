"""
backup_pipeline.py — Dataset Backup & Export Pipeline
======================================================

Exports HormuzWatch datasets to multiple storage backends:
  - Supabase Storage (bucket upload)
  - Local disk (timestamped archives)
  - Telegram (summary notification)

Usage:
    python backup_pipeline.py
        --api-base http://localhost:10020
        --supabase-url https://xxx.supabase.co
        --supabase-key your-service-role-key
        --telegram-bot-token 123:abc
        --telegram-chat-id -456789
        --backup-dir ./backups

Dependencies: pip install requests python-dotenv supabase
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("backup")


# ── API Data Fetcher ──────────────────────────────────────────────────────────

class DataExporter:
    """Fetches data from HormuzWatch API endpoints."""

    def __init__(self, api_base: str = "http://localhost:10020"):
        self.api_base = api_base.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/json"})

    def fetch(self, path: str, timeout: int = 30) -> Optional[dict]:
        """Generic fetch with error handling."""
        url = f"{self.api_base}{path}"
        try:
            resp = self.session.get(url, timeout=timeout)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            log.error("Failed to fetch %s: %s", path, e)
            return None

    def export_all(self) -> dict:
        """Fetch all available datasets."""
        datasets = {}
        endpoints = {
            "conflicts": "/public/conflicts",
            "metrics": "/public/metrics",
            "top_traces": "/public/top-traces",
            "briefing": "/public/briefing",
            "heatmap": "/public/heatmap",
            "news": "/public/news",
        }
        for name, path in endpoints.items():
            data = self.fetch(path)
            if data:
                datasets[name] = data
                log.info("Fetched %s: %s records", name, data.get("count", len(data)))
            time.sleep(0.3)  # polite rate limiting
        return datasets


# ── Local Disk Backup ─────────────────────────────────────────────────────────

def backup_to_disk(datasets: dict, backup_dir: str) -> Path:
    """Save all datasets as timestamped JSON archive."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    dir_path = Path(backup_dir) / ts
    dir_path.mkdir(parents=True, exist_ok=True)

    for name, data in datasets.items():
        filepath = dir_path / f"{name}.json"
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)
        log.info("Saved %s -> %s (%d bytes)", name, filepath.name, filepath.stat().st_size)

    # Write manifest
    manifest = {
        "backup_timestamp": ts,
        "backup_dir": str(dir_path),
        "datasets": list(datasets.keys()),
        "record_counts": {k: len(v) if isinstance(v, list) else "object" for k, v in datasets.items()},
    }
    with open(dir_path / "manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)

    log.info("Backup complete: %s", dir_path)
    return dir_path


# ── Supabase Storage Upload ───────────────────────────────────────────────────

def backup_to_supabase(
    backup_dir: Path,
    supabase_url: str,
    supabase_key: str,
    bucket: str = "backups",
) -> bool:
    """Upload backup archives to Supabase Storage bucket."""
    try:
        from supabase import create_client, Client
    except ImportError:
        log.error("supabase-py not installed. Run: pip install supabase")
        return False

    supabase: Client = create_client(supabase_url, supabase_key)

    # Ensure bucket exists
    try:
        supabase.storage.create_bucket(bucket, {"public": False})
        log.info("Created Supabase bucket: %s", bucket)
    except Exception:
        log.info("Supabase bucket '%s' already exists or cannot be created", bucket)

    uploaded = 0
    for filepath in backup_dir.glob("*.json"):
        remote_path = f"{backup_dir.name}/{filepath.name}"
        try:
            with open(filepath, "rb") as f:
                supabase.storage.from_(bucket).upload(
                    remote_path, f.read(),
                    {"content-type": "application/json", "upsert": "true"}
                )
            uploaded += 1
            log.info("Uploaded %s -> supabase://%s/%s", filepath.name, bucket, remote_path)
        except Exception as e:
            log.error("Supabase upload failed for %s: %s", filepath.name, e)

    log.info("Supabase: %d/%d files uploaded", uploaded, len(list(backup_dir.glob("*.json"))))
    return uploaded > 0


# ── Telegram Notification ─────────────────────────────────────────────────────

def notify_telegram(
    bot_token: str,
    chat_id: str,
    message: str,
) -> bool:
    """Send a notification via Telegram Bot API."""
    if not bot_token or not chat_id:
        log.warning("Telegram credentials not configured — skipping notification")
        return False

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }
    try:
        resp = requests.post(url, json=payload, timeout=10)
        resp.raise_for_status()
        log.info("Telegram notification sent")
        return True
    except Exception as e:
        log.error("Telegram notification failed: %s", e)
        return False


def build_summary(datasets: dict, backup_dir: Path, duration_sec: float) -> str:
    """Build a human-readable summary for Telegram."""
    lines = [
        "<b>🔐 HormuzWatch Backup Complete</b>",
        f"<b>Timestamp:</b> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
        f"<b>Duration:</b> {duration_sec:.1f}s",
        f"<b>Archive:</b> {backup_dir.name}",
        "",
        "<b>Exported Datasets:</b>",
    ]
    for name, data in datasets.items():
        count = len(data) if isinstance(data, list) else "object"
        lines.append(f"  • {name}: {count} records")

    # Size
    total_size = sum(f.stat().st_size for f in backup_dir.glob("*.json"))
    lines.append("")
    lines.append(f"<b>Total size:</b> {total_size / 1024:.1f} KB")

    return "\n".join(lines)


# ── Retention / Cleanup ───────────────────────────────────────────────────────

def cleanup_old_backups(backup_dir: str, keep_days: int = 30) -> int:
    """Remove backups older than keep_days."""
    base = Path(backup_dir)
    cutoff = datetime.now().timestamp() - (keep_days * 86400)
    removed = 0

    for d in base.iterdir():
        if d.is_dir():
            try:
                mtime = d.stat().st_mtime
                if mtime < cutoff:
                    for f in d.glob("*"):
                        f.unlink()
                    d.rmdir()
                    removed += 1
                    log.info("Removed old backup: %s", d.name)
            except Exception as e:
                log.warning("Cleanup error for %s: %s", d.name, e)

    log.info("Cleanup: removed %d old backups (keep %d days)", removed, keep_days)
    return removed


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="HormuzWatch Dataset Backup Pipeline")
    parser.add_argument("--api-base", default="http://localhost:10020")
    parser.add_argument("--backup-dir", default="./backups")
    parser.add_argument("--keep-days", type=int, default=30)
    parser.add_argument("--supabase-url", default=os.getenv("SUPABASE_URL", ""))
    parser.add_argument("--supabase-key", default=os.getenv("SUPABASE_SERVICE_KEY", ""))
    parser.add_argument("--supabase-bucket", default="backups")
    parser.add_argument("--telegram-bot-token", default=os.getenv("TELEGRAM_BOT_TOKEN", ""))
    parser.add_argument("--telegram-chat-id", default=os.getenv("TELEGRAM_CHAT_ID", ""))
    parser.add_argument("--no-supabase", action="store_true")
    parser.add_argument("--no-telegram", action="store_true")
    args = parser.parse_args()

    start = time.time()
    log.info("=== HormuzWatch Backup Pipeline ===")

    # 1. Fetch data
    exporter = DataExporter(args.api_base)
    datasets = exporter.export_all()
    if not datasets:
        log.error("No data fetched — aborting")
        sys.exit(1)

    # 2. Save to disk
    backup_dir = backup_to_disk(datasets, args.backup_dir)

    # 3. Upload to Supabase
    if not args.no_supabase and args.supabase_url and args.supabase_key:
        backup_to_supabase(backup_dir, args.supabase_url, args.supabase_key, args.supabase_bucket)
    else:
        log.info("Supabase backup skipped (not configured or --no-supabase)")

    # 4. Notify via Telegram
    if not args.no_telegram and args.telegram_bot_token and args.telegram_chat_id:
        duration = time.time() - start
        summary = build_summary(datasets, backup_dir, duration)
        notify_telegram(args.telegram_bot_token, args.telegram_chat_id, summary)

    # 5. Cleanup old backups
    cleanup_old_backups(args.backup_dir, args.keep_days)

    duration = time.time() - start
    log.info("=== Backup complete in %.1fs ===", duration)


if __name__ == "__main__":
    main()
