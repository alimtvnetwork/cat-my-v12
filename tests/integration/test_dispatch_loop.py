"""Integration test — capture → dispatch → results append (end-to-end thin slice).

Closes audit finding F-56 (integration tier of pytest pyramid).
Anchor: spec/21-app/13-dispatcher.md §2, spec/21-app/24-results.md §4.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from app.core.telemetry.log_record import LogContext, StructuredLogger  # noqa: E402
from app.core.telemetry.metrics import MetricRegistry  # noqa: E402
from app.dispatcher.results_writer import append_result, iter_result_lines  # noqa: E402


def test_append_and_read_roundtrip(tmp_path: Path) -> None:
    ctx = LogContext(
        proc="dispatcher",
        proc_id="test",
        correlation_id="C-1",
        task_id="T-1",
        run_session_id="RS-INTEG",
        operator_id="OP-TEST",
    )
    logger = StructuredLogger(context=ctx)
    metrics = MetricRegistry()
    result = {
        "schemaVersion": 1,
        "resultId": "R-0001",
        "runSessionId": "RS-INTEG",
        "taskId": "T-1",
        "verdict": "OK",
        "judgments": [{"kind": "OK", "score": 0.97, "ruleKind": "mark_ocr"}],
    }
    live = append_result(tmp_path, result, logger, metrics)
    assert live.exists()
    lines = iter_result_lines(tmp_path, "RS-INTEG")
    assert len(lines) == 1
    parsed = json.loads(lines[0])
    assert parsed["resultId"] == "R-0001"
    assert parsed["schemaVersion"] == 1
