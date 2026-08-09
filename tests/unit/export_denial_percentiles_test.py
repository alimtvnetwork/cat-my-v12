"""Tests for denial exporter percentile windows."""
from __future__ import annotations

import json
from pathlib import Path

from app.core.security.denial_metrics import load_rows, percentiles_by_window
from scripts.security.export_denial_events import percentile_payload

FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "security" / "denial_sample.jsonl"


def _row(ts: int, user_id: str) -> str:
    return json.dumps({
        "ts": ts, "code": "E_SEC_ROLE_DENIED", "user_id": user_id,
        "subject": "ops:capture", "detail": "synthetic",
    })


def _extended_fixture(tmp_path: Path) -> Path:
    out = tmp_path / "denial_extended.jsonl"
    lines = FIXTURE.read_text(encoding="utf-8").splitlines()
    lines.extend(_row(1_800_000_000 + i, f"syn-{i % 4}") for i in range(200))
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return out


def test_window_percentiles_are_deterministic(tmp_path: Path) -> None:
    rows = load_rows(_extended_fixture(tmp_path))
    got = percentiles_by_window(rows, 60)
    assert got.rows == 210
    assert got.buckets == 21
    assert (got.p50, got.p95, got.p99) == (15, 15, 15)


def test_exporter_payload_has_all_plan29_windows(tmp_path: Path) -> None:
    got = percentile_payload(_extended_fixture(tmp_path))
    assert list(got) == ["window_1m", "window_5m", "window_15m"]
    assert got["window_5m"]["p95"] == 50
    assert got["window_15m"]["p99"] == 50