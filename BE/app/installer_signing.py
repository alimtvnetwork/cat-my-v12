"""Plan 90 Step 118 - Binary signature + SHA256 helper for install manifest.

Owning spec: ``spec/21-app/77-cli-powershell-and-release.md``
§"Release artefacts" (SHA256SUMS.txt + optional Authenticode signing).

Root cause guarded (one sentence): without a persisted SHA256 +
signature record per shipped ``.exe``, a tampered or replaced binary on
disk (swap, missing Authenticode signature, size mismatch) is invisible
to ``install.json`` consumers and every uninstall assumes the on-disk
file is still the one the release published.

Design invariants
-----------------
1. **Pure function.** ``compute_binary_signature`` takes a path and
   optional signing metadata; performs one streaming SHA256 pass; no
   network, no subprocess. Authenticode signing itself is done out of
   band (on the signed Windows runner); this module only *records* the
   result.
2. **Streaming digest.** Reads the file in 1 MiB chunks so a 200 MiB
   frozen exe does not spike memory.
3. **Deterministic timestamp.** ``RecordedAt`` uses UTC ISO-8601 with
   seconds precision, matching ``install.json`` convention.
4. **AppError on failure.** Missing exe raises
   ``E_INSTALL_MANIFEST_MISSING``; unreadable raises
   ``E_INSTALL_MANIFEST_UNWRITABLE`` (reused - the manifest surface owns
   these codes and this helper feeds it directly).

Anchors
-------
- ``BE/app/install_manifest.ManifestBinaryRecord`` (Plan 90 Step 118).
- ``BE/app/installer_binaries.BINARIES`` (Plan 90 Step 117).
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Final

from BE.app.install_manifest import ManifestBinaryRecord
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_CHUNK: Final[int] = 1024 * 1024  # 1 MiB


def _now_iso(now: datetime | None = None) -> str:
    d = now if now is not None else datetime.now(tz=timezone.utc)
    if d.tzinfo is None:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message="timestamps must be timezone-aware (UTC)",
        )
    return d.astimezone(timezone.utc).isoformat(timespec="seconds")


def sha256_of_file(path: Path) -> tuple[str, int]:
    """Stream ``path`` and return ``(sha256_hex, size_bytes)``.

    Raises ``E_INSTALL_MANIFEST_MISSING`` if the file is absent so
    callers can distinguish a missing binary from a corrupted one.
    """
    if not path.exists():
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_MISSING,
            message=f"binary not found at {path}",
        )
    h = hashlib.sha256()
    size = 0
    try:
        with path.open("rb") as f:
            while True:
                chunk = f.read(_CHUNK)
                if not chunk:
                    break
                h.update(chunk)
                size += len(chunk)
    except OSError as exc:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_UNWRITABLE,
            message=f"cannot read binary {path}: {exc}",
            cause=exc,
        ) from exc
    return h.hexdigest(), size


def compute_binary_signature(
    *,
    name: str,
    exe_name: str,
    exe_path: Path,
    signed: bool = False,
    cert_thumbprint: str | None = None,
    timestamped_at: str | None = None,
    now: datetime | None = None,
) -> ManifestBinaryRecord:
    """Produce a ``ManifestBinaryRecord`` for the exe at ``exe_path``.

    ``signed=True`` requires ``cert_thumbprint``; the manifest layer
    re-validates that invariant so a caller cannot skip it silently.
    ``timestamped_at`` is the RFC 3161 countersignature timestamp when
    the exe was signed with a timestamping service, else ``None``.
    """
    digest, size = sha256_of_file(exe_path)
    return ManifestBinaryRecord(
        Name=name,
        ExeName=exe_name,
        Path=str(exe_path).replace("\\", "/"),
        Sha256=digest,
        SizeBytes=size,
        Signed=bool(signed),
        CertThumbprint=cert_thumbprint,
        TimestampedAt=timestamped_at,
        RecordedAt=_now_iso(now),
    )


__all__ = ["sha256_of_file", "compute_binary_signature"]
