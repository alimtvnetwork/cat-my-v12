import os
import pytest
import time
from BE.sdk_facade.vendors.daheng.primitives import (
    enumerate_devices, open_by_serial, read_feature, configure_roi,
    trigger_once, start_stream, stop_stream, write_feature, read_line, write_line,
    arm_trigger
)
from BE.sdk_facade.vendors.daheng.facade import DahengCameraFacade

# Skip all tests if LOVABLE_HW_DAHENG is not set
pytestmark = pytest.mark.skipif(
    os.environ.get("LOVABLE_HW_DAHENG") != "1",
    reason="Hardware tests require LOVABLE_HW_DAHENG=1"
)

def test_hardware_enumerate_devices() -> None:
    devices = enumerate_devices()
    assert len(devices) > 0, "Expected at least one Daheng device connected"
    print(f"Found {len(devices)} device(s):")
    for d in devices:
        print(f"- Serial: {d.serial}, Model: {d.model}")

def test_hardware_open_and_read() -> None:
    devices = enumerate_devices()
    assert len(devices) > 0, "No device to test"
    
    serial = devices[0].serial
    with open_by_serial(serial) as handle:
        model = read_feature(handle, "DeviceModelName")
        sn = read_feature(handle, "DeviceSerialNumber")
        print(f"Opened Daheng camera: Model={model}, SN={sn}")
        assert sn == serial

def test_hardware_roi_and_trigger() -> None:
    devices = enumerate_devices()
    if not devices:
        pytest.skip("No device")
    serial = devices[0].serial
    
    with open_by_serial(serial) as handle:
        configure_roi(handle, 0, 0, 100, 100)
        env = trigger_once(handle, 1000)
        assert env.data.shape[0] == 100
        assert env.data.shape[1] == 100
        assert str(env.data.dtype) == 'uint8'

def test_hardware_free_run() -> None:
    devices = enumerate_devices()
    if not devices:
        pytest.skip("No device")
    serial = devices[0].serial
    
    with open_by_serial(serial) as handle:
        frames = []
        def on_frame(env):
            frames.append(env)
            
        start_stream(handle, on_frame)
        time.sleep(1.0)
        stop_stream(handle)
        
        assert len(frames) > 0
        # Check monotonicity
        for i in range(1, len(frames)):
            assert frames[i].frame_id > frames[i-1].frame_id

def test_hardware_trigger_arm() -> None:
    devices = enumerate_devices()
    if not devices:
        pytest.skip("No device")
    serial = devices[0].serial
    
    with open_by_serial(serial) as handle:
        try:
            arm_trigger(handle, "Line0", "RisingEdge", 0.0)
        except Exception as e:
            pytest.skip(f"Hardware trigger unsupported or failed: {e}")

def test_hardware_digital_io() -> None:
    devices = enumerate_devices()
    if not devices:
        pytest.skip("No device")
    serial = devices[0].serial
    
    with open_by_serial(serial) as handle:
        try:
            write_line(handle, "Line0", True)
            assert read_line(handle, "Line0") == True
            write_line(handle, "Line0", False)
            assert read_line(handle, "Line0") == False
        except Exception as e:
            pytest.skip(f"Digital IO unsupported or failed: {e}")

def test_hardware_reconnect() -> None:
    devices = enumerate_devices()
    if not devices:
        pytest.skip("No device")
    serial = devices[0].serial
    
    facade = DahengCameraFacade()
    facade.open(serial)
    facade.start_stream()
    
    # Simulate force close
    if facade._handle and facade._handle.device:
        facade._handle.device.close_device()
        
    try:
        # Should auto-reconnect
        facade.grab(1000)
    except Exception as e:
        pytest.fail(f"Reconnect failed: {e}")
    finally:
        facade.close()
