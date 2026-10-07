"""Unit tests for optical acquisition settings preprocessing."""

from __future__ import annotations

import numpy as np
from BE.app.domain.rule_set import RuleCameraSettings, RuleLightSettings
from BE.app.domain.vision_preprocess import apply_optical_settings


def test_apply_optical_settings_none() -> None:
    img = np.full((50, 50, 3), 128, dtype=np.uint8)
    res = apply_optical_settings(img, None, None)
    assert np.array_equal(res, img)


def test_apply_optical_settings_defaults() -> None:
    img = np.full((50, 50, 3), 128, dtype=np.uint8)
    cam = RuleCameraSettings(ExposureUs=20000, GainDb=0.0, WhiteBalanceKelvin=5000, Gamma=1.0)
    light = RuleLightSettings(Intensity=100.0, Channel=1, StrobeDurationUs=500, HasStrobe=False)
    res = apply_optical_settings(img, cam, light)
    assert np.array_equal(res, img)


def test_apply_optical_settings_dimming() -> None:
    img = np.full((50, 50, 3), 100, dtype=np.uint8)
    cam = {"exposureUs": 10000, "gainDb": 0.0}
    light = {"intensity": 50.0}
    res = apply_optical_settings(img, cam, light)
    assert 20 <= res[0, 0, 0] <= 30


def test_apply_optical_settings_gain_boost() -> None:
    img = np.full((50, 50, 3), 50, dtype=np.uint8)
    cam = {"exposureUs": 20000, "gainDb": 6.0}
    light = {"intensity": 100.0}
    res = apply_optical_settings(img, cam, light)
    assert 95 <= res[0, 0, 0] <= 105


def test_apply_optical_settings_strobe_boost() -> None:
    img = np.full((50, 50, 3), 50, dtype=np.uint8)
    cam = {"exposureUs": 20000, "gainDb": 0.0}
    light = {"intensity": 100.0, "hasStrobe": True, "strobeDurationUs": 500}
    res = apply_optical_settings(img, cam, light)
    assert res[0, 0, 0] > 50


def test_apply_optical_settings_gamma() -> None:
    img = np.full((50, 50, 3), 64, dtype=np.uint8)
    cam_bright = {"gamma": 2.0}
    res_bright = apply_optical_settings(img, cam_bright, None)
    assert res_bright[0, 0, 0] > img[0, 0, 0]


def test_apply_optical_settings_white_balance() -> None:
    img = np.full((50, 50, 3), 100, dtype=np.uint8)
    cam_warm = {"whiteBalanceKelvin": 3000}
    res_warm = apply_optical_settings(img, cam_warm, None)
    assert res_warm[0, 0, 2] > 100
    assert res_warm[0, 0, 0] < 100
