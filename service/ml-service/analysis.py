"""
analysis.py — HormuzWatch Dataset Analysis Engine
===================================================

Reads exported CSV/JSON datasets from the Go backend's ``./datasets/exports/``
directory and generates analytical charts as PNG images. These charts are then
displayed on the admin portal's Dataset Analysis page.

Also provides a FastAPI router for triggering analysis and serving chart
images via the ML service.

Usage as CLI:
    python analysis.py --input ../datasets/exports/hormuzwatch-export-*.zip
    python analysis.py --input ../datasets/exports/hormuzwatch-export-*.json

Usage as API:
    The router is mounted in app.py via include_router.
"""
from __future__ import annotations

import argparse
import io
import json
import os
import zipfile
import csv
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, List, Optional, Tuple

# Matplotlib non-interactive backend (headless)
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import numpy as np

# COLORS (enterprise dark theme)
C_BG = "#0a0e14"
C_CARD = "#131820"
C_BORDER = "#1e293b"
C_FG = "#e2e8f0"
C_MUTED = "#64748b"
C_RED = "#ef4444"
C_AMBER = "#f59e0b"
C_GREEN = "#22c55e"
C_BLUE = "#3b82f6"
C_PURPLE = "#a855f7"
C_CYAN = "#06b6d4"

plt.rcParams.update({
    "figure.facecolor": C_BG,
    "axes.facecolor": C_CARD,
    "axes.edgecolor": C_BORDER,
    "axes.labelcolor": C_MUTED,
    "text.color": C_FG,
    "xtick.color": C_MUTED,
    "ytick.color": C_MUTED,
    "grid.color": C_BORDER,
    "grid.alpha": 0.5,
    "legend.facecolor": C_CARD,
    "legend.edgecolor": C_BORDER,
    "legend.labelcolor": C_FG,
    "font.size": 9,
    "axes.titlesize": 12,
    "axes.labelsize": 9,
    "figure.dpi": 120,
})

# ── Config ─────────────────────────────────────────────────────────────────

DEFAULT_EXPORT_DIR = Path(__file__).resolve().parent.parent / "datasets" / "exports"
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "analysis_output"

# Ensure output directory exists
DEFAULT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ── FastAPI Router ─────────────────────────────────────────────────────────

