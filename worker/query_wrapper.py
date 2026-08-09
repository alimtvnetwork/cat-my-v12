import logging
from typing import TypeVar, Callable, Any, Optional

logger = logging.getLogger(__name__)

T = TypeVar('T')

def safe_query(
    query_fn: Callable[..., T],
    endpoint: str = "unknown",
    method: str = "UNKNOWN",
    error_code: str = "E_QUERY_FAILED",
    *args: Any,
    **kwargs: Any
) -> T:
    """
    Wraps any query or external RPC execution to automatically catch,
    log, and manage errors following the `spec/03-error-manage` guidelines.
    Uses the standard `logging` library to explicitly log failures.
    """
    try:
        return query_fn(*args, **kwargs)
    except Exception as e:
        logger.error(
            "Query failed: %s", str(e),
            exc_info=True,
            extra={
                "error_code": error_code,
                "endpoint": endpoint,
                "method": method,
                "source": "safe_query"
            }
        )
        # Re-raise the exception after logging it so the caller knows it failed
        raise e
