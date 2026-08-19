import pytest
from BE.envelope import Envelope
from BE.models.system import SystemStatus

def test_envelope_ok():
    env = Envelope.ok(data={"foo": "bar"})
    assert env.isSuccess is True
    assert env.isFail is False
    assert env.status == "ok"
    assert env.data == {"foo": "bar"}

def test_envelope_fail():
    env = Envelope.fail(status="error", error="Some error")
    assert env.isSuccess is False
    assert env.isFail is True
    assert env.status == "error"
    assert env.error == "Some error"

def test_system_status():
    status = SystemStatus(uptime=100, version="1.0", status="healthy")
    assert status.uptime == 100
    assert status.version == "1.0"
    assert status.status == "healthy"
