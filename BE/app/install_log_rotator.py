"""Plan 90 Step 107 - installer log rotation.

Owning spec: ``spec/21-app/79-installer-retention-timing.md``
§"Manifest rotation" (added in this step).

Root cause guarded (one sentence): Step 106 wires every installer action
into ``install.json`` via append-only ``record_action``, so a long-lived
host that upgrades weekly will accumulate Actions unboundedly, eventually
turning every atomic manifest rewrite into a multi-MB fsync and making
``install-log-tail`` scan hundreds of KB just to answer "what did the
last install do?".

Design invariants
-----------------
1. **Rotation is post-append, not per-action.** The record CLI calls this
   after a successful ``record_action`` so the manifest stays bounded but
   we never risk losing an action row to a rotation crash: the archive is
   written FIRST, then the manifest is atomically rewritten with the
   surviving suffix. If the archive append fails, the manifest is left
   intact (still oversized) and the operator sees a loud AppError.
2. **Two-file rolling archive.** Overflow rows append to
   ``install-history.log`` (JSONL). When that file crosses
   ``archive_max_bytes`` it is atomically renamed to
   ``install-history.log.1``, replacing any prior ``.1``. We keep exactly
   one archive generation, so worst-case disk use is bounded to
   ``2 * archive_max_bytes + <manifest size>``.
3. **Pure I/O, typed errors.** Every failure raises ``AppError`` with a
   registered ``E_INSTALL_MANIFEST_*`` code so the record CLI can decide
   fatal-vs-non-fatal without stringly-matching.
4. **Deterministic ordering.** Archive entries are written in the same
   order they appear in ``install.json`` (oldest first). Readers combine
   ``.log.1`` (older) + ``.log`` (newer) + manifest suffix (newest) in
   that order so callers always see monotonic time.
5. **Idempotent.** Running rotation on an already-bounded manifest is a
   no-op and touches no files.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Final

from BE.app.install_manifest import InstallManifest, read_manifest, write_manifest
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

ARCHIVE_FILENAME: Final[str] = "install-history.log"
ARCHIVE_PREVIOUS_FILENAME: Final[str] = "install-history.log.1"
DEFAULT_MAX_ACTIONS: Final[int] = 500
DEFAULT_ARCHIVE_MAX_BYTES: Final[int] = 5 * 1024 * 1024


@dataclass(frozen=True)
class RotationOutcome:
    """Result of one ``rotate_manifest`` call.

    Fields use PascalCase to match the Universal Envelope convention so
    the CLI can surface this directly in ``Data`` without re-shaping.
    """

    IsRotated: bool
    ArchivedCount: int
    RemainingCount: int
    ArchivePath: str
    IsArchiveRolled: bool


def archive_path(install_root: Path) -> Path:
    return install_root / ARCHIVE_FILENAME


def previous_archive_path(install_root: Path) -> Path:
    return install_root / ARCHIVE_PREVIOUS_FILENAME


def _reject_bad_positive(name: str, value: int) -> None:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message=f"{name} must be a positive int, got {value!r}",
        )


def _rotate_via_primitive(
    install_root: Path, overflow_rows: list[dict[str, Any]], archive_max_bytes: int
) -> bool:
    """Delegate roll+append to the shared JSONL primitive with typed errors."""
    from BE.app import jsonl_rotator

    try:
        outcome = jsonl_rotator.append_and_roll(
            archive_path(install_root),
            previous_archive_path(install_root),
            overflow_rows,
            max_bytes=archive_max_bytes,
        )
    except OSError as exc:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_UNWRITABLE,
            message=f"cannot roll/append archive under {install_root}: {exc}",
            cause=exc,
        ) from exc
    except ValueError as exc:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message=str(exc),
            cause=exc,
        ) from exc
    return outcome.IsRolled


def _outcome_noop(install_root: Path, remaining: int) -> RotationOutcome:
    return RotationOutcome(
        IsRotated=False,
        ArchivedCount=0,
        RemainingCount=remaining,
        ArchivePath=str(archive_path(install_root)),
        IsArchiveRolled=False,
    )


def rotate_manifest(
    install_root: Path,
    *,
    max_actions: int = DEFAULT_MAX_ACTIONS,
    archive_max_bytes: int = DEFAULT_ARCHIVE_MAX_BYTES,
) -> RotationOutcome:
    """Move oldest overflow ``Actions`` from install.json to the archive.

    Archive-first, manifest-second: if the archive append fails, the
    manifest is left intact (still oversized) so no action row is lost.
    Roll + append are delegated to ``BE.app.jsonl_rotator`` (Step 108) so
    every JSONL audit stream uses the same durability contract.
    """
    _reject_bad_positive("max_actions", max_actions)
    _reject_bad_positive("archive_max_bytes", archive_max_bytes)
    manifest = read_manifest(install_root)
    if manifest is None:
        return _outcome_noop(install_root, 0)
    total = len(manifest.Actions)
    if total <= max_actions:
        return _outcome_noop(install_root, total)
    overflow = total - max_actions
    is_rolled = _rotate_via_primitive(
        install_root, list(manifest.Actions[:overflow]), archive_max_bytes
    )
    _rewrite_manifest_suffix(install_root, manifest, overflow)
    return RotationOutcome(
        IsRotated=True,
        ArchivedCount=overflow,
        RemainingCount=len(manifest.Actions),
        ArchivePath=str(archive_path(install_root)),
        IsArchiveRolled=is_rolled,
    )



def _rewrite_manifest_suffix(
    install_root: Path, manifest: InstallManifest, overflow: int
) -> None:
    manifest.Actions = list(manifest.Actions[overflow:])
    write_manifest(install_root, manifest)


def read_archive_entries(install_root: Path) -> list[dict[str, Any]]:
    """Return archived entries oldest-first: ``.log.1`` then ``.log``.

    Poison lines surface as ``{"_Raw": ..., "_ParseError": ...}`` so a
    corrupt tail can never silently truncate the audit view. Delegates
    to ``BE.app.jsonl_rotator.read_pair`` (Step 108) so read semantics
    stay in lock-step with the writer.
    """
    from BE.app import jsonl_rotator

    try:
        return jsonl_rotator.read_pair(
            archive_path(install_root), previous_archive_path(install_root)
        )
    except OSError as exc:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_UNWRITABLE,
            message=f"cannot read archive under {install_root}: {exc}",
            cause=exc,
        ) from exc



__all__ = [
    "ARCHIVE_FILENAME",
    "ARCHIVE_PREVIOUS_FILENAME",
    "DEFAULT_MAX_ACTIONS",
    "DEFAULT_ARCHIVE_MAX_BYTES",
    "RotationOutcome",
    "archive_path",
    "previous_archive_path",
    "rotate_manifest",
    "read_archive_entries",
]
