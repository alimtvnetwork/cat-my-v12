"""Tests for `BE.app.domain.rule_set.parse_envelope`.

Spec: `02-spec/21-app/80-ruleset-draft-save.md`.
"""

from __future__ import annotations

import pytest

from BE.app.domain.rule_set import SCHEMA_VERSION, parse_envelope
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _valid() -> dict:
    return {
        "SchemaVersion": SCHEMA_VERSION,
        "RuleSetId": 42,
        "Name": "MERCURY2 - Housing v3",
        "Version": 7,
        "Enabled": True,
        "Rules": [
            {
                "Id": 1,
                "Kind": "presence",
                "Enabled": True,
                "Shape": {"Type": "rect", "X": 120, "Y": 80, "W": 240, "H": 160},
                "Tolerance": {"Kind": "pct", "Value": 5.0},
                "Params": {},
            }
        ],
        "DraftMeta": {
            "ClientId": "c-uuid",
            "UpdatedAt": "2026-07-21T12:34:56Z",
            "Origin": "indexeddb",
        },
    }


def test_round_trip_wire_shape_preserved() -> None:
    env = parse_envelope(_valid())
    wire = env.to_wire()
    assert wire["SchemaVersion"] == SCHEMA_VERSION
    assert wire["RuleSetId"] == 42
    assert wire["Rules"][0]["Shape"]["W"] == 240
    assert wire["DraftMeta"]["Origin"] == "indexeddb"


@pytest.mark.parametrize(
    "mutate,msg_fragment",
    [
        (lambda p: p.__setitem__("SchemaVersion", 2), "SchemaVersion"),
        (lambda p: p.__setitem__("Name", ""), "Name"),
        (lambda p: p.__setitem__("Enabled", "yes"), "Enabled"),
        (lambda p: p.__setitem__("RuleSetId", -1), "RuleSetId"),
        (lambda p: p["Rules"][0].__setitem__("Kind", "invalid"), "Kind"),
        (lambda p: p["Rules"][0]["Tolerance"].__setitem__("Kind", "bogus"), "Tolerance.Kind"),
        (lambda p: p["DraftMeta"].__setitem__("Origin", "somewhere"), "Origin"),
        (lambda p: p["DraftMeta"].__setitem__("UpdatedAt", "not-iso"), "UpdatedAt"),
    ],
)
def test_bad_payloads_raise_bad_request(mutate, msg_fragment: str) -> None:
    payload = _valid()
    mutate(payload)
    with pytest.raises(AppError) as ei:
        parse_envelope(payload)
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST
    assert msg_fragment.split(".")[-1] in str(ei.value)


def test_duplicate_rule_ids_rejected() -> None:
    payload = _valid()
    payload["Rules"].append(dict(payload["Rules"][0]))
    with pytest.raises(AppError) as ei:
        parse_envelope(payload)
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST
    assert "duplicate" in str(ei.value)


def test_non_dict_root_rejected() -> None:
    with pytest.raises(AppError) as ei:
        parse_envelope([])  # type: ignore[arg-type]
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST


def test_camera_and_light_settings_roundtrip() -> None:
    payload = _valid()
    payload["Rules"][0]["CameraSettings"] = {"ExposureUs": 2500, "GainDb": 6.0}
    payload["Rules"][0]["LightSettings"] = {"Intensity": 75.0, "Channel": 2, "HasStrobe": True}
    env = parse_envelope(payload)
    wire = env.to_wire()
    rule = wire["Rules"][0]
    assert rule["CameraSettings"]["ExposureUs"] == 2500
    assert rule["LightSettings"]["Intensity"] == 75.0
    assert rule["LightSettings"]["HasStrobe"] is True


def test_camera_and_light_settings_camelcase_parsing() -> None:
    payload = _valid()
    payload["Rules"][0]["cameraSettings"] = {"exposureUs": 3000, "gainDb": 12.0}
    payload["Rules"][0]["lightSettings"] = {"intensity": 50.0, "channel": 1}
    env = parse_envelope(payload)
    assert env.Rules[0].CameraSettings is not None
    assert env.Rules[0].CameraSettings.ExposureUs == 3000
    assert env.Rules[0].LightSettings is not None
    assert env.Rules[0].LightSettings.Intensity == 50.0


def test_invalid_camera_settings_rejected() -> None:
    payload = _valid()
    payload["Rules"][0]["CameraSettings"] = "invalid_not_an_object"
    with pytest.raises(AppError) as ei:
        parse_envelope(payload)
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST

