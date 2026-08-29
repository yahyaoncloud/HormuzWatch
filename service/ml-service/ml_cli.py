"""
HormuzWatch ML Service — CLI management tool.

Usage:
    python ml_cli.py serve [--port PORT]     Start the ML service in background mode
    python ml_cli.py status                   Check if service is running + health
    python ml_cli.py stop                     Stop the running ML service
    python ml_cli.py train --domain vessel    Trigger model training
    python ml_cli.py models                   List available model bundles
    python ml_cli.py predict --domain vessel --features "1,2,3,..."   Run a single prediction
"""

import argparse
import json
import os
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PID_FILE = ROOT / ".ml_service.pid"
DEFAULT_PORT = int(os.getenv("ML_PORT", "8090"))
LOG_FILE = ROOT / "ml_service.log"


# ── Helpers ──────────────────────────────────────────────────────────

def _is_running(port: int = DEFAULT_PORT) -> bool:
    """Check if the ML service is reachable."""
    try:
        import urllib.request
        resp = urllib.request.urlopen(f"http://localhost:{port}/health", timeout=3)
        data = json.loads(resp.read())
        return data.get("status") == "healthy"
    except Exception:
        return False


def _get_pid() -> int | None:
    if PID_FILE.exists():
        try:
            return int(PID_FILE.read_text().strip())
        except (ValueError, OSError):
            pass
    return None


def _stop_service():
    pid = _get_pid()
    if pid:
        try:
            os.kill(pid, signal.SIGTERM)
            print(f"  Sent SIGTERM to PID {pid}")
            time.sleep(2)
            # Force kill if still alive
            try:
                os.kill(pid, 0)
                os.kill(pid, signal.SIGKILL)
                print(f"  Force-killed PID {pid}")
            except OSError:
                pass
        except OSError:
            print(f"  Process {pid} already stopped")
        PID_FILE.unlink(missing_ok=True)
    else:
        print("  No PID file found — service may not be running")


# ── Commands ─────────────────────────────────────────────────────────

def cmd_serve(port: int):
    """Start the ML service in background."""
    if _is_running(port):
        print(f"ML service already running on port {port}")
        return

    # Also start the gRPC server in the subprocess
    script = """
import sys, os
os.environ["ML_PORT"] = str({port})

# Start FastAPI health/liveness server in a thread
import threading
import uvicorn

def run_api():
    uvicorn.run("app:app", host="0.0.0.0", port={port}, log_level="info", reload=False)

api_thread = threading.Thread(target=run_api, daemon=True)
api_thread.start()

# Start gRPC server on port 8091
import grpc
from concurrent import futures
import ml_service_pb2_grpc
from grpc_server import MLInferenceService

grpc_server = grpc.server(futures.ThreadPoolExecutor(max_workers=4))
ml_service_pb2_grpc.add_MLInferenceServicer_to_server(MLInferenceService(), grpc_server)
grpc_addr = f"0.0.0.0:{int(os.getenv('GRPC_PORT', '8091'))}"
grpc_server.add_insecure_port(grpc_addr)
grpc_server.start()
print(f"gRPC server listening on {{grpc_addr}}")

# Write PID
with open("{pid_file}", "w") as f:
    f.write(str(os.getpid()))

# Keep main thread alive
api_thread.join()
""".format(port=port, pid_file=str(PID_FILE).replace("\\", "\\\\"))

    log = open(LOG_FILE, "a")
    proc = subprocess.Popen(
        [sys.executable, "-c", script],
        cwd=str(ROOT),
        stdout=log,
        stderr=log,
        creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
    )
    print(f"  ML service started (PID {proc.pid}, port {port})")
    print(f"  Logs: {LOG_FILE}")

    # Wait for it to become healthy
    for i in range(10):
        time.sleep(1)
        if _is_running(port):
            print(f"  ML service healthy on http://localhost:{port}/health")
            return
    print(f"  WARNING: ML service did not become healthy within 10 seconds")


def cmd_status():
    """Print service status."""
    pid = _get_pid()
    running = _is_running()

    print(f"""
=== HormuzWatch ML Service Status ===

  PID file    : {PID_FILE}
  PID         : {pid or 'N/A'}
  Health check: {'HEALTHY' if running else 'UNHEALTHY / DOWN'}
  Endpoint    : http://localhost:{DEFAULT_PORT}/health
  gRPC        : localhost:8091
  Models dir  : {ROOT / 'models'}
  Logs        : {LOG_FILE}
""")

    if running:
        try:
            import urllib.request
            resp = json.loads(
                urllib.request.urlopen(f"http://localhost:{DEFAULT_PORT}/health", timeout=3).read()
            )
            print(f"  Uptime    : {resp.get('uptime_seconds', 'N/A')}s")
            print(f"  Models    : {resp.get('models_loaded', 'N/A')}")
        except Exception:
            pass


def cmd_stop():
    """Stop the running ML service."""
    print("Stopping ML service...")
    _stop_service()
    time.sleep(1)
    if _is_running():
        print("  WARNING: Service may still be running")
    else:
        print("  ML service stopped")


def cmd_train(domain: str):
    """Trigger model training for a domain."""
    if not _is_running():
        print("ML service is not running. Start it first with: python ml_cli.py serve")
        return

    try:
        import urllib.request
        req = urllib.request.Request(
            f"http://localhost:{DEFAULT_PORT}/api/train",
            data=json.dumps({"domain": domain}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        resp = json.loads(urllib.request.urlopen(req, timeout=120).read())
        print(json.dumps(resp, indent=2))
    except Exception as e:
        print(f"  Training failed: {e}")


def cmd_models():
    """List available model bundles."""
    models_dir = ROOT / "models"
    if not models_dir.exists():
        print("  No models directory found")
        return

    print("\n=== Available Model Bundles ===\n")
    for f in sorted(models_dir.glob("*.joblib")):
        size_kb = f.stat().st_size / 1024
        print(f"  {f.name}  ({size_kb:.1f} KB)")


def cmd_predict(domain: str, features: str):
    """Run a single prediction against the ML service."""
    if not _is_running():
        print("ML service is not running. Start it first with: python ml_cli.py serve")
        return

    try:
        feature_list = [float(x.strip()) for x in features.split(",")]
    except ValueError:
        print("  ERROR: Features must be comma-separated numbers")
        sys.exit(1)

    try:
        import urllib.request
        req = urllib.request.Request(
            f"http://localhost:{DEFAULT_PORT}/api/predict",
            data=json.dumps({"domain": domain, "features": feature_list}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        resp = json.loads(urllib.request.urlopen(req, timeout=30).read())
        print(json.dumps(resp, indent=2))
    except Exception as e:
        print(f"  Prediction failed: {e}")


# ── CLI Entry Point ──────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="HormuzWatch ML Service CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # serve
    p = sub.add_parser("serve", help="Start ML service in background")
    p.add_argument("--port", type=int, default=DEFAULT_PORT)

    # status
    sub.add_parser("status", help="Check service status and health")

    # stop
    sub.add_parser("stop", help="Stop the running ML service")

    # train
    p = sub.add_parser("train", help="Trigger model training")
    p.add_argument("--domain", default="vessel", choices=["vessel", "aviation", "heatmap", "news"])

    # models
    sub.add_parser("models", help="List available model bundles")

    # predict
    p = sub.add_parser("predict", help="Run a single prediction")
    p.add_argument("--domain", default="vessel", choices=["vessel", "aviation", "heatmap", "news"])
    p.add_argument("--features", required=True, help="Comma-separated feature values")

    args = parser.parse_args()

    # Map command to handler
    handlers = {
        "serve":   lambda: cmd_serve(args.port),
        "status":  cmd_status,
        "stop":    cmd_stop,
        "train":   lambda: cmd_train(args.domain),
        "models":  cmd_models,
        "predict": lambda: cmd_predict(args.domain, args.features),
    }

    handlers[args.command]()


if __name__ == "__main__":
    main()
