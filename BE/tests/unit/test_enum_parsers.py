"""Unit tests for Python SDK Enum parsers — Task 179.

Verifies round-trip serialization: valid values pass, invalid values
raise ValueError as expected.
"""
import pytest
from BE.sdk_facade import TriggerMode, TriggerSource, TriggerActivation, PixelFormat
from BE.config import CameraProvider


def test_trigger_mode_valid_values():
    assert TriggerMode("ON") == TriggerMode.ON
    assert TriggerMode("OFF") == TriggerMode.OFF


def test_trigger_mode_invalid_value():
    with pytest.raises(ValueError):
        TriggerMode("INVALID")


def test_trigger_source_valid_values():
    assert TriggerSource("Software") == TriggerSource.SOFTWARE
    assert TriggerSource("Line1") == TriggerSource.LINE1


def test_pixel_format_valid_values():
    assert PixelFormat("RGB8") == PixelFormat.RGB8
    assert PixelFormat("Mono8") == PixelFormat.MONO8


def test_camera_provider_valid_values():
    assert CameraProvider("daheng") == CameraProvider.DAHENG
    assert CameraProvider("inmemory") == CameraProvider.INMEMORY


def test_camera_provider_invalid_value():
    with pytest.raises(ValueError):
        CameraProvider("unknown_vendor")


def test_trigger_activation_edge_cases():
    assert TriggerActivation("RisingEdge") == TriggerActivation.RISING_EDGE
    assert TriggerActivation("FallingEdge") == TriggerActivation.FALLING_EDGE
