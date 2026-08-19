import inspect

import pytest
from BE.sdk_facade import CameraFacade
from BE.sdk_facade.vendors.daheng.facade import DahengCameraFacade


def test_daheng_facade_matches_protocol() -> None:
    proto_funcs = {name: func for name, func in inspect.getmembers(CameraFacade) if inspect.isfunction(func)}
    impl_funcs = {name: func for name, func in inspect.getmembers(DahengCameraFacade) if inspect.isfunction(func) or inspect.ismethod(func)}

    for name, proto_func in proto_funcs.items():
        if name.startswith("_"):
            continue
        assert name in impl_funcs, f"{name} is missing from DahengCameraFacade"
        # Checking signatures can be done with inspect.signature,
        # but typing differences might cause false positives.
        # Just ensure methods exist with basic args.
        proto_sig = inspect.signature(proto_func)
        impl_sig = inspect.signature(impl_funcs[name])

        # Verify param count matches roughly (ignoring self in proto vs impl)
        proto_params = [p for n, p in proto_sig.parameters.items() if n != 'self']
        impl_params = [p for n, p in impl_sig.parameters.items() if n != 'self']
        assert len(proto_params) == len(impl_params), f"Signature mismatch for {name}"

from unittest.mock import patch

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def test_reconnect_policy_mocked(caplog: pytest.LogCaptureFixture) -> None:
    facade = DahengCameraFacade(correlation_id="test-123")
    facade._serial = "MOCK-SERIAL"

    attempts = [0]

    def failing_op() -> str:
        attempts[0] += 1
        if attempts[0] < 3:
            raise AppError(ErrorCode.E_CAM_NOT_CONNECTED, "Simulated device offline")
        return "Success"

    with patch("time.sleep") as mock_sleep:
        res = facade._with_reconnect(failing_op)

    assert res == "Success"
    assert attempts[0] == 3
    assert mock_sleep.call_count == 2
    # Verify exponential backoff structure (first two delays are 0.2 and 0.5)
    assert mock_sleep.call_args_list[0][0][0] == 0.2
    assert mock_sleep.call_args_list[1][0][0] == 0.5

    assert "Daheng operation failed" in caplog.text
    assert "[cid=test-123]" in caplog.text
