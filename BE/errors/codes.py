"""Central `E_*` error-code registry for BE.

Spec anchors:
- `spec/21-app/40-error-manage.md` §5 — codes MUST live in a central enum; inventing
  a code at a call site is `E_BUG_UNKNOWN_CODE`.
- `spec/21-app/backend-implementation-request-v1.md` — reserved families
  `E_BE_*`, `E_CAM_*`, `E_SDK_*`, `E_SEC_*`, `E_BUG_*`.
- `spec/coding-guidelines/python.md` — every boundary error uses one wire code
  from Appendix A; PascalCase class names, SCREAMING_SNAKE wire values.

Owning step: Plan 88 Step 11. Consumers: Step 12 `AppError`, Step 13 handlers,
Step 30 FE `types.ts` mirror.

This file is the ONLY place BE code may declare an `E_*` string literal.
`no-restricted-syntax` in guideline-check will treat any other literal
matching `/E_[A-Z]+_[A-Z_]+/` as `E_BUG_UNKNOWN_CODE`.
"""

from __future__ import annotations

from enum import Enum
from http import HTTPStatus


class ErrorCode(str, Enum):
    """Wire codes emitted through `BE.envelope.ErrorBody.code`."""

    # Backend boundary (E_BE_*): request-shape and lifecycle problems.
    E_BE_BAD_REQUEST = "E_BE_BAD_REQUEST"
    E_BE_NOT_FOUND = "E_BE_NOT_FOUND"
    E_BE_CONFLICT = "E_BE_CONFLICT"
    E_BE_UNAUTHORIZED = "E_BE_UNAUTHORIZED"
    E_BE_METHOD_NOT_ALLOWED = "E_BE_METHOD_NOT_ALLOWED"
    E_BE_UNPROCESSABLE = "E_BE_UNPROCESSABLE"
    E_BE_INTERNAL = "E_BE_INTERNAL"
    E_BE_UNAVAILABLE = "E_BE_UNAVAILABLE"

    # Camera domain (E_CAM_*): vendor-agnostic capture failures at the facade.
    E_CAM_NOT_CONNECTED = "E_CAM_NOT_CONNECTED"
    E_CAM_SDK_UNAVAILABLE = "E_CAM_SDK_UNAVAILABLE"
    E_CAM_TIMEOUT = "E_CAM_TIMEOUT"
    E_CAM_STREAM_STUCK = "E_CAM_STREAM_STUCK"
    E_CAM_CAPTURE_FAILED = "E_CAM_CAPTURE_FAILED"

    # SDK boundary (E_SDK_*): raw-vendor SDK misuse detected at the facade.
    E_SDK_LEAK = "E_SDK_LEAK"
    E_SDK_INIT_FAILED = "E_SDK_INIT_FAILED"

    # Security (E_SEC_*): egress + auth policy denials.
    E_SEC_UNAPPROVED_EGRESS = "E_SEC_UNAPPROVED_EGRESS"
    E_SEC_UNAUTHORIZED = "E_SEC_UNAUTHORIZED"

    # Bugs (E_BUG_*): invariant / contract violations that must be logged and surfaced.
    E_BUG_UNKNOWN_CODE = "E_BUG_UNKNOWN_CODE"
    E_BUG_SDK_LEAK = "E_BUG_SDK_LEAK"
    E_BUG_SILENT_SWALLOW = "E_BUG_SILENT_SWALLOW"
    E_BUG_ENUM_ORPHAN = "E_BUG_ENUM_ORPHAN"

    # CLI boundary (E_CLI_*): worker/processing CLI preflight + host/asset checks.
    # Plan 90 Step 10, anchored in `spec/21-app/74-worker-cli.md`,
    # `spec/21-app/75-processing-cli.md`, `spec/21-app/77-cli-powershell-and-release.md`.
    E_CLI_PREFLIGHT_FAILED = "E_CLI_PREFLIGHT_FAILED"
    E_CLI_UNSUPPORTED_HOST = "E_CLI_UNSUPPORTED_HOST"
    E_CLI_CHECKSUM_MISMATCH = "E_CLI_CHECKSUM_MISMATCH"
    # Argparse / unknown-subcommand / missing-required-arg. Kept distinct from
    # E_CLI_PREFLIGHT_FAILED so operators can grep "usage" vs "environment".
    # Plan 90 Step 43. Maps to exit=Usage (2) and HTTP 400 when re-emitted.
    E_CLI_USAGE = "E_CLI_USAGE"

    # IPC boundary (E_IPC_*): JSONL envelope emission failures per
    # `spec/21-app/76-cli-log-and-ipc.md`.
    E_IPC_UNKNOWN_KIND = "E_IPC_UNKNOWN_KIND"
    E_IPC_WRITE_FAILED = "E_IPC_WRITE_FAILED"
    E_IPC_PAYLOAD_INVALID = "E_IPC_PAYLOAD_INVALID"

    # Log substrate (E_LOG_*): rotating log root + index-lock issues per
    # `spec/21-app/76-cli-log-and-ipc.md`.
    E_LOG_ROOT_UNWRITABLE = "E_LOG_ROOT_UNWRITABLE"
    E_LOG_INDEX_LOCKED = "E_LOG_INDEX_LOCKED"

    # Rule-bundle validation (worker CLI ingest of rule payloads).
    E_RULE_BUNDLE_INVALID = "E_RULE_BUNDLE_INVALID"
    # Rule evaluation failure surfaced by the rule kernel (Plan 90 Step 79).
    # Distinct from bundle-shape errors: this covers runtime evaluation failures
    # (predicate raises, ROI reader raises, telemetry backend unreachable).
    E_RULE_EVAL_FAILED = "E_RULE_EVAL_FAILED"
    # Per-rule wall-clock budget exceeded (Plan 90 Step 91, spec 33 §5).
    # Kernel-side watchdog: when a rule carries `TimeoutMs` and its measured
    # `LatencyMs` exceeds the budget, the engine converts the judgment into
    # an Error carrying `ReasonCode=RuleTimeout` + `ErrorCode=E_RULE_TIMEOUT`.
    E_RULE_TIMEOUT = "E_RULE_TIMEOUT"
    # Tolerance resolver (Plan 90 Step 89, spec 21-app/34 §7 + 40 §A.7).
    # UNRESOLVED: no profile in resolution chain, OR ReasonCode carries
    #   `ToleranceInvalid`/`ToleranceCrossTask` for §7 sub-cases that all
    #   block bundle evaluation the same way.
    # INCOMPATIBLE: rule kind cannot use this tolerance kind (§4). Bug class.
    E_TOLERANCE_UNRESOLVED = "E_TOLERANCE_UNRESOLVED"
    E_TOLERANCE_INCOMPATIBLE = "E_TOLERANCE_INCOMPATIBLE"

    # Installer manifest (E_INSTALL_MANIFEST_*): Plan 90 Step 105.
    # INVALID: on-disk `install.json` failed schema/JSON parse (corrupt,
    #   wrong SchemaVersion, missing required key, non-list Actions).
    # UNWRITABLE: manifest dir/file cannot be created or atomically replaced
    #   (permission denied, disk full, path escapes install root).
    # MISSING: `read_manifest_strict()` invoked and file does not exist.
    E_INSTALL_MANIFEST_INVALID = "E_INSTALL_MANIFEST_INVALID"
    E_INSTALL_MANIFEST_UNWRITABLE = "E_INSTALL_MANIFEST_UNWRITABLE"
    E_INSTALL_MANIFEST_MISSING = "E_INSTALL_MANIFEST_MISSING"

    # Installer PATH-link lifecycle (Plan 90 Step 126). Raised by
    # `BE/app/installer_path.py` when the per-binary shim/symlink under
    # the user-scoped link dir (`%LOCALAPPDATA%\vision-app\bin` on
    # Windows, `~/.local/share/vision-app/bin` on POSIX) cannot be
    # created, replaced, or removed (missing source exe, permission
    # denied, non-directory in the way). Maps to 503 (infra unavail).
    E_INSTALL_PATH_LINK_FAILED = "E_INSTALL_PATH_LINK_FAILED"

    # Installer upgrade-in-place (Plan 90 Step 128). Raised by
    # `BE/app/installer_upgrade.py` when a caller asks to install a
    # version older than the recorded manifest (`DOWNGRADE_BLOCKED`)
    # or when the requested version string cannot be parsed / does not
    # match the pinned major line (`UPGRADE_INVALID`). Maps to 409
    # (conflict) / 422 (unprocessable) respectively.
    E_INSTALL_DOWNGRADE_BLOCKED = "E_INSTALL_DOWNGRADE_BLOCKED"
    E_INSTALL_UPGRADE_INVALID = "E_INSTALL_UPGRADE_INVALID"
    # Plan 90 Step 130: rollback-on-critical-failure.
    E_INSTALL_ROLLBACK_FAILED = "E_INSTALL_ROLLBACK_FAILED"



