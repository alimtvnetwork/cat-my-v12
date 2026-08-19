import pytest
from BE.metrics import get_counter, reset_metrics
from BE.sdk_facade.vendors.daheng.errors import map_gxipy_errors


class MockLogger:
    def __init__(self):
        self.lines = []
    def info(self, msg, extra=None):
        self.lines.append({"msg": msg, "extra": extra or {}})

@pytest.fixture
def test_logger(monkeypatch):
    logger = MockLogger()
    import BE.sdk_facade.vendors.daheng.errors
    monkeypatch.setattr(BE.sdk_facade.vendors.daheng.errors, "logger", logger)
    return logger

def test_observability_logging(test_logger):
    reset_metrics()

    @map_gxipy_errors
    def trigger_once(serial="12345"):
        pass

    trigger_once(serial="12345")

    assert len(test_logger.lines) == 1
    extra = test_logger.lines[0]["extra"]
    assert extra["operation"] == "trigger_once"
    assert extra["Outcome"] == "success"
    assert "LatencyMs" in extra

    assert get_counter("camera_capture_total") == 1
