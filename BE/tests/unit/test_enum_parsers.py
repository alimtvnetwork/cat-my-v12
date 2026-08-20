"""Unit tests for Python SDK Enum parsers — Task 179.

Verifies round-trip serialization: valid values pass, invalid values
raise ValueError as expected.
"""
import pytest
from BE.config import CameraProvider
from BE.sdk_facade import PixelFormat, TriggerActivation, TriggerMode, TriggerSource


def test_trigger_mode_valid_values():
    assert TriggerMode("On") == TriggerMode.On
    assert TriggerMode("Off") == TriggerMode.Off


def test_trigger_mode_invalid_value():
    with pytest.raises(ValueError):
        TriggerMode("INVALID")


def test_trigger_source_valid_values():
    assert TriggerSource("Software") == TriggerSource.Software
    assert TriggerSource("Line1") == TriggerSource.Line1


def test_pixel_format_valid_values():
    assert PixelFormat("Rgb8") == PixelFormat.Rgb8
    assert PixelFormat("Mono8") == PixelFormat.Mono8


def test_camera_provider_valid_values():
    assert CameraProvider("Daheng") == CameraProvider.Daheng
    assert CameraProvider("InMemory") == CameraProvider.InMemory


def test_camera_provider_invalid_value():
    with pytest.raises(ValueError):
        CameraProvider("unknown_vendor")


def test_trigger_activation_edge_cases():
    assert TriggerActivation("RisingEdge") == TriggerActivation.RisingEdge
    assert TriggerActivation("FallingEdge") == TriggerActivation.FallingEdge
