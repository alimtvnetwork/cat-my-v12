"""GET /samples and GET /samples/{sample_id} — stub CRUD, repo-only.

Spec: spec/21-app/backend-implementation-request-v1.md
Mirrors `BE/routes/rules.py` (Step 18) so Step 20 can design `SampleProvider`
and `RuleProvider` Protocols as a matched pair (same list/get shape, same
error contract). Sample ids follow the same monotonic positive-int alias
rule as rules (`src/lib/ids/int-alias.ts`); non-numeric / ≤0 → 400
`E_BE_BAD_REQUEST`; valid id → 404 `E_BE_NOT_FOUND` until Step 20 wires the
in-memory `SampleProvider` under `BE/app/repos/`.

Never imports from repo-root `sdk/` — would trip `E_BUG_SDK_LEAK` per SS-02.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from BE.app.domain.cat_sample import CatSample
from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, success
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode
from BE.repos.samples_repo import get_samples_repo

logger = logging.getLogger("BE.routes.samples")

router = APIRouter(prefix="/samples")


_ALLOWED_SAMPLE_FIELDS = {"id", "rule_id", "label", "captured_at"}


def _parse_sample_body(raw: object, expected_id: int | None = None) -> CatSample:
    """Validate a POST/PUT body into a `CatSample`.

    Any deviation (non-dict, missing key, wrong type, id/path mismatch) raises
    `AppError(E_BE_BAD_REQUEST)` so the Step-13 envelope handler renders it as
    a 400 with a stable code. No silent coercion, no default fills: the wire
    format is strict on the way in per `spec/03-error-manage/`.
    """
    if not isinstance(raw, dict):
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "sample body must be a JSON object",
            {"received_type": type(raw).__name__},
        )
    unknown = set(raw.keys()) - _ALLOWED_SAMPLE_FIELDS
    if unknown:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "sample body has unknown fields",
            {"unknown": sorted(unknown), "allowed": sorted(_ALLOWED_SAMPLE_FIELDS)},
        )
    missing = _ALLOWED_SAMPLE_FIELDS - set(raw.keys())
    if missing:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "sample body is missing required fields",
            {"missing": sorted(missing)},
        )
    sid = raw["id"]
    rid = raw["rule_id"]
    label = raw["label"]
    captured_at = raw["captured_at"]
    if not isinstance(sid, int) or isinstance(sid, bool) or sid <= 0:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "sample.id must be a positive integer",
            {"received": sid},
        )
    if not isinstance(rid, int) or isinstance(rid, bool) or rid <= 0:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "sample.rule_id must be a positive integer",
            {"received": rid},
        )
    if not isinstance(label, str) or not label.strip():
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "sample.label must be a non-empty string",
            {"received": label},
        )
    if not isinstance(captured_at, str) or not captured_at:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "sample.captured_at must be a non-empty ISO-8601 string",
            {"received": captured_at},
        )
    if expected_id is not None and sid != expected_id:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "path sample_id must match body.id",
            {"path": expected_id, "body": sid},
        )
    return CatSample(id=sid, rule_id=rid, label=label, captured_at=captured_at)


def _parse_sample_id(raw: str) -> int:
    """Validate positive-int path param; raise `AppError` on any deviation."""
    try:
        value = int(raw)
    except ValueError as exc:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "sample id must be a positive integer",
            {"received": raw},
        ) from exc
    if value <= 0:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "sample id must be a positive integer",
            {"received": raw},
        )
    return value


@router.get("")
async def list_samples(request: Request) -> JSONResponse:
    """List samples via the active `SamplesRepo` (default: empty in-memory)."""
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    repo = get_samples_repo()
    items = [s.to_wire() for s in repo.list_samples()]
    logger.info(
        "samples_list",
        extra={
            "CorrelationId": correlation_id,
            "operation": "GET /samples",
            "code": None,
            "subject_id": None,
        },
    )
    payload = {"items": items, "total": len(items), "provider": type(repo).__name__}
    envelope = success(payload, requested_at=str(request.url))
    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


@router.get("/{sample_id}")
async def get_sample(sample_id: str, request: Request) -> JSONResponse:
    """Fetch one sample via the active `SamplesRepo`."""
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    parsed = _parse_sample_id(sample_id)
    repo = get_samples_repo()
    sample = repo.get_sample(parsed)
    logger.info(
        "samples_get",
        extra={
            "CorrelationId": correlation_id,
            "operation": "GET /samples/{id}",
            "code": None,
            "subject_id": str(parsed),
        },
    )
    envelope = success(sample.to_wire(), requested_at=str(request.url))
    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


async def _read_json(request: Request) -> object:
    try:
        return await request.json()
    except ValueError as exc:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST, "body must be valid JSON", {"cause": str(exc)}
        ) from exc


@router.post("")
async def create_sample(request: Request) -> JSONResponse:
    """Insert a sample via `SamplesRepo.upsert_sample` (Plan 90 Step 145).

    POST allows the client to mint a specific `id` (the samples slice uses
    monotonic client-side integer aliases per `src/lib/ids/int-alias.ts`, so
    the id is authoritative, not server-assigned). Idempotent by id: a second
    POST with the same id updates the row rather than 409-ing, matching the
    repo's upsert semantics. Bad payload → 400 `E_BE_BAD_REQUEST`.
    """
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    raw = await _read_json(request)
    sample = _parse_sample_body(raw)
    repo = get_samples_repo()
    committed = repo.upsert_sample(sample)
    logger.info(
        "samples_create",
        extra={
            "CorrelationId": correlation_id,
            "operation": "POST /samples",
            "code": None,
            "subject_id": str(sample.id),
        },
    )
    envelope = success(committed.to_wire(), requested_at=str(request.url))
    return JSONResponse(
        content=envelope.to_wire(),
        headers={CORRELATION_HEADER: correlation_id},
        status_code=200,
    )


@router.put("/{sample_id}")
async def update_sample(sample_id: str, request: Request) -> JSONResponse:
    """Update a sample via `SamplesRepo.upsert_sample` with path/body id check."""
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    parsed = _parse_sample_id(sample_id)
    raw = await _read_json(request)
    sample = _parse_sample_body(raw, expected_id=parsed)
    repo = get_samples_repo()
    committed = repo.upsert_sample(sample)
    logger.info(
        "samples_update",
        extra={
            "CorrelationId": correlation_id,
            "operation": "PUT /samples/{id}",
            "code": None,
            "subject_id": str(parsed),
        },
    )
    envelope = success(committed.to_wire(), requested_at=str(request.url))
    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


@router.delete("/{sample_id}")
async def delete_sample(sample_id: str, request: Request) -> JSONResponse:
    """Remove a sample via `SamplesRepo.delete_sample`.

    Missing id → repo raises `E_BE_NOT_FOUND` (404) per the Step-144
    contract; propagated by the Step-13 envelope handler. Success returns
    an envelope with an empty `Results` object so clients can uniformly
    read `Status.IsSuccess` without a shape switch.
    """
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    parsed = _parse_sample_id(sample_id)
    repo = get_samples_repo()
    repo.delete_sample(parsed)
    logger.info(
        "samples_delete",
        extra={
            "CorrelationId": correlation_id,
            "operation": "DELETE /samples/{id}",
            "code": None,
            "subject_id": str(parsed),
        },
    )
    envelope = success({"deleted_id": parsed}, requested_at=str(request.url))
    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


__all__ = ["router"]

