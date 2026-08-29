"""
lib/logger.py
-------------
Refined color-coded logging for the HormuzWatch ML service.

Provides a single ``get_logger(name)`` entry point that configures the root
logger once with a refined ANSI color formatter. Colors are automatically
disabled when output is not a TTY or when ``NO_COLOR`` is set in the environment.
Can be forced on via ``FORCE_COLOR=1`` or ``PYTHON_LOG_COLOR=1``.

Usage
-----
    from lib.logger import get_logger

    logger = get_logger("hormuzwatch.app")
    logger.info("model loaded in %.2fs (models=%d/%d)", elapsed, loaded, total)
    logger.warning("calibrator missing — using fallback")
    logger.error("failed to score: %s", exc)
"""

from __future__ import annotations

import logging
import os
import re
import sys
import traceback

# ── ANSI Color Escape Codes ──────────────────────────────────────────────────
_RESET = "\033[0m"
_BOLD = "\033[1m"
_DIM = "\033[2m"
_CYAN = "\033[36m"
_GREEN = "\033[32m"
_YELLOW = "\033[33m"
_RED = "\033[31m"
_MAGENTA = "\033[35m"
_BOLD_RED = "\033[1;31m"
_FATAL = "\033[1;41;37m"

# Semantic badges for log levels
_LEVEL_BADGES = {
    logging.DEBUG: f"{_CYAN}[DEBUG]{_RESET}",
    logging.INFO: f"{_GREEN}[INFO ]{_RESET}",
    logging.WARNING: f"{_YELLOW}[WARN ]{_RESET}",
    logging.ERROR: f"{_RED}[ERROR]{_RESET}",
    logging.CRITICAL: f"{_FATAL}[CRIT ]{_RESET}",
}

_PLAIN_LEVEL_BADGES = {
    logging.DEBUG: "[DEBUG]",
    logging.INFO: "[INFO ]",
    logging.WARNING: "[WARN ]",
    logging.ERROR: "[ERROR]",
    logging.CRITICAL: "[CRIT ]",
}

# Regex to highlight key=value metric pairs (e.g. latency=4.2ms, status=200, score=0.88)
_METRIC_RE = re.compile(r'\b([a-zA-Z_][a-zA-Z0-9_\-\.]*)=([0-9\.]+(?:ms|s|µs|%|kB|MB|GB)?|true|false|True|False|None)\b')


def _use_color() -> bool:
    """Decide whether to emit ANSI color codes."""
    if os.environ.get("NO_COLOR"):
        return False
    if os.environ.get("FORCE_COLOR") or os.environ.get("PYTHON_LOG_COLOR"):
        return True
    handler = logging.root.handlers[0] if logging.root.handlers else None
    stream = getattr(handler, "stream", sys.stderr)
    try:
        return stream.isatty()
    except (AttributeError, ValueError):
        return False


class ColoredFormatter(logging.Formatter):
    """Formatter that styles timestamp, level badge, logger name, and metrics."""

    def __init__(self, fmt: str | None = None, datefmt: str | None = None) -> None:
        super().__init__(fmt=fmt, datefmt=datefmt or "%Y-%m-%d %H:%M:%S")
        self._color = _use_color()

    def format(self, record: logging.LogRecord) -> str:
        # Generate standard timestamp
        time_str = self.formatTime(record, self.datefmt)
        level_badge = (
            _LEVEL_BADGES.get(record.levelno, f"{_DIM}[{record.levelname[:5]}]{_RESET}")
            if self._color
            else _PLAIN_LEVEL_BADGES.get(record.levelno, f"[{record.levelname[:5].ljust(5)}]")
        )

        msg = record.getMessage()

        if self._color:
            # Highlight key=value metric tokens
            msg = _METRIC_RE.sub(
                rf"{_DIM}{_CYAN}\1={_RESET}{_YELLOW}\2{_RESET}", msg
            )
            # Assemble colored line: [TIME (dim)] [LEVEL] [NAME (cyan)]: [MSG]
            formatted = f"{_DIM}{time_str}{_RESET} {level_badge} {_CYAN}{record.name}{_RESET}: {msg}"
        else:
            formatted = f"{time_str} {level_badge} {record.name}: {msg}"

        if record.exc_info:
            # Format exception traceback with subtle red styling
            if not record.exc_text:
                record.exc_text = self.formatException(record.exc_info)
            if record.exc_text:
                if self._color:
                    exc_lines = [f"{_RED}  {line}{_RESET}" for line in record.exc_text.splitlines()]
                    formatted += "\n" + "\n".join(exc_lines)
                else:
                    formatted += "\n" + record.exc_text

        if record.stack_info:
            formatted += "\n" + self.formatStack(record.stack_info)

        return formatted


_DEFAULT_DATEFMT = "%Y-%m-%d %H:%M:%S"


def get_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    """Return a logger for ``name`` with the colored formatter configured once.

    ``basicConfig`` is a no-op if the root logger already has a handler, so
    calling this from multiple modules is safe and idempotent.
    """
    logging.basicConfig(
        level=level,
        format="%(message)s",
        datefmt=_DEFAULT_DATEFMT,
        force=False,
    )
    # Swap in the colored formatter on the root handler
    for handler in logging.root.handlers:
        if not isinstance(handler.formatter, ColoredFormatter):
            handler.formatter = ColoredFormatter(datefmt=_DEFAULT_DATEFMT)

    return logging.getLogger(name)

