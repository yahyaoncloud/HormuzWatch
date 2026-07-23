"""
lib/logger.py
-------------
Shared colored logging for the HormuzWatch ML service.

Provides a single ``get_logger(name)`` entry point that configures the root
logger once with a level-aware ANSI color formatter. Colors are automatically
disabled when output is not a TTY (e.g. redirected to a file or a container
log driver) or when ``NO_COLOR`` is set in the environment.

Usage
-----
    from lib.logger import get_logger

    logger = get_logger("hormuzwatch.app")
    logger.info("model loaded in %.2fs", elapsed)
    logger.warning("calibrator missing — using sigmoid fallback")
    logger.error("failed to score: %s", exc)
"""

from __future__ import annotations

import logging
import os
import sys

# ── ANSI color palette (level → escape sequence) ──────────────────────────────
_RESET = "\033[0m"
_COLORS = {
    logging.DEBUG: "\033[36m",     # cyan
    logging.INFO: "\033[32m",      # green
    logging.WARNING: "\033[33m",   # yellow
    logging.ERROR: "\033[31m",     # red
    logging.CRITICAL: "\033[1;31m",  # bold red
}

# Level name padded to a fixed width so messages line up in the terminal.
_LEVEL_WIDTH = 8


def _use_color() -> bool:
    """Decide whether to emit ANSI color codes."""
    if os.environ.get("NO_COLOR"):  # https://no-color.org
        return False
    if os.environ.get("FORCE_COLOR"):
        return True
    handler = logging.root.handlers[0] if logging.root.handlers else None
    # Pytest and some observability libraries install handlers without a
    # ``stream`` attribute. Treat those as non-interactive output.
    stream = getattr(handler, "stream", sys.stderr)
    try:
        return stream.isatty()
    except (AttributeError, ValueError):
        return False


class ColoredFormatter(logging.Formatter):
    """Formatter that wraps the level name in an ANSI color for TTY output."""

    def __init__(self, fmt: str | None = None, datefmt: str | None = None) -> None:
        super().__init__(fmt=fmt, datefmt=datefmt)
        self._color = _use_color()

    def format(self, record: logging.LogRecord) -> str:
        message = super().format(record)
        if not self._color:
            return message
        code = _COLORS.get(record.levelno, "")
        level = record.levelname.ljust(_LEVEL_WIDTH)
        # Re-color only the bracketed level token, leave the rest untouched.
        colored_level = f"{code}{level}{_RESET}"
        # The default fmt puts the level inside [LEVEL]; replace it in place.
        return message.replace(
            f"[{record.levelname}]", f"[{colored_level}]", 1
        )


_DEFAULT_FMT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
_DATE_FMT = "%Y-%m-%d %H:%M:%S"


def get_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    """Return a logger for ``name`` with the colored formatter configured once.

    ``basicConfig`` is a no-op if the root logger already has a handler, so
    calling this from multiple modules is safe and idempotent.
    """
    logging.basicConfig(
        level=level,
        format=_DEFAULT_FMT,
        datefmt=_DATE_FMT,
        force=False,
    )
    # Swap in the colored formatter on the root handler (created by basicConfig).
    for handler in logging.root.handlers:
        if not isinstance(handler.formatter, ColoredFormatter):
            handler.formatter = ColoredFormatter(_DEFAULT_FMT, _DATE_FMT)
    return logging.getLogger(name)
