"""Run the gRPC inference service and the internal FastAPI diagnostics API with unified shutdown.

Go uses the gRPC listener on ``GRPC_PORT``. The HTTP service provides model diagnostics,
drift evaluation, and health endpoints on ``ML_PORT`` / ``HTTP_PORT``.
"""

from __future__ import annotations

import logging
import os
import signal
import sys
from threading import Thread

import uvicorn

import app as fastapi_app
import grpc_server

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("hormuzwatch.entrypoint")


def _run_http(server: uvicorn.Server) -> None:
    server.run()


def main() -> None:
    http_port = int(os.environ.get("ML_PORT", os.environ.get("HTTP_PORT", "8090")))
    config = uvicorn.Config(
        fastapi_app.app,
        host="0.0.0.0",
        port=http_port,
        log_level=os.environ.get("HTTP_LOG_LEVEL", "info"),
    )
    http_server = uvicorn.Server(config)

    http_thread = Thread(target=_run_http, args=(http_server,), name="http-diagnostics", daemon=True)
    http_thread.start()
    logger.info("FastAPI HTTP diagnostics listening on port %d", http_port)

    def _signal_handler(sig, _frame):
        logger.info("Termination signal received (%s). Shutting down ML services...", sig)
        http_server.should_exit = True
        sys.exit(0)

    signal.signal(signal.SIGINT, _signal_handler)
    signal.signal(signal.SIGTERM, _signal_handler)

    grpc_server.serve()


if __name__ == "__main__":
    main()
