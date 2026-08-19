"""Plan 90 Step 105 - Install manifest reader/writer (`install.json`).

Owning spec: ``spec/21-app/79-installer-retention-timing.md``
§"Install manifest" (added in this step).

Root cause guarded (one sentence): Step 104 orchestrates installer actions
but writes no receipt, so a later ``--uninstall`` (run from a different
release, after new actions were added in Steps 106+) cannot know which
side-effects to reverse and will either miss cleanup or blindly retry
teardown against artefacts that were never installed.

Design invariants
-----------------
1. **PascalCase JSON on disk.** Matches the Universal Envelope convention
   so the manifest is grep-friendly with every other operator-facing file.
2. **SchemaVersion pinned.** Future migrations bump `SchemaVersion`; older
   readers refuse unknown versions with `E_INSTALL_MANIFEST_INVALID`
   instead of silently misinterpreting fields.
3. **Atomic writes.** `write_manifest`/`record_action` write to a sibling
   tmp file and `os.replace()` to swap in one step; a mid-write crash
   leaves the previous manifest intact.
4. **Append-only Actions log.** `record_action` never mutates prior rows.
   Uninstall records itself as a NEW entry with `Phase="uninstall"` so
   audit history is preserved.
5. **Pure I/O, no `print`.** Every failure raises `AppError` with a
   registered `E_INSTALL_MANIFEST_*` code so wrappers can render the
   Universal Envelope without stringly-matching.

Anchors
-------
- ``BE/app/installer_plan.py`` (Step 104): action names + criticality flags.
- ``spec/03-error-manage/02-error-architecture/05-response-envelope/``.
- ``spec/coding-guidelines/python.md``: typed boundaries, no bare except.
"""

from __future__ import annotations

import contextlib
import json
import os
import tempfile
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Final

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

MANIFEST_SCHEMA_VERSION: Final[int] = 2
MANIFEST_FILENAME: Final[str] = "install.json"

_ALLOWED_PLATFORMS: Final[frozenset[str]] = frozenset({"windows", "posix"})
_ALLOWED_PHASES: Final[frozenset[str]] = frozenset({"install", "uninstall"})


@dataclass(frozen=True)
class ManifestActionRecord:
    """One completed installer step, as persisted to `install.json`.

    Fields mirror ``BE/app/installer_plan.InstallerAction`` plus timing +
    outcome captured by the orchestrator after the step ran.
    """

    Name: str
    Script: str
    Args: tuple[str, ...]
    Phase: str
    StartedAt: str
    CompletedAt: str
    DurationMs: int
    ExitCode: int
    IsCritical: bool
    IsSuccess: bool


@dataclass(frozen=True)
class ManifestBinaryRecord:
    """One shipped PyInstaller binary as persisted to ``install.json``.

    Root cause guarded (one sentence): without a persisted SHA256 +
    signature record per shipped ``.exe``, a tampered or replaced binary
    on disk (swap, missing Authenticode signature, size mismatch) is
    invisible to ``install.json`` consumers and every uninstall assumes
    the on-disk file is still the one the release published.
    """

    Name: str
    ExeName: str
    Path: str
    Sha256: str
    SizeBytes: int
    Signed: bool
    CertThumbprint: str | None
    TimestampedAt: str | None
    RecordedAt: str


@dataclass
class InstallManifest:
    SchemaVersion: int
    AppVersion: str
    Platform: str
    InstalledAt: str
    LastUpdatedAt: str
    Actions: list[dict[str, Any]] = field(default_factory=list)
    Binaries: list[dict[str, Any]] = field(default_factory=list)


def _now_iso(now: datetime | None = None) -> str:
    d = now if now is not None else datetime.now(tz=UTC)
    if d.tzinfo is None:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message="timestamps must be timezone-aware (UTC)",
        )
    # `datetime.isoformat(timespec='seconds')` is deterministic and
    # human-legible; we intentionally do not include microseconds.
    return d.astimezone(UTC).isoformat(timespec="seconds")


def _validate_platform(platform: str) -> str:
    if platform not in _ALLOWED_PLATFORMS:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message=f"Platform must be one of {sorted(_ALLOWED_PLATFORMS)}, got {platform!r}",
        )
    return platform


