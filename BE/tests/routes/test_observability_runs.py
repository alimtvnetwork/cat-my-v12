"""Plan 90 Step 100 - GET /observability/runs* route tests.

Covers list/detail/rules/artifacts endpoints, envelope shape, pagination
guards, E_BE_NOT_FOUND surfaces, cross-tier isolation (missing table
raises E_BE_INTERNAL, not a silent empty list).
"""

from __future__ import annotations

from pathlib import Path

import pytest
from BE.app.db.writers import frame_artifact as fa
from BE.app.db.writers import rule_result as rr
from BE.app.db.writers import run_session as rs
from BE.db.connections import get_task_conn
from BE.main import create_app
from fastapi.testclient import TestClient

MIGRATIONS = Path(__file__).resolve().parents[2] / "db" / "migrations" / "task"
ROOT_MIGRATIONS = Path(__file__).resolve().parents[2] / "db" / "migrations" / "root"


def _apply(db_root: Path) -> None:
    conn = get_task_conn(db_root=db_root)
    try:
        for p in sorted(MIGRATIONS.glob("*.sql")):
            conn.executescript(p.read_text(encoding="utf-8"))
    finally:
        conn.close()
    # Root migrations too so the sessions route (also mounted) does not
    # cross-contaminate this test's DB root.
    from BE.db.connections import get_root_conn
    conn = get_root_conn(db_root=db_root)
    try:
        for p in sorted(ROOT_MIGRATIONS.glob("*.sql")):
            conn.executescript(p.read_text(encoding="utf-8"))
    finally:
        conn.close()


def _seed_run(db_root: Path, *, run_id: str, verdict: str = "Pass",
              rule_count: int = 0, judgments=(), artifacts=()) -> tuple[int, list]:
    conn = get_task_conn(db_root=db_root)
    try:
        active = len(judgments)
        pass_c = sum(1 for j in judgments if j["Verdict"] == "Pass")
        fail_c = sum(1 for j in judgments if j["Verdict"] == "Fail")
        err_c = sum(1 for j in judgments if j["Verdict"] == "Error")
        rc = max(rule_count, active)
        rec = {
            "RunSessionId": run_id, "Verdict": verdict,
            "RuleSet": {
                "RuleCount": rc, "ActiveCount": active,
                "InactiveCount": rc - active, "SilentCount": 0,
                "PassCount": pass_c, "FailCount": fail_c, "ErrorCount": err_c,
            },
            "Judgments": list(judgments),
        }
        rs_out = rs.write_run_session(conn, rec, mode="manual")
        rows = []
        if judgments:
            rr_out = rr.write_rule_results(conn, run_session_id=rs_out.RunSessionId,
                                            judgments=list(judgments))
            rows = list(rr_out.Rows)
        if artifacts:
            fa.write_frame_artifacts(conn, run_session_id=rs_out.RunSessionId,
                                     artifacts=list(artifacts))
        return rs_out.RunSessionId, rows
    finally:
        conn.close()


def _rec(run_id: str, verdict: str, judgments=()):
    active = len(judgments)
    return {
        "RunSessionId": run_id, "Verdict": verdict,
        "RuleSet": {
            "RuleCount": active, "ActiveCount": active,
            "InactiveCount": 0, "SilentCount": 0,
            "PassCount": sum(1 for j in judgments if j["Verdict"] == "Pass"),
            "FailCount": sum(1 for j in judgments if j["Verdict"] == "Fail"),
            "ErrorCount": sum(1 for j in judgments if j["Verdict"] == "Error"),
        },
        "Judgments": list(judgments),
    }


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    db_root = tmp_path / "vision-db"
    db_root.mkdir()
    _apply(db_root)
    monkeypatch.setenv("APP_DB_ROOT", str(db_root))
    app = create_app()
    yield TestClient(app), db_root


def _envelope_ok(resp) -> dict:
    body = resp.json()
    assert body["Status"]["IsSuccess"] is True
    assert body["Status"]["IsFailed"] is False
    assert isinstance(body["Results"], list)
    return body


def test_list_runs_empty(client):
    c, _ = client
    resp = c.get("/observability/runs")
    assert resp.status_code == 200
    body = _envelope_ok(resp)
    assert body["Results"][0] == {"items": [], "total": 0, "limit": 50}


def test_list_runs_orders_newest_first(client):
    c, root = client
    _seed_run(root, run_id="01AAA00000000000000000000A", verdict="Pass")
    _seed_run(root, run_id="01AAA00000000000000000000B", verdict="Fail")
    resp = c.get("/observability/runs")
    payload = _envelope_ok(resp)["Results"][0]
    assert payload["total"] == 2
    assert payload["items"][0]["RunId"] == "01AAA00000000000000000000B"


def test_list_runs_verdict_filter(client):
    c, root = client
    _seed_run(root, run_id="01BBB00000000000000000000A", verdict="Pass")
    _seed_run(root, run_id="01BBB00000000000000000000B", verdict="Fail")
    resp = c.get("/observability/runs", params={"verdict": "Fail"})
    payload = _envelope_ok(resp)["Results"][0]
    assert [i["Verdict"] for i in payload["items"]] == ["Fail"]


def test_list_runs_bad_verdict_400(client):
    c, _ = client
    resp = c.get("/observability/runs", params={"verdict": "Nope"})
    assert resp.status_code == 400
    assert resp.json()["Errors"]["Code"] == "E_BE_BAD_REQUEST"


