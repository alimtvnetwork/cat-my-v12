"""Contract test — results JSONL rows satisfy schema v1 and reject reference paths.

Closes audit finding F-55 (contract tier of pytest pyramid).
Anchor: spec/21-app/24-results.md §4.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from app.dispatcher.results_writer import (  # noqa: E402
    ResultReferencePathError,
    ResultSchemaError,
    _serialize,
    _validate_result,
)


def _valid_row() -> dict:
    return {
        "schemaVersion": 1,
        "resultId": "R-0001",
        "runSessionId": "RS-0001",
        "judgments": [{"kind": "OK", "score": 0.99}],
    }


def test_valid_row_serializes_to_ndjson_line() -> None:
    line = _serialize(_valid_row())
    assert line.endswith(b"\n"), "JSONL row must end with newline"
    assert line.count(b"\n") == 1, "row must be a single line"


def test_bad_schema_version_rejected() -> None:
    row = _valid_row()
    row["schemaVersion"] = 99
    with pytest.raises(ResultSchemaError):
        _validate_result(row)


def test_reference_path_leak_rejected() -> None:
    row = _valid_row()
    row["judgments"][0]["referencePath"] = "/opt/ref.png"
    with pytest.raises(ResultReferencePathError):
        _validate_result(row)
