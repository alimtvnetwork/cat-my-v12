"""GET /api/cli/config/effective - 5-layer effective-config accordion feed.

Plan 90 Step 120. Spec: spec/21-app/74-worker-cli.md and
spec/21-app/76-cli-log-and-ipc.md (§Config resolution: defaults -> repo ->
user -> env -> flags). This endpoint powers `src/routes/cli.settings.tsx`.

Honest wire (no false-OK per spec/03-error-manage/):
  - `defaults`: hardcoded snapshot derived from `BE.config.Settings` model
    field defaults - the only layer BE can prove today.
  - `env`: the actual `BE_*` env vars observed in `os.environ` at request
    time, filtered to keys mapping to `Settings` fields. Values are the
    strings the process actually saw (no coercion), so an operator can
    compare wire-visible strings against the merged `Settings()` result.
  - `repo`, `user`, `flags`: reported with `source="not-implemented"` and
    a `reason` string so the UI accordion can render an amber "layer not
    yet wired" state instead of pretending the merge is 5-layer capable.
    Steps 121 (user writer) and 122 (doctor) will begin populating these.
  - `effective`: `Settings()` merged snapshot (what the process actually
    uses right now) so the UI can diff each layer against the winner.

Route lives at `/api/cli/config/effective` (not `/config/effective`) to
match the FE server-fn expectation Step 120 declares in the plan, and to
namespace CLI operator surfaces distinctly from public app config.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Final

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from BE.config import Environment, LogLevel, Settings, get_settings
from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, success
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

logger = logging.getLogger("BE.routes.cli_config")

router = APIRouter(prefix="/api/cli/config")

# Fields exposed to the CLI settings accordion. Keep in sync with
# `BE.config.Settings`; a mismatch is a coding bug caught by the guard
# below at import time (fail-fast, not silent drift).
_EXPOSED_FIELDS: Final[tuple[str, ...]] = (
    "host",
    "port",
    "env",
    "log_level",
    "cors_origins",
)

_ENV_PREFIX: Final[str] = "BE_"

# In-process user-layer store (Plan 90 Step 121). Not persisted across
# restarts on purpose: the on-disk user-config file lands in a later step;
# this store is only the wire surface so the FE writer form can validate
# end-to-end today. `_USER_STORE` maps a subset of `_EXPOSED_FIELDS` to
# user-supplied values that have passed `_validate_user_field`.
_USER_STORE: dict[str, Any] = {}

# JSON-Schema shape published to the FE so the form can restrict inputs to
# fields present here and reject unknown keys client-side. Types mirror
# `Settings` model but are kept intentionally strict (no coercion).
_USER_LAYER_SCHEMA: Final[dict[str, dict[str, Any]]] = {
    "host": {"type": "string", "minLength": 1, "maxLength": 253},
    "port": {"type": "integer", "minimum": 1, "maximum": 65535},
    "env": {"type": "string", "enum": [e.value for e in Environment]},
    "log_level": {"type": "string", "enum": [l.value for l in LogLevel]},
}


def _defaults_layer() -> dict[str, Any]:
    """Snapshot of `Settings` model defaults (no env, no overrides)."""
    fields = Settings.model_fields
    values: dict[str, Any] = {}
    for name in _EXPOSED_FIELDS:
        if name not in fields:
            raise RuntimeError(
                f"BE.config.Settings dropped field '{name}'; update _EXPOSED_FIELDS"
            )
        default = fields[name].default
        values[name] = _jsonable(default)
    return {"source": "defaults", "values": values}


def _env_layer() -> dict[str, Any]:
    """Values actually present in `os.environ` under the `BE_` prefix."""
    observed: dict[str, str] = {}
    for name in _EXPOSED_FIELDS:
        key = f"{_ENV_PREFIX}{name.upper()}"
        if key in os.environ:
            observed[name] = os.environ[key]
    return {
        "source": "env",
        "prefix": _ENV_PREFIX,
        "values": observed,
    }


def _not_implemented_layer(name: str, reason: str) -> dict[str, Any]:
    return {"source": "not-implemented", "layer": name, "reason": reason, "values": {}}


def _effective_layer(cfg: Settings) -> dict[str, Any]:
    values = {name: _jsonable(getattr(cfg, name)) for name in _EXPOSED_FIELDS}
    return {"source": "effective", "values": values}


def _jsonable(v: Any) -> Any:
    if isinstance(v, tuple):
        return list(v)
    if hasattr(v, "value"):  # Enum
        return v.value
    return v


def _user_layer() -> dict[str, Any]:
    """Values currently stored in the in-process user-config store."""
    return {
        "source": "user",
        "values": dict(_USER_STORE),
        "schema": _USER_LAYER_SCHEMA,
        "note": "In-process only; on-disk persistence lands in a later Plan 90 step.",
    }


def _validate_user_field(name: str, value: Any) -> Any:
    """Validate one field against `_USER_LAYER_SCHEMA`. Raises AppError."""
    schema = _USER_LAYER_SCHEMA.get(name)
    if not schema:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"Field '{name}' is not writable via user-layer config.",
            details={"writable_fields": sorted(_USER_LAYER_SCHEMA)},
        )
    expected = schema["type"]
    if expected == "string" and not isinstance(value, str):
        raise AppError(ErrorCode.E_BE_BAD_REQUEST, f"'{name}' must be a string.")
    if expected == "integer" and (isinstance(value, bool) or not isinstance(value, int)):
        raise AppError(ErrorCode.E_BE_BAD_REQUEST, f"'{name}' must be an integer.")
    if "enum" in schema and value not in schema["enum"]:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"'{name}' must be one of {schema['enum']}.",
        )
    if "minimum" in schema and value < schema["minimum"]:
        raise AppError(ErrorCode.E_BE_BAD_REQUEST, f"'{name}' below minimum {schema['minimum']}.")
    if "maximum" in schema and value > schema["maximum"]:
        raise AppError(ErrorCode.E_BE_BAD_REQUEST, f"'{name}' above maximum {schema['maximum']}.")
    if "minLength" in schema and len(value) < schema["minLength"]:
        raise AppError(ErrorCode.E_BE_BAD_REQUEST, f"'{name}' shorter than {schema['minLength']}.")
    if "maxLength" in schema and len(value) > schema["maxLength"]:
        raise AppError(ErrorCode.E_BE_BAD_REQUEST, f"'{name}' longer than {schema['maxLength']}.")
    return value


@router.get("/user")
async def get_user_config(request: Request) -> JSONResponse:
    """Return the user-layer store and its JSON-Schema for the writer form."""
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    envelope = success(_user_layer(), requested_at=str(request.url))
    logger.info(
        "cli_config_user_get",
        extra={
            "CorrelationId": correlation_id,
            "operation": "GET /api/cli/config/user",
            "code": None,
            "subject_id": None,
        },
    )
    return JSONResponse(
        content=envelope.to_wire(),
        headers={CORRELATION_HEADER: correlation_id},
    )


@router.post("/user")
async def post_user_config(request: Request) -> JSONResponse:
    """Write user-layer overrides. Body: {"values": {field: value, ...}}.

    Unknown keys raise E_BE_BAD_REQUEST. Passing `null` clears the field.
    """
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    try:
        body = await request.json()
    except Exception as exc:
        raise AppError(ErrorCode.E_BE_BAD_REQUEST, "Body must be valid JSON.") from exc
    if not isinstance(body, dict) or not isinstance(body.get("values"), dict):
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "Body shape: {\"values\": {field: value, ...}}.",
        )
    incoming: dict[str, Any] = body["values"]
    unknown = sorted(set(incoming) - set(_USER_LAYER_SCHEMA))
    if unknown:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"Unknown user-layer fields: {unknown}",
            details={"writable_fields": sorted(_USER_LAYER_SCHEMA)},
        )
    validated: dict[str, Any] = {}
    for name, value in incoming.items():
        if value is None:
            _USER_STORE.pop(name, None)
            continue
        validated[name] = _validate_user_field(name, value)
    _USER_STORE.update(validated)
    logger.info(
        "cli_config_user_post",
        extra={
            "CorrelationId": correlation_id,
            "operation": "POST /api/cli/config/user",
            "code": None,
            "subject_id": None,
            "fields_written": sorted(validated),
            "fields_cleared": sorted(k for k, v in incoming.items() if v is None),
        },
    )
    envelope = success(_user_layer(), requested_at=str(request.url))
    return JSONResponse(
        content=envelope.to_wire(),
        headers={CORRELATION_HEADER: correlation_id},
    )



@router.get("/effective")
async def get_effective_config(request: Request) -> JSONResponse:
    """Return the 5-layer effective-config resolution for `/cli/settings`."""
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    cfg = get_settings()
    payload = {
        "layers": [
            _defaults_layer(),
            _not_implemented_layer(
                "repo",
                "Repo-level config file (e.g. `./be.config.toml`) not yet wired; a later Plan 90 step will introduce it.",
            ),
            _user_layer(),
            _env_layer(),
            _not_implemented_layer(
                "flags",
                "CLI --flag overrides are captured per-invocation by argparse and are not persisted server-side; the CLI session log is authoritative.",
            ),
        ],
        "effective": _effective_layer(cfg),
        "exposed_fields": list(_EXPOSED_FIELDS),
    }
    logger.info(
        "cli_config_effective",
        extra={
            "CorrelationId": correlation_id,
            "operation": "GET /api/cli/config/effective",
            "code": None,
            "subject_id": None,
        },
    )
    envelope = success(payload, requested_at=str(request.url))
    return JSONResponse(
        content=envelope.to_wire(),
        headers={CORRELATION_HEADER: correlation_id},
    )


__all__ = ["router"]
