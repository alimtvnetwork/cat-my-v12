import functools
import logging
import time
from collections.abc import Callable
from typing import Any, TypeVar, cast

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode
from BE.metrics import inc_counter

from .loader import load_gxipy

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=Callable[..., Any])

def map_gxipy_errors(func: T) -> T:
    """
    Decorator to map gxipy exceptions to AppError.
    Emits structured log line with operation, latency, outcome.
    Increments metrics counters.
    """
    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        start = time.perf_counter_ns()
        outcome = "success"
        try:
            return func(*args, **kwargs)
        except Exception as e:
            outcome = "error"
            gxipy = load_gxipy()
            if hasattr(gxipy, "GxError") and isinstance(e, gxipy.GxError):
                code = ErrorCode.E_CAM_CAPTURE_FAILED
                inc_counter(f"camera_error_total{{code={code.name}}}")
                raise AppError.for_file(
                    file_path=__file__,
                    code=code,
                    message=f"Daheng SDK Error: {str(e)}",
                    reason="GxError",
                    details={
                        "gxipy_status": getattr(e, "status", None),
                        "gxipy_message": getattr(e, "message", str(e)),
                    }
                ) from e
            inc_counter("camera_error_total{code=unknown}")
            raise # Reraise if it's not a GxError
        finally:
            latency_ms = (time.perf_counter_ns() - start) / 1e6
            serial = "unknown"
            if kwargs.get("serial"):
                serial = kwargs["serial"]
            elif args and hasattr(args[0], "device"):
                serial = getattr(args[0].device, "serial", "unknown")

            logger.info(
                "Daheng primitive executed",
                extra={
                    "operation": func.__name__,
                    "latency_ms": latency_ms,
                    "outcome": outcome,
                    "Serial": serial,
                    "Node": func.__name__,
                    "LatencyMs": latency_ms,
                    "Outcome": outcome,
                }
            )
            if func.__name__ == "open_by_serial" and outcome == "success":
                inc_counter("camera_open_total")
            elif func.__name__ == "trigger_once" and outcome == "success":
                inc_counter("camera_capture_total")
    return cast(T, wrapper)
