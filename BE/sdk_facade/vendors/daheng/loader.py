import sys
from typing import Any

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def load_gxipy() -> Any:
    """
    Attempt to import gxipy and return the module.
    Raises AppError(E_CAM_SDK_UNAVAILABLE) if the SDK or its native DLL cannot be loaded.
    """
    try:
        import gxipy
        return gxipy
    except ImportError as e:
        raise AppError.for_file(
            reason="ImportError on gxipy",
            path=__file__,
            operation="Load",
            module="daheng_loader",
            code=ErrorCode.E_CAM_SDK_UNAVAILABLE,
            message="Daheng Galaxy SDK (gxipy) is not installed or the native driver DLL could not be found.",
            details={
                "exception": str(e),
                "sys_path": sys.path,
                "remediation": "Verify that Daheng Galaxy drivers are installed and GENICAM_ROOT_V* env var is set. See README.md in this package."
            },
            cause=e,
        ) from e