def test_list_runs_limit_ceiling(client):
    c, _ = client
    resp = c.get("/observability/runs", params={"limit": 1000})
    assert resp.status_code == 400
    body = resp.json()
    assert body["Errors"]["Code"] == "E_BE_BAD_REQUEST"
    assert body["Errors"]["Details"]["Max"] == 200


def test_get_run_by_id(client):
    c, root = client
    rsid, _ = _seed_run(root, run_id="01CCC00000000000000000000A", verdict="Pass")
    resp = c.get(f"/observability/runs/{rsid}")
    payload = _envelope_ok(resp)["Results"][0]
    assert payload["RunSessionId"] == rsid
    assert payload["Verdict"] == "Pass"


def test_get_run_unknown_404(client):
    c, _ = client
    resp = c.get("/observability/runs/999999")
    assert resp.status_code == 404
    assert resp.json()["Errors"]["Code"] == "E_BE_NOT_FOUND"


def test_list_rules_for_run(client):
    c, root = client
    rsid, rr_rows = _seed_run(
        root, run_id="01DDD00000000000000000000A", verdict="Fail", rule_count=2,
        judgments=[
            {"RuleId": "r1", "RuleType": "PresenceAbsence", "Verdict": "Pass"},
            {"RuleId": "r2", "RuleType": "Count", "Verdict": "Fail"},
        ],
    )
    resp = c.get(f"/observability/runs/{rsid}/rules")
    payload = _envelope_ok(resp)["Results"][0]
    assert payload["total"] == 2
    ids = [r["RuleId"] for r in payload["items"]]
    assert set(ids) == {"r1", "r2"}


def test_list_rules_for_unknown_run_404(client):
    c, _ = client
    resp = c.get("/observability/runs/999999/rules")
    assert resp.status_code == 404


def test_list_artifacts_for_rule(client):
    c, root = client
    # Seed one rule + one artifact under it.
    conn = get_task_conn(db_root=root)
    try:
        rs_out = rs.write_run_session(conn, _rec(
            "01EEE00000000000000000000A", "Fail",
            judgments=[{"RuleId": "r1", "RuleType": "PresenceAbsence", "Verdict": "Fail"}],
        ), mode="manual")
        rr_out = rr.write_rule_results(conn, run_session_id=rs_out.RunSessionId, judgments=[
            {"RuleId": "r1", "RuleType": "PresenceAbsence", "Verdict": "Fail"},
        ])
        rr_id = rr_out.Rows[0].RuleResultId
        fa.write_frame_artifacts(conn, run_session_id=rs_out.RunSessionId, artifacts=[
            {"RuleResultId": rr_id, "ArtifactKind": "RoiCrop",
             "RelPath": "artifacts/r1_roi.png",
             "Sha256": "a" * 64, "Bytes": 128},
            {"ArtifactKind": "SourceFrame", "RelPath": "artifacts/source.png",
             "Sha256": "b" * 64, "Bytes": 256},  # run-level, RuleResultId NULL
        ])
    finally:
        conn.close()

    resp = c.get(f"/observability/runs/{rs_out.RunSessionId}/rules/{rr_id}/artifacts")
    payload = _envelope_ok(resp)["Results"][0]
    assert payload["total"] == 1
    assert payload["items"][0]["ArtifactKind"] == "RoiCrop"

    # sentinel 0 -> run-level artifacts (RuleResultId IS NULL)
    resp2 = c.get(f"/observability/runs/{rs_out.RunSessionId}/rules/0/artifacts")
    payload2 = _envelope_ok(resp2)["Results"][0]
    assert payload2["total"] == 1
    assert payload2["items"][0]["ArtifactKind"] == "SourceFrame"


def test_list_artifacts_wrong_run_404(client):
    c, root = client
    # rule from run A, request under run B -> 404
    conn = get_task_conn(db_root=root)
    try:
        rs_out_a = rs.write_run_session(conn, _rec(
            "01FFF00000000000000000000A", "Fail",
            judgments=[{"RuleId": "r1", "RuleType": "PresenceAbsence", "Verdict": "Fail"}],
        ), mode="manual")
        rr_out = rr.write_rule_results(conn, run_session_id=rs_out_a.RunSessionId, judgments=[
            {"RuleId": "r1", "RuleType": "PresenceAbsence", "Verdict": "Fail"},
        ])
        rr_id = rr_out.Rows[0].RuleResultId
        rs_out_b = rs.write_run_session(conn, _rec(
            "01FFF00000000000000000000B", "Pass", judgments=[],
        ), mode="manual")
    finally:
        conn.close()

    resp = c.get(f"/observability/runs/{rs_out_b.RunSessionId}/rules/{rr_id}/artifacts")
    assert resp.status_code == 404
    assert resp.json()["Errors"]["Code"] == "E_BE_NOT_FOUND"


def test_missing_table_surfaces_500(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Task-DB never bootstrapped -> E_BE_INTERNAL, NOT silent empty list."""
    db_root = tmp_path / "vision-db"
    db_root.mkdir()
    # Deliberately do NOT apply migrations.
    monkeypatch.setenv("APP_DB_ROOT", str(db_root))
    c = TestClient(create_app())
    resp = c.get("/observability/runs")
    assert resp.status_code == 500
    body = resp.json()
    assert body["Errors"]["Code"] == "E_BE_INTERNAL"
    assert "bin/db-bootstrap.py" in body["Errors"]["Details"]["Hint"]


def test_correlation_id_echoed(client):
    c, _ = client
    resp = c.get("/observability/runs", headers={"X-Correlation-Id": "test-corr-42"})
    assert resp.headers["X-Correlation-Id"] == "test-corr-42"
