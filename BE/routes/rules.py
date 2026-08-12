"""GET /rules and GET /rules/{rule_id} — stub CRUD, repo-only.

Spec: spec/21-app/backend-implementation-request-v1.md
Step 18 lands wire-only stubs so Steps 20-22 (RuleProvider repo) have a real
caller signature to match, and Step 30 (FE typed client) has stable URLs. No
provider is wired yet: `list` returns an empty envelope, `get` always raises
`AppError(E_BE_NOT_FOUND)` which flows through Step-13 handlers into the frozen
failure envelope with HTTP 404. Path IDs are validated as positive ints per the
project's monotonic integer-alias rule (src/lib/ids/int-alias.ts); non-numeric
IDs → `E_BE_BAD_REQUEST` (400).

Never imports from repo-root `sdk/` — that's `E_BUG_SDK_LEAK` per SS-02.
Provider hookup lands in Steps 20-22 via `BE/app/repos/`.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from BE.app.domain.rule_set import parse_envelope
from BE.repos.rules_repo import get_rules_repo
from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, success
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

logger = logging.getLogger("BE.routes.rules")

router = APIRouter(prefix="/rules")


def _parse_rule_id(raw: str) -> int:
    """Validate positive-int path param; raise `AppError` on any deviation."""
    try:
        value = int(raw)
    except ValueError as exc:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "rule id must be a positive integer",
            {"received": raw},
        ) from exc
    if value <= 0:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "rule id must be a positive integer",
            {"received": raw},
        )
    return value


@router.get("")
async def list_rules(request: Request) -> JSONResponse:
    """List rules via the active `RulesRepo` (default: empty in-memory)."""
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    repo = get_rules_repo()
    items = [r.to_wire() for r in repo.list_rules()]
    logger.info(
        "rules_list",
        extra={
            "CorrelationId": correlation_id,
            "operation": "GET /rules",
            "code": None,
            "subject_id": None,
        },
    )
    payload = {"items": items, "total": len(items), "provider": type(repo).__name__}
    envelope = success(payload, requested_at=str(request.url))
    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


@router.get("/{rule_id}")
async def get_rule(rule_id: str, request: Request) -> JSONResponse:
    """Fetch one rule via the active `RulesRepo`.

    The repo owns the `E_BE_NOT_FOUND` decision; this handler only validates
    the path param and lets `AppError` propagate to the Step-13 handlers.
    """
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    parsed = _parse_rule_id(rule_id)
    repo = get_rules_repo()
    rule = repo.get_rule(parsed)
    logger.info(
        "rules_get",
        extra={
            "CorrelationId": correlation_id,
            "operation": "GET /rules/{id}",
            "code": None,
            "subject_id": str(parsed),
        },
    )
    envelope = success(rule.to_wire(), requested_at=str(request.url))
    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})



@router.put("/{rule_id}")
async def save_rule_set(rule_id: str, request: Request) -> JSONResponse:
    """Persist a `RuleSetEnvelope` from the FE Save button (Plan 90 Step 133).

    Body MUST be a `RuleSetEnvelope` (PascalCase) identical to the FE draft.
    The path `{rule_id}` must match `body.RuleSetId`; a mismatch is
    `E_BE_BAD_REQUEST` (400). Payload validation errors surface as 400 via
    `parse_envelope`. Facade may raise `E_BE_CONFLICT` on stale versions.
    """
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    parsed_id = _parse_rule_id(rule_id)
    try:
        raw = await request.json()
    except ValueError as exc:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST, "body must be valid JSON", {"cause": str(exc)}
        ) from exc
    envelope = parse_envelope(raw)
    if envelope.RuleSetId != parsed_id:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "path rule_id must match body.RuleSetId",
            {"path": parsed_id, "body": envelope.RuleSetId},
        )
    repo = get_rules_repo()
    committed = repo.save_rule_set(envelope)
    logger.info(
        "rules_save",
        extra={
            "CorrelationId": correlation_id,
            "operation": "PUT /rules/{id}",
            "code": None,
            "subject_id": str(parsed_id),
        },
    )
    env = success(committed.to_wire(), requested_at=str(request.url))
    return JSONResponse(content=env.to_wire(), headers={CORRELATION_HEADER: correlation_id})


@router.get("/{rule_id}/set")
async def get_rule_set(rule_id: str, request: Request) -> JSONResponse:
    """Return the server-committed `RuleSetEnvelope` for `rule_id` (Plan 90 Step 142).

    Separate path from `GET /rules/{id}` (which returns a `CatRule`) so the
    two shapes never overload the same URL. FE `loadRuleSet.ts` targets
    this endpoint. Facade raises `E_BE_NOT_FOUND` (404) when the rule set
    was never saved; propagated as-is by the Step-13 handlers.
    """
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    parsed_id = _parse_rule_id(rule_id)
    repo = get_rules_repo()
    envelope = repo.get_rule_set(parsed_id)
    logger.info(
        "rules_set_get",
        extra={
            "CorrelationId": correlation_id,
            "operation": "GET /rules/{id}/set",
            "code": None,
            "subject_id": str(parsed_id),
        },
    )
    env = success(envelope.to_wire(), requested_at=str(request.url))
    return JSONResponse(content=env.to_wire(), headers={CORRELATION_HEADER: correlation_id})


__all__ = ["router"]
