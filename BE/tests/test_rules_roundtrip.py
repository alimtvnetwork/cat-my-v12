"""Plan 90 Step 142. PUT /rules/{id} then GET /rules/{id}/set round-trip.

Guarantees the persisted envelope re-emerges byte-identical to what the
FE draft store would post, modulo the server-owned fields the facade
stamps on commit (`Version`, `DraftMeta.Origin`, `DraftMeta.UpdatedAt`).
Without this test the FE reload-server conflict resolver silently
diverges the moment the BE contract changes.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from BE.app.facades import InMemoryRuleFacade, set_rule_facade
from BE.main import create_app


def _client() -> TestClient:
    set_rule_facade(InMemoryRuleFacade())
    return TestClient(create_app())


def _envelope() -> dict:
    return {
        "SchemaVersion": 1,
        "RuleSetId": 42,
        "Name": "roundtrip",
        "Version": 0,
        "Enabled": True,
        "Rules": [
            {
                "Id": 3,
                "Kind": "match",
                "Enabled": True,
                "Shape": {"Type": "rect", "X": 1.5, "Y": 2.5, "W": 30.0, "H": 40.0},
                "Tolerance": {"Kind": "pct", "Value": 5.0},
                "Params": {"_LegacyId": "r-abc", "_LegacyKind": "C", "_IsHidden": False, "_IsLocked": False},
            }
        ],
        "DraftMeta": {
            "ClientId": "client-rt",
            "UpdatedAt": "2026-07-21T00:00:00Z",
            "Origin": "indexeddb",
        },
    }


def test_put_then_get_returns_committed_envelope() -> None:
    client = _client()
    body = _envelope()

    put = client.put("/rules/42", json=body)
    assert put.status_code == 200, put.text
    saved = put.json()["Results"][0]

    get = client.get("/rules/42/set")
    assert get.status_code == 200, get.text
    fetched = get.json()["Results"][0]

    # Server-owned fields the facade rewrites on commit.
    assert saved["Version"] == 1
    assert saved["DraftMeta"]["Origin"] == "server"
    assert fetched == saved

    # Lossless fields survive the round-trip verbatim.
    assert fetched["Rules"][0]["Params"]["_LegacyId"] == "r-abc"
    assert fetched["Rules"][0]["Params"]["_LegacyKind"] == "C"
    assert fetched["Rules"][0]["Shape"] == body["Rules"][0]["Shape"]
    assert fetched["RuleSetId"] == body["RuleSetId"]
    assert fetched["Name"] == body["Name"]


def test_get_missing_rule_set_returns_404() -> None:
    client = _client()
    resp = client.get("/rules/999/set")
    assert resp.status_code == 404, resp.text
    assert resp.json()["Errors"]["Code"] == "E_BE_NOT_FOUND"