def create_router():
    """Create and return a FastAPI router for the analysis endpoints."""
    from fastapi import APIRouter, HTTPException, Query
    from fastapi.responses import FileResponse, JSONResponse

    router = APIRouter(prefix="/api/analysis", tags=["analysis"])

    @router.get("/datasets")
    async def list_datasets():
        """List available dataset export files."""
        files = []
        if DEFAULT_EXPORT_DIR.exists():
            for f in sorted(DEFAULT_EXPORT_DIR.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
                if f.suffix in (".zip", ".json"):
                    files.append({
                        "name": f.name,
                        "size": f.stat().st_size,
                        "modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                        "format": f.suffix.lstrip("."),
                    })
        return {"datasets": files, "count": len(files)}

    @router.get("/charts")
    async def list_charts():
        """List available generated chart images."""
        if not DEFAULT_OUTPUT_DIR.exists():
            return {"charts": [], "count": 0}
        charts = []
        for f in sorted(DEFAULT_OUTPUT_DIR.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
            if f.suffix == ".png":
                charts.append({
                    "name": f.name,
                    "size": f.stat().st_size,
                    "created": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                })
        return {"charts": charts, "count": len(charts)}

    @router.get("/chart/{name}")
    async def get_chart(name: str):
        """Serve a specific chart image."""
        path = DEFAULT_OUTPUT_DIR / name
        if not path.exists():
            raise HTTPException(404, f"Chart '{name}' not found")
        return FileResponse(path, media_type="image/png")

    @router.post("/run")
    async def run_analysis(dataset: str = Query(None, description="Dataset filename to analyze")):
        """Trigger analysis on a specific dataset or the latest one."""
        if dataset:
            path = DEFAULT_EXPORT_DIR / dataset
            if not path.exists():
                raise HTTPException(404, f"Dataset '{dataset}' not found")
            result = analyze_dataset(path)
        else:
            # Find the latest dataset
            datasets = sorted(
                [f for f in DEFAULT_EXPORT_DIR.iterdir() if f.suffix in (".zip", ".json")],
                key=lambda x: x.stat().st_mtime,
                reverse=True,
            )
            if not datasets:
                raise HTTPException(404, "No datasets found in export directory")
            result = analyze_dataset(datasets[0])

        return JSONResponse(result)

    return router


# ── Core Analysis ───────────────────────────────────────────────────────────

def analyze_dataset(filepath: Path) -> dict:
    """Analyze a dataset export file and generate charts."""
    if filepath.suffix == ".zip":
        tables = read_zip_csvs(filepath)
    elif filepath.suffix == ".json":
        tables = read_json_tables(filepath)
    else:
        return {"error": f"Unsupported format: {filepath.suffix}"}

    if not tables:
        return {"error": "No data found in dataset"}

    results = {
        "dataset": filepath.name,
        "analyzed_at": datetime.utcnow().isoformat(),
        "charts": [],
        "insights": {},
    }

    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")

    # ── Chart 1: Observation Volume Over Time (telemetry_observations) ─────
    if "telemetry_observations" in tables:
        chart_name = f"analysis_volume_{timestamp}.png"
        chart_path = DEFAULT_OUTPUT_DIR / chart_name
        _chart_volume_over_time(tables["telemetry_observations"], chart_path)
        results["charts"].append({"name": chart_name, "title": "Observation Volume Over Time"})

    # ── Chart 2: Severity Distribution (anomalies) ────────────────────────
    if "anomalies" in tables:
        chart_name = f"analysis_severity_{timestamp}.png"
        chart_path = DEFAULT_OUTPUT_DIR / chart_name
        _chart_severity_distribution(tables["anomalies"], chart_path)
        results["charts"].append({"name": chart_name, "title": "Anomaly Severity Distribution"})

    # ── Chart 3: Speed Distribution (tracks) ──────────────────────────────
    if "tracks" in tables:
        chart_name = f"analysis_speed_{timestamp}.png"
        chart_path = DEFAULT_OUTPUT_DIR / chart_name
        _chart_speed_distribution(tables["tracks"], chart_path)
        results["charts"].append({"name": chart_name, "title": "Vessel Speed Distribution"})

    # ── Chart 4: Transit Direction Breakdown (transit_events) ────────────
    if "transit_events" in tables:
        chart_name = f"analysis_transits_{timestamp}.png"
        chart_path = DEFAULT_OUTPUT_DIR / chart_name
        _chart_transit_direction(tables["transit_events"], chart_path)
        results["charts"].append({"name": chart_name, "title": "Transit Direction Analysis"})

    # ── Chart 5: Event Type Distribution (events) ────────────────────────
    if "events" in tables:
        chart_name = f"analysis_events_{timestamp}.png"
        chart_path = DEFAULT_OUTPUT_DIR / chart_name
        _chart_event_types(tables["events"], chart_path)
        results["charts"].append({"name": chart_name, "title": "Intelligence Event Categories"})

    # ── Chart 6: Anomaly Score Trend ─────────────────────────────────────
    if "anomalies" in tables:
        chart_name = f"analysis_score_trend_{timestamp}.png"
        chart_path = DEFAULT_OUTPUT_DIR / chart_name
        _chart_anomaly_score_trend(tables["anomalies"], chart_path)
        results["charts"].append({"name": chart_name, "title": "Anomaly Score Trend"})

    # ── Insights ─────────────────────────────────────────────────────────
    results["insights"] = _compute_insights(tables)

    return results


# ── Data Readers ────────────────────────────────────────────────────────────

def read_zip_csvs(filepath: Path) -> dict[str, list[dict]]:
    """Read all CSVs from a zip archive into a dict of table_name -> rows."""
    tables = {}
    with zipfile.ZipFile(filepath, "r") as zf:
        for name in zf.namelist():
            if not name.endswith(".csv"):
                continue
            # Extract table name from filename (e.g. hormuzwatch-export-..._telemetry_observations.csv)
            base = os.path.basename(name).rstrip(".csv")
            # Get the last segment after the timestamp prefix
            parts = base.split("_", 4)  # hormuzwatch - export - YYYYMMDD - HHMMSS - TABLE
            table_name = parts[-1] if len(parts) >= 5 else base

            with zf.open(name) as f:
                reader = csv.DictReader(io.TextIOWrapper(f, "utf-8"))
                tables[table_name] = list(reader)

    return tables


def read_json_tables(filepath: Path) -> dict[str, list[dict]]:
    """Read tables from a JSON export format."""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    tables = {}
    tables_raw = data.get("tables", {})
    for name, tbl in tables_raw.items():
        rows = []
        columns = tbl.get("columns", [])
        for row in tbl.get("rows", []):
            rows.append(dict(zip(columns, row)))
        tables[name] = rows
    return tables


# ── Chart Generators ────────────────────────────────────────────────────────

def _chart_volume_over_time(rows: list[dict], output: Path):
    """Bar chart: observation count per hour."""
    times = []
    for r in rows:
        ts_str = r.get("observed_at") or r.get("recorded_at") or r.get("last_updated") or r.get("timestamp")
        if ts_str:
            try:
                times.append(datetime.fromisoformat(ts_str.replace("Z", "+00:00")))
            except (ValueError, TypeError):
                continue

    if not times:
        return

    times.sort()
    start, end = times[0], times[-1]
    if end - start < timedelta(hours=1):
        return

    # Bucket by hour
    hours = int((end - start).total_seconds() / 3600) + 1
    buckets = [0] * hours
    for t in times:
        idx = int((t - start).total_seconds() / 3600)
        if 0 <= idx < hours:
            buckets[idx] += 1

    labels = [start + timedelta(hours=i) for i in range(hours)]

    fig, ax = plt.subplots(figsize=(10, 4))
    ax.bar(labels, buckets, width=0.03, color=C_BLUE, alpha=0.85, edgecolor=C_BORDER, linewidth=0.5)
    ax.set_title("Observation Volume Over Time", color=C_FG, fontweight="bold")
    ax.set_ylabel("Observations", color=C_MUTED)
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%m/%d %H:%M"))
    ax.xaxis.set_major_locator(mdates.AutoDateLocator())
    fig.autofmt_xdate(rotation=30)
    ax.grid(axis="y", alpha=0.3)
    fig.tight_layout()
    fig.savefig(output, dpi=150, bbox_inches="tight", facecolor=C_BG)
    plt.close(fig)


def _chart_severity_distribution(rows: list[dict], output: Path):
    """Pie chart: severity breakdown."""
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for r in rows:
        sev = (r.get("severity") or "").strip().lower()
        if sev in counts:
            counts[sev] += 1

    if sum(counts.values()) == 0:
        return

    labels = list(counts.keys())
    values = list(counts.values())
    colors = [C_RED, C_AMBER, C_BLUE, C_GREEN]

    fig, ax = plt.subplots(figsize=(5, 4))
    wedges, texts, autotexts = ax.pie(
        values, labels=None, colors=colors,
        autopct=lambda pct: f"{pct:.0f}%" if pct > 3 else "",
        startangle=90, pctdistance=0.75,
        wedgeprops={"linewidth": 1, "edgecolor": C_BORDER},
    )
    for t in autotexts:
        t.set_color(C_FG)
        t.set_fontsize(8)
    ax.legend(wedges, [f"{l} ({v})" for l, v in zip(labels, values)],
              loc="center left", bbox_to_anchor=(1, 0.5), fontsize=8)
    ax.set_title("Anomaly Severity Distribution", color=C_FG, fontweight="bold")
    fig.tight_layout()
    fig.savefig(output, dpi=150, bbox_inches="tight", facecolor=C_BG)
    plt.close(fig)


def _chart_speed_distribution(rows: list[dict], output: Path):
    """Histogram: vessel speed distribution."""
    speeds = []
    for r in rows:
        try:
            s = float(r.get("speed", 0))
            if 0 <= s <= 50:
                speeds.append(s)
        except (ValueError, TypeError):
            continue

    if not speeds:
        return

    fig, ax = plt.subplots(figsize=(10, 4))
    n, bins, patches = ax.hist(speeds, bins=30, color=C_CYAN, alpha=0.8,
                                edgecolor=C_BORDER, linewidth=0.5)
    ax.axvline(np.median(speeds), color=C_AMBER, linestyle="--", linewidth=1.5,
               label=f"Median {np.median(speeds):.1f} kn")
    ax.set_title("Vessel Speed Distribution", color=C_FG, fontweight="bold")
    ax.set_xlabel("Speed (kn)", color=C_MUTED)
    ax.set_ylabel("Count", color=C_MUTED)
    ax.legend()
    ax.grid(axis="y", alpha=0.3)
    fig.tight_layout()
    fig.savefig(output, dpi=150, bbox_inches="tight", facecolor=C_BG)
    plt.close(fig)


def _chart_transit_direction(rows: list[dict], output: Path):
    """Bar chart: transit direction by gate."""
    gate_dirs = {}
    for r in rows:
        gate = r.get("gate") or r.get("gate_name") or "Unknown"
        direction = r.get("direction") or "UNKNOWN"
        key = (gate, direction)
        gate_dirs[key] = gate_dirs.get(key, 0) + 1

    if not gate_dirs:
        return

    # Group by gate
    gates = sorted(set(g for g, _ in gate_dirs))
    inbound = [gate_dirs.get((g, "INBOUND"), 0) for g in gates]
    outbound = [gate_dirs.get((g, "OUTBOUND"), 0) for g in gates]

    fig, ax = plt.subplots(figsize=(8, 4))
    x = np.arange(len(gates))
    width = 0.35
    ax.bar(x - width/2, inbound, width, color=C_GREEN, alpha=0.85, label="Inbound",
           edgecolor=C_BORDER, linewidth=0.5)
    ax.bar(x + width/2, outbound, width, color=C_RED, alpha=0.85, label="Outbound",
           edgecolor=C_BORDER, linewidth=0.5)
    ax.set_xticks(x)
    ax.set_xticklabels(gates, rotation=20, ha="right", fontsize=7)
    ax.set_title("Transit Direction by Gate", color=C_FG, fontweight="bold")
    ax.set_ylabel("Count", color=C_MUTED)
    ax.legend()
    ax.grid(axis="y", alpha=0.3)
    fig.tight_layout()
    fig.savefig(output, dpi=150, bbox_inches="tight", facecolor=C_BG)
    plt.close(fig)


def _chart_event_types(rows: list[dict], output: Path):
    """Horizontal bar chart: event type distribution."""
    type_counts = {}
    for r in rows:
        etype = (r.get("event_type") or r.get("type") or "unknown").strip().lower()
        type_counts[etype] = type_counts.get(etype, 0) + 1

    if not type_counts:
        return

    sorted_types = sorted(type_counts.items(), key=lambda x: x[1])
    labels = [t.replace("_", " ").title() for t, _ in sorted_types]
    values = [v for _, v in sorted_types]

    fig, ax = plt.subplots(figsize=(8, 5))
    y_pos = np.arange(len(labels))
    bar_colors = [C_PURPLE if v == max(values) else C_BLUE for v in values]
    ax.barh(y_pos, values, color=bar_colors, alpha=0.85, edgecolor=C_BORDER, linewidth=0.5)
    ax.set_yticks(y_pos)
    ax.set_yticklabels(labels, fontsize=7)
    ax.set_xlabel("Count", color=C_MUTED)
    ax.set_title("Intelligence Event Categories", color=C_FG, fontweight="bold")
    ax.grid(axis="x", alpha=0.3)
    fig.tight_layout()
    fig.savefig(output, dpi=150, bbox_inches="tight", facecolor=C_BG)
    plt.close(fig)


def _chart_anomaly_score_trend(rows: list[dict], output: Path):
    """Line chart: anomaly score over time."""
    times = []
    scores = []
    for r in rows:
        ts_str = r.get("last_updated") or r.get("observed_at") or ""
        score_str = r.get("score") or "0"
        try:
            t = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            s = float(score_str)
            times.append(t)
            scores.append(s)
        except (ValueError, TypeError):
            continue

    if not times or len(times) < 2:
        return

    # Sort by time
    paired = sorted(zip(times, scores))
    times, scores = zip(*paired)

    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(times, scores, color=C_RED, linewidth=1.5, alpha=0.9)
    ax.fill_between(times, 0, scores, color=C_RED, alpha=0.1)
    ax.axhline(70, color=C_AMBER, linestyle="--", linewidth=1, alpha=0.6, label="High threshold")
    ax.axhline(85, color=C_RED, linestyle=":", linewidth=1, alpha=0.6, label="Critical threshold")
    ax.set_title("Anomaly Score Trend", color=C_FG, fontweight="bold")
    ax.set_ylabel("Anomaly Score", color=C_MUTED)
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%m/%d %H:%M"))
    ax.xaxis.set_major_locator(mdates.AutoDateLocator())
    fig.autofmt_xdate(rotation=30)
    ax.legend()
    ax.grid(alpha=0.3)
    fig.tight_layout()
    fig.savefig(output, dpi=150, bbox_inches="tight", facecolor=C_BG)
    plt.close(fig)


def _compute_insights(tables: dict[str, list[dict]]) -> dict:
    """Compute numerical insights from the dataset tables."""
    insights = {}

    # Telemetry count
    if "telemetry_observations" in tables:
        insights["total_observations"] = len(tables["telemetry_observations"])

    # Anomaly breakdown
    if "anomalies" in tables:
        anomalies = tables["anomalies"]
        sev = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        scores = []
        for a in anomalies:
            sev[a.get("severity", "low").lower()] = sev.get(a.get("severity", "low").lower(), 0) + 1
            try:
                scores.append(float(a.get("score", 0)))
            except (ValueError, TypeError):
                pass
        insights["anomaly_counts"] = sev
        insights["total_anomalies"] = len(anomalies)
        if scores:
            insights["avg_anomaly_score"] = round(np.mean(scores), 1)
            insights["max_anomaly_score"] = round(max(scores), 1)

    # Transit stats
    if "transit_events" in tables:
        transits = tables["transit_events"]
        inbound = sum(1 for t in transits if t.get("direction", "").upper() == "INBOUND")
        outbound = sum(1 for t in transits if t.get("direction", "").upper() == "OUTBOUND")
        insights["total_transits"] = len(transits)
        insights["transit_inbound"] = inbound
        insights["transit_outbound"] = outbound

    # Active tracks
    if "tracks" in tables:
        tracks = tables["tracks"]
        speeds = []
        for t in tracks:
            try:
                speeds.append(float(t.get("speed", 0)))
            except (ValueError, TypeError):
                pass
        insights["active_tracks"] = len(tracks)
        if speeds:
            insights["avg_speed"] = round(np.mean(speeds), 1)
            insights["max_speed"] = round(max(speeds), 1)

    # Event types
    if "events" in tables:
        insights["total_events"] = len(tables["events"])

    # Articles
    if "articles" in tables:
        insights["total_articles"] = len(tables["articles"])

    return insights


# ── CLI Entry Point ─────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="HormuzWatch Dataset Analysis Engine")
    parser.add_argument("--input", "-i", type=str, help="Path to export file (.zip or .json)")
    parser.add_argument("--output-dir", "-o", type=str, default=str(DEFAULT_OUTPUT_DIR),
                        help="Directory for generated chart images")
    parser.add_argument("--api", action="store_true", help="Start FastAPI analysis server")
    parser.add_argument("--port", type=int, default=8092, help="API server port (default: 8092)")

    args = parser.parse_args()

    if args.api:
        from fastapi import FastAPI
        import uvicorn
        app = FastAPI(title="HormuzWatch Analysis API", version="2.0")
        app.include_router(create_router())

        @app.get("/health")
        async def health():
            return {"status": "healthy", "service": "analysis-api"}

        uvicorn.run(app, host="0.0.0.0", port=args.port, log_level="info")
        return

    # CLI mode: analyze a single file
    if not args.input:
        # Find the latest export file
        exp_dir = DEFAULT_EXPORT_DIR
        if not exp_dir.exists():
            print("No export directory found and no --input specified.", file=sys.stderr)
            print(f"Expected: {exp_dir}", file=sys.stderr)
            sys.exit(1)
        files = sorted(
            [f for f in exp_dir.iterdir() if f.suffix in (".zip", ".json")],
            key=lambda x: x.stat().st_mtime, reverse=True,
        )
        if not files:
            print("No export files found in", exp_dir, file=sys.stderr)
            sys.exit(1)
        filepath = files[0]
        print(f"Analyzing latest export: {filepath.name}")
    else:
        filepath = Path(args.input)
        if not filepath.exists():
            print(f"File not found: {filepath}", file=sys.stderr)
            sys.exit(1)

    result = analyze_dataset(filepath)
    print(json.dumps(result, indent=2, default=str))
    print(f"\nCharts saved to: {DEFAULT_OUTPUT_DIR}")


if __name__ == "__main__":
    main()