def _validate_phase(phase: str) -> str:
    if phase not in _ALLOWED_PHASES:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message=f"Phase must be one of {sorted(_ALLOWED_PHASES)}, got {phase!r}",
        )
    return phase


def _validate_action(record: ManifestActionRecord) -> None:
    if not record.Name or not record.Name.strip():
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message="Action.Name must be a non-empty string",
        )
    if not record.Script or not record.Script.strip():
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message="Action.Script must be a non-empty string",
        )
    if not isinstance(record.Args, tuple):
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message=f"Action.Args must be a tuple, got {type(record.Args).__name__}",
        )
    for i, a in enumerate(record.Args):
        if not isinstance(a, str):
            raise AppError(
                code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
                message=f"Action.Args[{i}] must be str, got {type(a).__name__}",
            )
    _validate_phase(record.Phase)
    if isinstance(record.DurationMs, bool) or not isinstance(record.DurationMs, int):
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message="Action.DurationMs must be int",
        )
    if record.DurationMs < 0:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message=f"Action.DurationMs must be >= 0, got {record.DurationMs}",
        )
    if isinstance(record.ExitCode, bool) or not isinstance(record.ExitCode, int):
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message="Action.ExitCode must be int",
        )


def _manifest_path(install_root: Path) -> Path:
    return install_root / MANIFEST_FILENAME


def _atomic_write_json(target: Path, payload: dict[str, Any]) -> None:
    """Write JSON to `target` atomically via same-dir tmp + `os.replace`."""
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_UNWRITABLE,
            message=f"cannot create manifest dir {target.parent}: {exc}",
            cause=exc,
        ) from exc

    body = json.dumps(payload, indent=2, sort_keys=False, ensure_ascii=False)
    try:
        # Same-directory tmp so `os.replace` is atomic on POSIX + Windows.
        fd, tmp_str = tempfile.mkstemp(
            prefix=".install.json.", suffix=".tmp", dir=str(target.parent)
        )
        tmp_path = Path(tmp_str)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                f.write(body)
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp_path, target)
        except BaseException:
            # Best-effort cleanup of the tmp file on any failure path.
            with contextlib.suppress(OSError):
                tmp_path.unlink()
            raise
    except OSError as exc:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_UNWRITABLE,
            message=f"cannot write manifest {target}: {exc}",
            cause=exc,
        ) from exc


def _load_json(target: Path) -> dict[str, Any]:
    try:
        raw = target.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_MISSING,
            message=f"manifest not found at {target}",
            cause=exc,
        ) from exc
    except OSError as exc:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_UNWRITABLE,
            message=f"cannot read manifest {target}: {exc}",
            cause=exc,
        ) from exc
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message=f"manifest {target} is not valid JSON: {exc.msg}",
            cause=exc,
        ) from exc
    if not isinstance(data, dict):
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message=f"manifest root must be an object, got {type(data).__name__}",
        )
    return data


_SUPPORTED_SCHEMA_VERSIONS: Final[frozenset[int]] = frozenset({1, 2})


def _coerce_manifest(data: dict[str, Any]) -> InstallManifest:
    required = ("SchemaVersion", "AppVersion", "Platform", "InstalledAt", "LastUpdatedAt", "Actions")
    for key in required:
        if key not in data:
            raise AppError(
                code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
                message=f"manifest missing required key {key!r}",
            )
    schema = data["SchemaVersion"]
    if schema not in _SUPPORTED_SCHEMA_VERSIONS:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message=(
                f"unsupported SchemaVersion {schema!r}; "
                f"this build understands {sorted(_SUPPORTED_SCHEMA_VERSIONS)}"
            ),
        )
    if not isinstance(data["Actions"], list):
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message="manifest.Actions must be a list",
        )
    # v1 → v2 forward migration: Binaries defaults to []. We keep the
    # on-disk SchemaVersion at 1 until the next write, at which point
    # write_manifest normalises to MANIFEST_SCHEMA_VERSION. This means
    # a read-only inspection never rewrites the file.
    binaries_raw = data.get("Binaries", [])
    if not isinstance(binaries_raw, list):
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message="manifest.Binaries must be a list",
        )
    _validate_platform(str(data["Platform"]))
    return InstallManifest(
        SchemaVersion=int(schema),
        AppVersion=str(data["AppVersion"]),
        Platform=str(data["Platform"]),
        InstalledAt=str(data["InstalledAt"]),
        LastUpdatedAt=str(data["LastUpdatedAt"]),
        Actions=list(data["Actions"]),
        Binaries=list(binaries_raw),
    )


