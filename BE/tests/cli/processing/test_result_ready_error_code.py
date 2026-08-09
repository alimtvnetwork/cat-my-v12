"""Plan 90 Step 92 — ResultReady IPC promotes per-rule ErrorCode.

Root cause covered: without top-level `ErrorCode`/`ErrorCount` on the
`ResultReady` IPC envelope, downstream watchers (FE `GlobalErrorModal`,
alerting) had to re-open the JSONL to distinguish a slow-but-Passed run
from a timeout-Errored run. Spec 21-app/33 §5 + 03-error-manage/02
require the taxonomy at the envelope boundary.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from BE.cli.common.ipc_models import ResultReadyPayload
from BE.cli.processing.commands.evaluate import _promote_error_code


def test_payload_defaults_backcompat():
    p = ResultReadyPayload(
        ResultsPath="/tmp/x.jsonl", RunId="R1", FrameSeq=0,
        Decision="pass", RuleCount=0, PassCount=0, FailCount=0,
    )
    assert p.ErrorCount == 0
    assert p.ErrorCode is None


def test_payload_accepts_error_fields():
    p = ResultReadyPayload(
        ResultsPath="/tmp/x.jsonl", RunId="R1", FrameSeq=1,
        Decision="error", RuleCount=3, PassCount=1, FailCount=0,
        ErrorCount=2, ErrorCode="E_RULE_TIMEOUT",
    )
    assert p.ErrorCount == 2
    assert p.ErrorCode == "E_RULE_TIMEOUT"


def test_payload_rejects_negative_error_count():
    with pytest.raises(ValidationError):
        ResultReadyPayload(
            ResultsPath="/tmp/x.jsonl", RunId="R1", FrameSeq=0,
            Decision="pass", RuleCount=0, PassCount=0, FailCount=0,
            ErrorCount=-1,
        )


def test_payload_rejects_empty_error_code():
    with pytest.raises(ValidationError):
        ResultReadyPayload(
            ResultsPath="/tmp/x.jsonl", RunId="R1", FrameSeq=0,
            Decision="pass", RuleCount=0, PassCount=0, FailCount=0,
            ErrorCode="",
        )


def test_promote_none_when_no_judgments():
    assert _promote_error_code([]) is None


def test_promote_none_when_no_error_code_present():
    assert _promote_error_code([
        {"Details": {"ReasonCode": "Fine", "LatencyMs": 1.0}},
        {"Details": {"ReasonCode": "AlsoFine"}},
    ]) is None


def test_promote_prefers_rule_timeout():
    assert _promote_error_code([
        {"Details": {"ErrorCode": "E_RULE_EVAL_FAILED"}},
        {"Details": {"ErrorCode": "E_RULE_TIMEOUT"}},
        {"Details": {"ErrorCode": "E_TOLERANCE_UNRESOLVED"}},
    ]) == "E_RULE_TIMEOUT"


def test_promote_falls_back_to_first_unknown():
    assert _promote_error_code([
        {"Details": {"ErrorCode": "E_CUSTOM_UNLISTED"}},
    ]) == "E_CUSTOM_UNLISTED"


def test_promote_ignores_non_dict_details_and_bad_types():
    assert _promote_error_code([
        {"Details": "nope"},
        {"details": {"ErrorCode": 42}},
        {"Details": {"ErrorCode": "E_RULE_TIMEOUT"}},
    ]) == "E_RULE_TIMEOUT"


def test_promote_accepts_lowercase_details_key():
    assert _promote_error_code([
        {"details": {"ErrorCode": "E_TOLERANCE_INCOMPATIBLE"}},
    ]) == "E_TOLERANCE_INCOMPATIBLE"