# HTTP status mapping. Handlers (Step 13) read this to set the response status
# beside the envelope body. Every `ErrorCode` MUST appear as a key; the
# `default_http_status()` helper enforces this at import time via tests.
_STATUS: dict[ErrorCode, HTTPStatus] = {
    ErrorCode.E_BE_BAD_REQUEST: HTTPStatus.BAD_REQUEST,
    ErrorCode.E_BE_NOT_FOUND: HTTPStatus.NOT_FOUND,
    ErrorCode.E_BE_CONFLICT: HTTPStatus.CONFLICT,
    ErrorCode.E_BE_UNAUTHORIZED: HTTPStatus.UNAUTHORIZED,
    ErrorCode.E_BE_METHOD_NOT_ALLOWED: HTTPStatus.METHOD_NOT_ALLOWED,
    ErrorCode.E_BE_UNPROCESSABLE: HTTPStatus.UNPROCESSABLE_ENTITY,
    ErrorCode.E_BE_INTERNAL: HTTPStatus.INTERNAL_SERVER_ERROR,
    ErrorCode.E_BE_UNAVAILABLE: HTTPStatus.SERVICE_UNAVAILABLE,
    ErrorCode.E_CAM_NOT_CONNECTED: HTTPStatus.SERVICE_UNAVAILABLE,
    ErrorCode.E_CAM_SDK_UNAVAILABLE: HTTPStatus.SERVICE_UNAVAILABLE,
    ErrorCode.E_CAM_TIMEOUT: HTTPStatus.GATEWAY_TIMEOUT,
    ErrorCode.E_CAM_STREAM_STUCK: HTTPStatus.GATEWAY_TIMEOUT,
    ErrorCode.E_CAM_CAPTURE_FAILED: HTTPStatus.BAD_GATEWAY,
    ErrorCode.E_SDK_LEAK: HTTPStatus.INTERNAL_SERVER_ERROR,
    ErrorCode.E_SDK_INIT_FAILED: HTTPStatus.SERVICE_UNAVAILABLE,
    ErrorCode.E_SEC_UNAPPROVED_EGRESS: HTTPStatus.FORBIDDEN,
    ErrorCode.E_SEC_UNAUTHORIZED: HTTPStatus.UNAUTHORIZED,
    ErrorCode.E_BUG_UNKNOWN_CODE: HTTPStatus.INTERNAL_SERVER_ERROR,
    ErrorCode.E_BUG_SDK_LEAK: HTTPStatus.INTERNAL_SERVER_ERROR,
    ErrorCode.E_BUG_SILENT_SWALLOW: HTTPStatus.INTERNAL_SERVER_ERROR,
    ErrorCode.E_BUG_ENUM_ORPHAN: HTTPStatus.INTERNAL_SERVER_ERROR,
    # CLI (all surfaced through HTTP only when the API re-emits CLI failures;
    # preflight/host/checksum map to 424 Failed Dependency per spec 77 §4).
    ErrorCode.E_CLI_PREFLIGHT_FAILED: HTTPStatus.FAILED_DEPENDENCY,
    ErrorCode.E_CLI_UNSUPPORTED_HOST: HTTPStatus.FAILED_DEPENDENCY,
    ErrorCode.E_CLI_CHECKSUM_MISMATCH: HTTPStatus.FAILED_DEPENDENCY,
    ErrorCode.E_CLI_USAGE: HTTPStatus.BAD_REQUEST,
    # IPC: unknown kind is a producer bug (500); write/payload map to 502.
    ErrorCode.E_IPC_UNKNOWN_KIND: HTTPStatus.INTERNAL_SERVER_ERROR,
    ErrorCode.E_IPC_WRITE_FAILED: HTTPStatus.BAD_GATEWAY,
    ErrorCode.E_IPC_PAYLOAD_INVALID: HTTPStatus.BAD_GATEWAY,
    # Log substrate: unwritable root is infra unavailability; locked index is conflict.
    ErrorCode.E_LOG_ROOT_UNWRITABLE: HTTPStatus.SERVICE_UNAVAILABLE,
    ErrorCode.E_LOG_INDEX_LOCKED: HTTPStatus.CONFLICT,
    # Rule bundle: unprocessable payload from CLI ingest.
    ErrorCode.E_RULE_BUNDLE_INVALID: HTTPStatus.UNPROCESSABLE_ENTITY,
    # Rule evaluation runtime failure (kernel-side).
    ErrorCode.E_RULE_EVAL_FAILED: HTTPStatus.UNPROCESSABLE_ENTITY,
    ErrorCode.E_RULE_TIMEOUT: HTTPStatus.UNPROCESSABLE_ENTITY,
    # Tolerance resolver (Plan 90 Step 89): both are load-time bundle
    # rejections per spec 34 §7, so map to 422 like bundle-invalid.
    ErrorCode.E_TOLERANCE_UNRESOLVED: HTTPStatus.UNPROCESSABLE_ENTITY,
    ErrorCode.E_TOLERANCE_INCOMPATIBLE: HTTPStatus.UNPROCESSABLE_ENTITY,
    # Installer manifest (Plan 90 Step 105): invalid = 422 (unprocessable
    # payload), unwritable = 503 (infra unavailability, matches log root),
    # missing = 404 (operator asked for a manifest that was never created).
    ErrorCode.E_INSTALL_MANIFEST_INVALID: HTTPStatus.UNPROCESSABLE_ENTITY,
    ErrorCode.E_INSTALL_MANIFEST_UNWRITABLE: HTTPStatus.SERVICE_UNAVAILABLE,
    ErrorCode.E_INSTALL_MANIFEST_MISSING: HTTPStatus.NOT_FOUND,
    # Installer PATH-link (Plan 90 Step 126): unwritable link dir /
    # missing source exe / permission denied all surface as 503.
    ErrorCode.E_INSTALL_PATH_LINK_FAILED: HTTPStatus.SERVICE_UNAVAILABLE,
    # Installer upgrade (Plan 90 Step 128): downgrade = 409 conflict,
    # invalid version = 422 unprocessable.
    ErrorCode.E_INSTALL_DOWNGRADE_BLOCKED: HTTPStatus.CONFLICT,
    ErrorCode.E_INSTALL_UPGRADE_INVALID: HTTPStatus.UNPROCESSABLE_ENTITY,
    ErrorCode.E_INSTALL_ROLLBACK_FAILED: HTTPStatus.SERVICE_UNAVAILABLE,

}


def default_http_status(code: ErrorCode) -> HTTPStatus:
    """Return the canonical HTTP status for a given wire code."""
    return _STATUS[code]


def is_registered(value: str) -> bool:
    """True when `value` is a known wire code (used by lint / import validators)."""
    return value in ErrorCode._value2member_map_


__all__ = ["ErrorCode", "default_http_status", "is_registered"]
