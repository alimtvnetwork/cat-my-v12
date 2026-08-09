"""Contract tests for PUT /rules/{id} (Plan 90 Step 133)."""

from __future__ import annotations

from fastapi.testclient import TestClient

from BE.app.facades import InMemoryRuleFacade, set_rule_facade
from BE.main import create_app


def _client() -> TestClient:
    set_rule_facade(InMemoryRuleFacade())  # reset per test
    return TestClient(create_app())


def _envelope(rs_id: int = 7, version: int = 0) -> dict:
    return {
        "SchemaVersion": 1,
        "RuleSetId": rs_id,
        "Name": "sheet-a",
        "Version": version,
        "Enabled": True,
        "Rules": [
            {
                "Id": 1,
                "Kind": "presence",
                "Enabled": True,
                "Shape": {"Type": "rect", "X": 0, "Y": 0, "W": 10, "H": 10},
                "Tolerance": {"Kind": "pct", "Value": 5.0},
                "Params": {},
            }
        ],
        "DraftMeta": {
            "ClientId": "client-1",
            "UpdatedAt": "2026-07-21T00:00:00Z",
            "Origin": "indexeddb",
        },
    }


def test_put_rule_set_success_bumps_version_and_stamps_server_origin() -> None:
    resp = _client().put("/rules/7", json=_envelope(7, 0))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["Status"]["IsSuccess"] is True
    committed = body["Results"][0]
    assert committed["RuleSetId"] == 7
    assert committed["Version"] == 1  # bumped from 0
    assert committed["DraftMeta"]["Origin"] == "server"
    assert committed["DraftMeta"]["ClientId"] == "client-1"


def test_put_rule_set_rejects_path_body_mismatch() -> None:
    resp = _client().put("/rules/7", json=_envelope(8, 0))
    assert resp.status_code == 400
    assert resp.json()["Errors"]["Code"] == "E_BE_BAD_REQUEST"


def test_put_rule_set_rejects_bad_payload() -> None:
    bad = _envelope(7, 0)
    bad["Name"] = ""
    resp = _client().put("/rules/7", json=bad)
    assert resp.status_code == 400
    assert resp.json()["Errors"]["Code"] == "E_BE_BAD_REQUEST"


def test_put_rule_set_conflict_on_stale_version() -> None:
    c = _client()
    r1 = c.put("/rules/7", json=_envelope(7, 0))
    assert r1.status_code == 200
    # Server is now at Version=1; client resubmits with Version=0.
    r2 = c.put("/rules/7", json=_envelope(7, 0))
    assert r2.status_code == 409
    assert r2.json()["Errors"]["Code"] == "E_BE_CONFLICT"


def test_put_rule_set_rejects_non_integer_path() -> None:
    resp = _client().put("/rules/abc", json=_envelope(7, 0))
    assert resp.status_code == 400
    assert resp.json()["Errors"]["Code"] == "E_BE_BAD_REQUEST"
