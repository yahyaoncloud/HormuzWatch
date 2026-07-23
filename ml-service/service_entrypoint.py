"""Run the gRPC inference service and the internal FastAPI diagnostics API.

Go uses the gRPC listener on ``GRPC_PORT``.  The HTTP service remains on an
unpublished internal port for model diagnostics and offline tooling, avoiding a
port/protocol mismatch on the inference path.
"""

from __future__ import annotations

import os
from threading import Thread

import uvicorn

import grpc_server


def _run_http() -> None:
    config = uvicorn.Config(
        "app:app",
        host="0.0.0.0",
        port=int(os.environ.get("HTTP_PORT", "8000")),
        log_level=os.environ.get("HTTP_LOG_LEVEL", "info"),
    )
    uvicorn.Server(config).run()


def main() -> None:
    # Uvicorn is intentionally secondary: gRPC is the production inference
    # transport and owns process lifetime/signal handling.
    Thread(target=_run_http, name="http-diagnostics", daemon=True).start()
    grpc_server.serve()


if __name__ == "__main__":
    main()