def read_manifest(install_root: Path) -> InstallManifest | None:
    """Return the manifest at `install_root/install.json`, or None if absent.

    Raises `E_INSTALL_MANIFEST_INVALID` if the file exists but is malformed
    - we never silently return None for corruption, because that would let
    an uninstall run against an unknown state.
    """
    target = _manifest_path(install_root)
    if not target.exists():
        return None
    return _coerce_manifest(_load_json(target))


def read_manifest_strict(install_root: Path) -> InstallManifest:
    """Like `read_manifest` but raises `E_INSTALL_MANIFEST_MISSING` if absent."""
    m = read_manifest(install_root)
    if m is None:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_MISSING,
            message=f"manifest not found at {_manifest_path(install_root)}",
        )
    return m


def write_manifest(install_root: Path, manifest: InstallManifest) -> None:
    """Atomically write `manifest` to `install_root/install.json`.

    Writes always normalise ``SchemaVersion`` to the latest supported
    version (currently v2). A v1 manifest read then written is upgraded
    on disk; the ``Binaries`` field is preserved (empty when unset).
    """
    if manifest.SchemaVersion not in _SUPPORTED_SCHEMA_VERSIONS:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message=(
                f"SchemaVersion must be one of {sorted(_SUPPORTED_SCHEMA_VERSIONS)}, "
                f"got {manifest.SchemaVersion}"
            ),
        )
    _validate_platform(manifest.Platform)
    payload: dict[str, Any] = {
        "SchemaVersion": MANIFEST_SCHEMA_VERSION,
        "AppVersion": manifest.AppVersion,
        "Platform": manifest.Platform,
        "InstalledAt": manifest.InstalledAt,
        "LastUpdatedAt": manifest.LastUpdatedAt,
        "Actions": list(manifest.Actions),
        "Binaries": list(manifest.Binaries),
    }
    _atomic_write_json(_manifest_path(install_root), payload)


def init_manifest(
    install_root: Path,
    *,
    app_version: str,
    platform: str,
    now: datetime | None = None,
) -> InstallManifest:
    """Create a fresh empty manifest and persist it. Idempotent-safe: refuses
    to overwrite an existing manifest so operators cannot accidentally
    truncate audit history."""
    if _manifest_path(install_root).exists():
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message=f"manifest already exists at {_manifest_path(install_root)}",
        )
    ts = _now_iso(now)
    m = InstallManifest(
        SchemaVersion=MANIFEST_SCHEMA_VERSION,
        AppVersion=str(app_version),
        Platform=_validate_platform(platform),
        InstalledAt=ts,
        LastUpdatedAt=ts,
        Actions=[],
    )
    write_manifest(install_root, m)
    return m


def record_action(
    install_root: Path,
    action: ManifestActionRecord,
    *,
    app_version: str | None = None,
    platform: str | None = None,
    now: datetime | None = None,
) -> InstallManifest:
    """Append `action` to the manifest at `install_root`.

    If the manifest does not yet exist, `app_version` + `platform` MUST be
    supplied so we can create one. If the manifest exists, those two
    arguments are ignored - the AppVersion pinned at install time is the
    source of truth.
    """
    _validate_action(action)
    ts = _now_iso(now)

    existing = read_manifest(install_root)
    if existing is None:
        if app_version is None or platform is None:
            raise AppError(
                code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
                message=(
                    "manifest does not exist; app_version and platform "
                    "are required on first record_action call"
                ),
            )
        existing = InstallManifest(
            SchemaVersion=MANIFEST_SCHEMA_VERSION,
            AppVersion=str(app_version),
            Platform=_validate_platform(platform),
            InstalledAt=ts,
            LastUpdatedAt=ts,
            Actions=[],
        )

    entry = asdict(action)
    # `Args` is a tuple in memory; JSON has no tuples so materialise as list.
    entry["Args"] = list(action.Args)
    existing.Actions.append(entry)
    existing.LastUpdatedAt = ts
    write_manifest(install_root, existing)
    return existing


