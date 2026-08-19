from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode
from BE.sdk_facade.vendors.daheng.errors import map_gxipy_errors


class MockGxError(Exception):
    pass

def test_gxipy_exception_mapping() -> None:
    @map_gxipy_errors
    def raise_gx_error() -> None:
        raise MockGxError("Mock error")

    try:
        raise_gx_error()
        raise AssertionError("Should have raised AppError")
    except AppError as e:
        assert e.code == ErrorCode.E_CAM_CAPTURE_FAILED
        assert "Daheng SDK Error" in e.message
