"""Contract tests for POST/PUT/DELETE /samples (Plan 90 Step 145).

Envelope shape only; the facade write semantics themselves are covered by
`test_sample_facade_writes.py`. Here we prove the HTTP boundary:

- 400 `E_BE_BAD_REQUEST` on any malformed body (non-dict, unknown fields,
  missing fields, wrong types, id/path mismatch, non-JSON).
- 200 `IsSuccess` on happy-path create/update with the committed row echoed.
- 404 `E_BE_NOT_FOUND` on delete of an unknown id, envelope not raw text.
- Correlation id round-trips on every method.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from BE.app.domain.cat_sample import CatSample
from BE.app.facades.sample_facade import InMemorySampleFacade, set_sample_facade
from BE.main import create_app


def _fresh_client() -> TestClient:
    # Reset the module-level facade so tests don't leak state between runs.
    set_sample_facade(InMemorySampleFacade())
    return TestClient(create_app())


def _valid_body(sid: int = 1) -> dict:
    return {
        "id": sid,
        "rule_id": 10,
        "label": "cat-a",
        "captured_at": "2026-07-21T00:00:00Z",
    }


def test_post_creates_sample_returns_success_envelope() -> None:
    client = _fresh_client()
    resp = client.post("/samples", json=_valid_body(1))
    assert resp.status_code == 200
    body = resp.json()
    assert body["Status"]["IsSuccess"] is True
    assert body["Results"] == [_valid_body(1)]
    # Row is actually persisted through the facade.
    listing = client.get("/samples").json()["Results"][0]
    assert listing["total"] == 1 and listing["items"][0]["id"] == 1


def test_post_idempotent_by_id() -> None:
    client = _fresh_client()
    client.post("/samples", json=_valid_body(1))
    updated = {**_valid_body(1), "label": "cat-b"}
    resp = client.post("/samples", json=updated)
    assert resp.status_code == 200
    assert resp.json()["Results"][0]["label"] == "cat-b"
    assert client.get("/samples").json()["Results"][0]["total"] == 1


def test_put_updates_when_path_and_body_match() -> None:
    client = _fresh_client()
    client.post("/samples", json=_valid_body(1))
    resp = client.put("/samples/1", json={**_valid_body(1), "label": "renamed"})
    assert resp.status_code == 200
    assert resp.json()["Results"][0]["label"] == "renamed"


def test_put_rejects_path_body_id_mismatch() -> None:
    client = _fresh_client()
    resp = client.put("/samples/1", json=_valid_body(2))
    assert resp.status_code == 400
    err = resp.json()["Errors"]
    assert err["Code"] == "E_BE_BAD_REQUEST"
    assert "path" in (err.get("Details") or {})


def test_body_validation_rejects_unknown_and_missing_fields() -> None:
    client = _fresh_client()
    r_unknown = client.post("/samples", json={**_valid_body(1), "extra": 1})
    assert r_unknown.status_code == 400
    assert r_unknown.json()["Errors"]["Code"] == "E_BE_BAD_REQUEST"
    r_missing = client.post("/samples", json={"id": 1, "rule_id": 2})
    assert r_missing.status_code == 400
    assert r_missing.json()["Errors"]["Code"] == "E_BE_BAD_REQUEST"


def test_body_validation_rejects_wrong_types() -> None:
    client = _fresh_client()
    for bad in (
        {**_valid_body(1), "id": "1"},        # string id
        {**_valid_body(1), "id": 0},          # non-positive
        {**_valid_body(1), "id": True},       # bool masquerading as int
        {**_valid_body(1), "rule_id": -1},
        {**_valid_body(1), "label": "   "},
        {**_valid_body(1), "captured_at": ""},
    ):
        r = client.post("/samples", json=bad)
        assert r.status_code == 400, bad
        assert r.json()["Errors"]["Code"] == "E_BE_BAD_REQUEST"


def test_body_validation_rejects_non_object_and_non_json() -> None:
    client = _fresh_client()
    assert client.post("/samples", json=[1, 2, 3]).status_code == 400
    resp = client.post(
        "/samples",
        content=b"not-json",
        headers={"content-type": "application/json"},
    )
    assert resp.status_code == 400
    assert resp.json()["Errors"]["Code"] == "E_BE_BAD_REQUEST"


def test_delete_removes_existing_and_404s_missing() -> None:
    client = _fresh_client()
    client.post("/samples", json=_valid_body(1))
    ok = client.delete("/samples/1")
    assert ok.status_code == 200
    assert ok.json()["Results"][0] == {"deleted_id": 1}
    missing = client.delete("/samples/1")
    assert missing.status_code == 404
    assert missing.json()["Errors"]["Code"] == "E_BE_NOT_FOUND"


def test_correlation_id_round_trips_on_writes() -> None:
    client = _fresh_client()
    cid = "cid-samples-writes-1"
    for req in (
        lambda: client.post("/samples", json=_valid_body(1), headers={"X-Correlation-Id": cid}),
        lambda: client.put("/samples/1", json=_valid_body(1), headers={"X-Correlation-Id": cid}),
        lambda: client.delete("/samples/1", headers={"X-Correlation-Id": cid}),
    ):
        resp = req()
        assert resp.headers["X-Correlation-Id"] == cid