def latest_action(manifest: InstallManifest, name: str) -> dict[str, Any] | None:
    """Return the most recent recorded entry for `name`, or None."""
    for entry in reversed(manifest.Actions):
        if entry.get("Name") == name:
            return entry
    return None


def _validate_binary(record: ManifestBinaryRecord) -> None:
    if not record.Name or not record.Name.strip():
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message="Binary.Name must be a non-empty string",
        )
    if not record.ExeName or not record.ExeName.strip():
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message="Binary.ExeName must be a non-empty string",
        )
    if not isinstance(record.Sha256, str) or len(record.Sha256) != 64:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message="Binary.Sha256 must be a 64-char hex digest",
        )
    try:
        int(record.Sha256, 16)
    except ValueError as exc:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message="Binary.Sha256 must be lowercase hex",
            cause=exc,
        ) from exc
    if isinstance(record.SizeBytes, bool) or not isinstance(record.SizeBytes, int):
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message="Binary.SizeBytes must be int",
        )
    if record.SizeBytes < 0:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message=f"Binary.SizeBytes must be >= 0, got {record.SizeBytes}",
        )
    if not isinstance(record.Signed, bool):
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message="Binary.Signed must be bool",
        )
    if record.Signed and not record.CertThumbprint:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message="Binary.CertThumbprint required when Signed=True",
        )


def record_binary(
    install_root: Path,
    binary: ManifestBinaryRecord,
    *,
    app_version: str | None = None,
    platform: str | None = None,
    now: datetime | None = None,
) -> InstallManifest:
    """Upsert `binary` in the manifest at `install_root`.

    The manifest keeps ONE row per ``Name``; a re-install replaces the
    prior row so the file always reflects the currently-installed exe
    (SHA256, size, signature). Prior action history is preserved.
    """
    _validate_binary(binary)
    ts = _now_iso(now)

    existing = read_manifest(install_root)
    if existing is None:
        if app_version is None or platform is None:
            raise AppError(
                code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
                message=(
                    "manifest does not exist; app_version and platform "
                    "are required on first record_binary call"
                ),
            )
        existing = InstallManifest(
            SchemaVersion=MANIFEST_SCHEMA_VERSION,
            AppVersion=str(app_version),
            Platform=_validate_platform(platform),
            InstalledAt=ts,
            LastUpdatedAt=ts,
            Actions=[],
            Binaries=[],
        )

    entry = asdict(binary)
    existing.Binaries = [b for b in existing.Binaries if b.get("Name") != binary.Name]
    existing.Binaries.append(entry)
    existing.LastUpdatedAt = ts
    write_manifest(install_root, existing)
    return existing


def latest_binary(manifest: InstallManifest, name: str) -> dict[str, Any] | None:
    """Return the recorded binary row for `name`, or None."""
    for entry in reversed(manifest.Binaries):
        if entry.get("Name") == name:
            return entry
    return None


def installed_action_names(manifest: InstallManifest) -> list[str]:
    """Names currently considered installed: last entry per name was a
    successful install-phase action. Used by uninstall planners to skip
    steps whose install never completed."""
    latest: dict[str, dict[str, Any]] = {}
    for entry in manifest.Actions:
        name = entry.get("Name")
        if isinstance(name, str):
            latest[name] = entry
    out: list[str] = []
    for name, entry in latest.items():
        if entry.get("Phase") == "install" and entry.get("IsSuccess") is True:
            out.append(name)
    return sorted(out)


__all__ = [
    "MANIFEST_SCHEMA_VERSION",
    "MANIFEST_FILENAME",
    "ManifestActionRecord",
    "ManifestBinaryRecord",
    "InstallManifest",
    "read_manifest",
    "read_manifest_strict",
    "write_manifest",
    "init_manifest",
    "record_action",
    "record_binary",
    "latest_action",
    "latest_binary",
    "installed_action_names",
]
