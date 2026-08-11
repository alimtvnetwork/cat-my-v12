import pytest
from BE.src.models.envelope import Envelope
from BE.src.models.system import SystemStatus
from BE.src.models.camera import CameraModel

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

def test_camera_model():
    cam = CameraModel(id="1", name="cam1", status="online")
    assert cam.id == "1"
    assert cam.name == "cam1"
    assert cam.status == "online"
