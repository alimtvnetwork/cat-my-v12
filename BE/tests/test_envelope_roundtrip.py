"""Envelope round-trip: to_wire() -> model_validate() must reproduce the model.

Guards against silent drift between the PascalCase wire shape (produced by
`Envelope.to_wire()` via `by_alias=True`) and the Python-side field names
(consumed via `populate_by_name=True`). If either side stops honoring the
alias map, round-trip equality breaks and this suite fails.

Spec: `spec/03-error-manage/02-error-architecture/05-response-envelope/`.
"""

from __future__ import annotations

import json

from BE.envelope import Envelope, failure, success

_URL = "http://test/api/thing"


def _roundtrip(env: Envelope) -> Envelope:
    """to_wire -> json bytes -> dict -> model_validate. Full wire round-trip."""
    wire = env.to_wire()
    reparsed = json.loads(json.dumps(wire))
    return Envelope.model_validate(reparsed)


def test_success_single_roundtrip_equals_source() -> None:
    env = success({"port": 8787, "nested": [1, 2]}, requested_at=_URL)
    assert _roundtrip(env) == env


def test_success_multi_roundtrip_preserves_results_order() -> None:
    env = success([{"id": 3}, {"id": 1}, {"id": 2}], requested_at=_URL)
    back = _roundtrip(env)
    assert back == env
    assert [r["id"] for r in back.results] == [3, 1, 2]


def test_success_empty_roundtrip_omits_optional_sections() -> None:
    env = success([], requested_at=_URL)
    wire = env.to_wire()
    assert "Errors" not in wire and "Navigation" not in wire and "MethodsStack" not in wire
    assert _roundtrip(env) == env


def test_failure_roundtrip_preserves_error_code_and_frames() -> None:
    env = failure(
        code="E_BE_INTERNAL",
        message="boom",
        requested_at=_URL,
        http_status=500,
        backend_frames=["app.py:10 handler", "svc.py:3 fetch"],
        delegated_stack=["vendor: -101 GX_STATUS_INVALID_HANDLE"],
    )
    back = _roundtrip(env)
    assert back == env
    assert back.errors is not None
    assert back.errors.Code == "E_BE_INTERNAL"
    assert back.errors.Backend == ["app.py:10 handler", "svc.py:3 fetch"]
    assert back.errors.DelegatedServiceErrorStack == ["vendor: -101 GX_STATUS_INVALID_HANDLE"]


def test_roundtrip_wire_keys_are_pascal_case() -> None:
    wire = success({"x": 1}, requested_at=_URL).to_wire()
    # Top-level PascalCase envelope keys per spec Rule 2.
    assert set(wire.keys()) <= {
        "Status",
        "Attributes",
        "Results",
        "Navigation",
        "Errors",
        "MethodsStack",
    }
    assert "Status" in wire and "Attributes" in wire and "Results" in wire
    # No snake_case leak from Python field names.
    assert not any(k.islower() for k in wire.keys())


def test_roundtrip_is_idempotent() -> None:
    """Round-tripping twice yields the same wire dict as round-tripping once."""
    env = failure(code="E_BE_NOT_FOUND", message="x", requested_at=_URL, http_status=404)
    once = _roundtrip(env).to_wire()
    twice = _roundtrip(_roundtrip(env)).to_wire()
    assert once == twice
