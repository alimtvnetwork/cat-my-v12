"""In-memory `StorageFacade` implementation (Plan 88 Step 22).

Vendor-agnostic blob store used by BE tests, FE fixtures, and any pre-adapter
integration work. Real adapters (S3, Supabase Storage, on-prem NAS) land after
Plan 88 and reuse this contract verbatim.

Rules (see `spec/21-app/40-error-manage.md` §3, `52-sdk-facade-pattern.md`):
- Keys are opaque, non-empty, ASCII-printable, no NUL, no leading/trailing
  slash, no `..` segment. Bad keys raise `AppError(E_BE_BAD_REQUEST)` with
  `{key, reason}`.
- `data` MUST be `bytes` (never `str`, never `bytearray`, never `None`). Type
  drift raises `AppError(E_BE_BAD_REQUEST)` so callers cannot silently store
  UTF-8-encoded text expecting round-trip parity.
- `get()` on an unknown key raises `AppError(E_BE_NOT_FOUND)` with `{key}`; it
  never returns `b""` (that ambiguity would mask real corruption).
- No vendor imports. State is a plain in-memory `dict[str, bytes]`.
- Stub is process-local and non-durable. `clear()` exists for test isolation
  and is explicitly NOT part of the `StorageFacade` Protocol surface.
"""

from __future__ import annotations

from typing import Final

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

# Guardrail: keys are small and path-safe. Real backends (S3) allow up to 1024,
# but capping here catches accidental blob-as-key mistakes early.
_MAX_KEY_LEN: Final[int] = 512
# Guardrail: bounded payload to prevent a runaway test from OOM-ing the worker.
# Real adapters set their own ceiling; this stub is not the enforcement point
# for production limits.
_MAX_VALUE_BYTES: Final[int] = 32 * 1024 * 1024  # 32 MiB


def _reject(key: str, reason: str) -> AppError:
    return AppError(
        ErrorCode.E_BE_BAD_REQUEST,
        message=f"invalid storage key: {reason}",
        details={"key": key, "reason": reason},
    )


def _validate_key(key: object) -> str:
    if not isinstance(key, str):
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            message="storage key must be str",
            details={"type": type(key).__name__},
        )
    if not key:
        raise _reject(key, "empty")
    if len(key) > _MAX_KEY_LEN:
        raise _reject(key, f"length>{_MAX_KEY_LEN}")
    if not key.isprintable() or "\x00" in key:
        raise _reject(key, "non-printable or NUL")
    if key.startswith("/") or key.endswith("/"):
        raise _reject(key, "leading/trailing slash")
    if any(seg in {"", ".", ".."} for seg in key.split("/")):
        raise _reject(key, "empty or dot segment")
    return key


def _validate_value(key: str, data: object) -> bytes:
    if not isinstance(data, bytes):
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            message="storage value must be bytes",
            details={"key": key, "type": type(data).__name__},
        )
    if len(data) > _MAX_VALUE_BYTES:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            message="storage value exceeds stub ceiling",
            details={"key": key, "size": len(data), "max": _MAX_VALUE_BYTES},
        )
    return data


class InMemoryStorageFacade:
    """Process-local, non-durable blob store. Satisfies `StorageFacade`."""

    def __init__(self) -> None:
        self._blobs: dict[str, bytes] = {}

    def put(self, key: str, data: bytes) -> None:
        k = _validate_key(key)
        v = _validate_value(k, data)
        # `bytes` is already immutable; store as-is, no defensive copy needed.
        self._blobs[k] = v

    def get(self, key: str) -> bytes:
        k = _validate_key(key)
        try:
            return self._blobs[k]
        except KeyError as exc:
            raise AppError(
                ErrorCode.E_BE_NOT_FOUND,
                message="storage key not found",
                details={"key": k},
            ) from exc

    # --- test / lifecycle helpers (NOT part of the Protocol surface) ---

    def clear(self) -> None:
        """Reset stub state. For test isolation only; real adapters won't ship this."""
        self._blobs.clear()

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self._blobs)


__all__ = ["InMemoryStorageFacade"]
