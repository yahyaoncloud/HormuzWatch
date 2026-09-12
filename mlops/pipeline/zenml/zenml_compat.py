"""
mlops/pipeline/zenml/zenml_compat.py
====================================
Compatibility shim providing seamless ZenML pipeline and step decorators.
When ZenML is installed, it leverages native ZenML decorators and stack components.
When running in environments without ZenML installed (e.g. lightweight runners or local dev),
it provides an identical, zero-dependency drop-in implementation that preserves
step metadata, execution tracing, and pipeline composition without raising ImportError.
"""

from __future__ import annotations

import functools
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger("mlops.zenml")

ZENML_AVAILABLE = False
try:
    import zenml
    from zenml import step as _native_step, pipeline as _native_pipeline
    ZENML_AVAILABLE = True
except ImportError:
    pass


def is_zenml_available() -> bool:
    """Return True if native ZenML is installed in the current environment."""
    return ZENML_AVAILABLE


@dataclass
class StepExecutionRecord:
    """Metadata recorded for each step invocation."""
    step_name: str
    started_at: str
    completed_at: str
    duration_seconds: float
    status: str
    error: Optional[str] = None


@dataclass
class PipelineRunReport:
    """Detailed summary of a completed pipeline run."""
    pipeline_name: str
    run_id: str
    status: str
    started_at: str
    completed_at: str
    duration_seconds: float
    steps: List[StepExecutionRecord] = field(default_factory=list)
    output: Any = None
    zenml_native: bool = False


# Active execution context for tracking steps during standalone pipeline execution
_CURRENT_PIPELINE_RUN: Optional[PipelineRunReport] = None


def step(
    _func: Optional[Callable] = None,
    *,
    name: Optional[str] = None,
    enable_cache: bool = True,
    experiment_tracker: Optional[str] = None,
    model_registry: Optional[str] = None,
    **kwargs: Any,
) -> Callable:
    """
    Decorator for ZenML steps.
    Delegates to native ZenML @step if available; otherwise wraps the function with
    runtime telemetry, timing, and error capture.
    """
    if ZENML_AVAILABLE:
        zenml_kwargs = {}
        if name:
            zenml_kwargs["name"] = name
        if experiment_tracker:
            zenml_kwargs["experiment_tracker"] = experiment_tracker
        if model_registry:
            zenml_kwargs["model_registry"] = model_registry
        zenml_kwargs.update(kwargs)
        if _func is not None:
            return _native_step(_func)
        return _native_step(**zenml_kwargs)

    def decorator(fn: Callable) -> Callable:
        step_name = name or fn.__name__

        @functools.wraps(fn)
        def wrapper(*args: Any, **step_kwargs: Any) -> Any:
            start_time = time.perf_counter()
            started_iso = datetime.now(timezone.utc).isoformat()
            logger.info(f"⚡ [ZenML Step: {step_name}] Starting execution...")

            err_msg = None
            status = "SUCCESS"
            try:
                result = fn(*args, **step_kwargs)
                return result
            except Exception as exc:
                status = "FAILED"
                err_msg = str(exc)
                logger.error(f"❌ [ZenML Step: {step_name}] Failed: {exc}")
                raise
            finally:
                duration = time.perf_counter() - start_time
                completed_iso = datetime.now(timezone.utc).isoformat()
                record = StepExecutionRecord(
                    step_name=step_name,
                    started_at=started_iso,
                    completed_at=completed_iso,
                    duration_seconds=round(duration, 4),
                    status=status,
                    error=err_msg,
                )
                if _CURRENT_PIPELINE_RUN is not None:
                    _CURRENT_PIPELINE_RUN.steps.append(record)
                logger.info(f"✔ [ZenML Step: {step_name}] Finished ({status}) in {duration:.3f}s")

        # Attach metadata for inspection
        wrapper.__zenml_step__ = True
        wrapper.__step_name__ = step_name
        return wrapper

    if _func is not None:
        return decorator(_func)
    return decorator


def pipeline(
    _func: Optional[Callable] = None,
    *,
    name: Optional[str] = None,
    enable_cache: bool = True,
    **kwargs: Any,
) -> Callable:
    """
    Decorator for ZenML pipelines.
    Delegates to native ZenML @pipeline if available; otherwise wraps the pipeline
    function with execution tracking and run reporting.
    """
    if ZENML_AVAILABLE:
        zenml_kwargs = {}
        if name:
            zenml_kwargs["name"] = name
        zenml_kwargs.update(kwargs)
        if _func is not None:
            return _native_pipeline(_func)
        return _native_pipeline(**zenml_kwargs)

    def decorator(fn: Callable) -> Callable:
        pipeline_name = name or fn.__name__

        @functools.wraps(fn)
        def wrapper(*args: Any, **pipe_kwargs: Any) -> Any:
            global _CURRENT_PIPELINE_RUN
            run_id = f"{pipeline_name}_{int(time.time())}"
            started_iso = datetime.now(timezone.utc).isoformat()
            start_time = time.perf_counter()

            report = PipelineRunReport(
                pipeline_name=pipeline_name,
                run_id=run_id,
                status="RUNNING",
                started_at=started_iso,
                completed_at="",
                duration_seconds=0.0,
                zenml_native=False,
            )
            _CURRENT_PIPELINE_RUN = report

            logger.info(f"════════════════════════════════════════════════════════════════════════")
            logger.info(f"🚀 [ZenML Pipeline: {pipeline_name}] Starting Run ID: {run_id}")
            logger.info(f"════════════════════════════════════════════════════════════════════════")

            try:
                result = fn(*args, **pipe_kwargs)
                report.status = "COMPLETED"
                report.output = result
                return result
            except Exception as exc:
                report.status = "FAILED"
                logger.error(f"❌ [ZenML Pipeline: {pipeline_name}] Pipeline execution failed: {exc}")
                raise
            finally:
                duration = time.perf_counter() - start_time
                report.completed_at = datetime.now(timezone.utc).isoformat()
                report.duration_seconds = round(duration, 4)
                logger.info(f"════════════════════════════════════════════════════════════════════════")
                logger.info(
                    f"🏁 [ZenML Pipeline: {pipeline_name}] Status: {report.status} | "
                    f"Duration: {duration:.2f}s | Steps: {len(report.steps)}"
                )
                logger.info(f"════════════════════════════════════════════════════════════════════════")
                _CURRENT_PIPELINE_RUN = None

        wrapper.__zenml_pipeline__ = True
        wrapper.__pipeline_name__ = pipeline_name
        return wrapper

    if _func is not None:
        return decorator(_func)
    return decorator
