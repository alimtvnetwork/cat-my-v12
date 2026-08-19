"""Plan 90 Step 105 - Install manifest tests.

Owning module: ``BE/app/install_manifest.py``.

Every invariant listed in the module docstring is pinned here:

- SchemaVersion pinned + rejects unknown versions
- Atomic writes (no leftover tmp on success; no truncation on read-only dir)
- Append-only Actions log (record_action never mutates prior rows)
- init_manifest refuses overwrite
- Validation surface returns registered E_INSTALL_MANIFEST_* codes
- read_manifest returns None on missing; read_manifest_strict raises
- installed_action_names respects Phase + IsSuccess of the latest entry per Name
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

import pytest

from BE.app.install_manifest import (
    MANIFEST_FILENAME,
    MANIFEST_SCHEMA_VERSION,
    InstallManifest,
    ManifestActionRecord,
    init_manifest,
    installed_action_names,
    latest_action,
    read_manifest,
    read_manifest_strict,
    record_action,
    write_manifest,
)
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _rec(
    name: str = "db-bootstrap",
    *,
    phase: str = "install",
    exit_code: int = 0,
    is_success: bool = True,
    is_critical: bool = True,
    args: tuple[str, ...] = (),
    script: str = "bin/db-bootstrap.py",
) -> ManifestActionRecord:
    return ManifestActionRecord(
        Name=name,
        Script=script,
        Args=args,
        Phase=phase,
        StartedAt="2026-07-21T10:00:00+00:00",
        CompletedAt="2026-07-21T10:00:01+00:00",
        DurationMs=1000,
        ExitCode=exit_code,
        IsCritical=is_critical,
        IsSuccess=is_success,
    )


def test_init_manifest_creates_expected_shape(tmp_path: Path) -> None:
    m = init_manifest(
        tmp_path, app_version="v4.46.0", platform="posix",
        now=datetime(2026, 7, 21, 10, 0, 0, tzinfo=UTC),
    )
    assert m.SchemaVersion == MANIFEST_SCHEMA_VERSION
    assert m.AppVersion == "v4.46.0"
    assert m.Platform == "posix"
    assert m.InstalledAt == "2026-07-21T10:00:00+00:00"
    assert m.LastUpdatedAt == m.InstalledAt
    assert m.Actions == []

    on_disk = json.loads((tmp_path / MANIFEST_FILENAME).read_text())
    assert on_disk["SchemaVersion"] == MANIFEST_SCHEMA_VERSION
    assert on_disk["Platform"] == "posix"
    assert on_disk["Actions"] == []


def test_init_manifest_refuses_overwrite(tmp_path: Path) -> None:
    init_manifest(tmp_path, app_version="v1", platform="windows")
    with pytest.raises(AppError) as exc:
        init_manifest(tmp_path, app_version="v2", platform="windows")
    assert exc.value.code is ErrorCode.E_INSTALL_MANIFEST_INVALID


def test_init_manifest_rejects_unknown_platform(tmp_path: Path) -> None:
    with pytest.raises(AppError) as exc:
        init_manifest(tmp_path, app_version="v1", platform="macos-cli")
    assert exc.value.code is ErrorCode.E_INSTALL_MANIFEST_INVALID


def test_read_manifest_returns_none_when_missing(tmp_path: Path) -> None:
    assert read_manifest(tmp_path) is None


def test_read_manifest_strict_raises_when_missing(tmp_path: Path) -> None:
    with pytest.raises(AppError) as exc:
        read_manifest_strict(tmp_path)
    assert exc.value.code is ErrorCode.E_INSTALL_MANIFEST_MISSING


def test_read_manifest_rejects_malformed_json(tmp_path: Path) -> None:
    (tmp_path / MANIFEST_FILENAME).write_text("{not json")
    with pytest.raises(AppError) as exc:
        read_manifest(tmp_path)
    assert exc.value.code is ErrorCode.E_INSTALL_MANIFEST_INVALID


def test_read_manifest_rejects_non_object_root(tmp_path: Path) -> None:
    (tmp_path / MANIFEST_FILENAME).write_text("[]")
    with pytest.raises(AppError) as exc:
        read_manifest(tmp_path)
    assert exc.value.code is ErrorCode.E_INSTALL_MANIFEST_INVALID


def test_read_manifest_rejects_unknown_schema_version(tmp_path: Path) -> None:
    (tmp_path / MANIFEST_FILENAME).write_text(json.dumps({
        "SchemaVersion": 99, "AppVersion": "v", "Platform": "posix",
        "InstalledAt": "t", "LastUpdatedAt": "t", "Actions": [],
    }))
    with pytest.raises(AppError) as exc:
        read_manifest(tmp_path)
    assert exc.value.code is ErrorCode.E_INSTALL_MANIFEST_INVALID


def test_read_manifest_rejects_missing_required_key(tmp_path: Path) -> None:
    (tmp_path / MANIFEST_FILENAME).write_text(json.dumps({
        "SchemaVersion": 1, "AppVersion": "v", "Platform": "posix",
        "InstalledAt": "t", "Actions": [],
    }))
    with pytest.raises(AppError) as exc:
        read_manifest(tmp_path)
    assert exc.value.code is ErrorCode.E_INSTALL_MANIFEST_INVALID


def test_read_manifest_rejects_non_list_actions(tmp_path: Path) -> None:
    (tmp_path / MANIFEST_FILENAME).write_text(json.dumps({
        "SchemaVersion": 1, "AppVersion": "v", "Platform": "posix",
        "InstalledAt": "t", "LastUpdatedAt": "t", "Actions": {},
    }))
    with pytest.raises(AppError) as exc:
        read_manifest(tmp_path)
    assert exc.value.code is ErrorCode.E_INSTALL_MANIFEST_INVALID


def test_record_action_creates_manifest_when_absent(tmp_path: Path) -> None:
    m = record_action(
        tmp_path, _rec(), app_version="v4.46.0", platform="posix",
        now=datetime(2026, 7, 21, 11, 0, 0, tzinfo=UTC),
    )
    assert len(m.Actions) == 1
    assert m.Actions[0]["Name"] == "db-bootstrap"
    assert m.Actions[0]["Args"] == []  # tuple -> list on disk
    assert m.InstalledAt == "2026-07-21T11:00:00+00:00"
    reloaded = read_manifest_strict(tmp_path)
    assert reloaded.AppVersion == "v4.46.0"


def test_record_action_requires_bootstrap_args_on_first_call(tmp_path: Path) -> None:
    with pytest.raises(AppError) as exc:
        record_action(tmp_path, _rec())
    assert exc.value.code is ErrorCode.E_INSTALL_MANIFEST_INVALID


def test_record_action_appends_and_updates_timestamp(tmp_path: Path) -> None:
    init_manifest(
        tmp_path, app_version="v1", platform="posix",
        now=datetime(2026, 7, 21, 9, 0, 0, tzinfo=UTC),
    )
    record_action(
        tmp_path, _rec("db-bootstrap"),
        now=datetime(2026, 7, 21, 10, 0, 0, tzinfo=UTC),
    )
    record_action(
        tmp_path, _rec("retention-timer", script="scripts/systemd/install-retention-timer.sh",
                        args=("--install",)),
        now=datetime(2026, 7, 21, 10, 5, 0, tzinfo=UTC),
    )
    m = read_manifest_strict(tmp_path)
    assert [a["Name"] for a in m.Actions] == ["db-bootstrap", "retention-timer"]
    assert m.Actions[1]["Args"] == ["--install"]
    assert m.InstalledAt == "2026-07-21T09:00:00+00:00"
    assert m.LastUpdatedAt == "2026-07-21T10:05:00+00:00"


def test_record_action_never_mutates_prior_entries(tmp_path: Path) -> None:
    init_manifest(tmp_path, app_version="v1", platform="posix")
    record_action(tmp_path, _rec("db-bootstrap", exit_code=0))
    record_action(tmp_path, _rec("db-bootstrap", phase="uninstall", exit_code=0))
    m = read_manifest_strict(tmp_path)
    assert len(m.Actions) == 2
    assert m.Actions[0]["Phase"] == "install"
    assert m.Actions[1]["Phase"] == "uninstall"


def test_record_action_rejects_empty_name(tmp_path: Path) -> None:
    init_manifest(tmp_path, app_version="v1", platform="posix")
    with pytest.raises(AppError) as exc:
        record_action(tmp_path, _rec(name="   "))
    assert exc.value.code is ErrorCode.E_INSTALL_MANIFEST_INVALID


def test_record_action_rejects_bad_phase(tmp_path: Path) -> None:
    init_manifest(tmp_path, app_version="v1", platform="posix")
    with pytest.raises(AppError) as exc:
        record_action(tmp_path, _rec(phase="upgrade"))
    assert exc.value.code is ErrorCode.E_INSTALL_MANIFEST_INVALID


def test_record_action_rejects_non_str_arg(tmp_path: Path) -> None:
    init_manifest(tmp_path, app_version="v1", platform="posix")
    bad = ManifestActionRecord(
        Name="x", Script="s.sh", Args=("ok", 123),  # type: ignore[arg-type]
        Phase="install", StartedAt="t", CompletedAt="t",
        DurationMs=0, ExitCode=0, IsCritical=True, IsSuccess=True,
    )
    with pytest.raises(AppError) as exc:
        record_action(tmp_path, bad)
    assert exc.value.code is ErrorCode.E_INSTALL_MANIFEST_INVALID


def test_record_action_rejects_bool_duration(tmp_path: Path) -> None:
    init_manifest(tmp_path, app_version="v1", platform="posix")
    bad = ManifestActionRecord(
        Name="x", Script="s.sh", Args=(),
        Phase="install", StartedAt="t", CompletedAt="t",
        DurationMs=True,  # type: ignore[arg-type]
        ExitCode=0, IsCritical=True, IsSuccess=True,
    )
    with pytest.raises(AppError) as exc:
        record_action(tmp_path, bad)
    assert exc.value.code is ErrorCode.E_INSTALL_MANIFEST_INVALID


def test_record_action_rejects_negative_duration(tmp_path: Path) -> None:
    init_manifest(tmp_path, app_version="v1", platform="posix")
    bad = ManifestActionRecord(
        Name="x", Script="s.sh", Args=(),
        Phase="install", StartedAt="t", CompletedAt="t",
        DurationMs=-1, ExitCode=0, IsCritical=True, IsSuccess=True,
    )
    with pytest.raises(AppError) as exc:
        record_action(tmp_path, bad)
    assert exc.value.code is ErrorCode.E_INSTALL_MANIFEST_INVALID


def test_atomic_write_leaves_no_tmp_files(tmp_path: Path) -> None:
    init_manifest(tmp_path, app_version="v1", platform="posix")
    record_action(tmp_path, _rec())
    leftovers = [p.name for p in tmp_path.iterdir() if p.name.startswith(".install.json.")]
    assert leftovers == []


def test_atomic_write_preserves_previous_on_failure(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    init_manifest(tmp_path, app_version="v1", platform="posix")
    record_action(tmp_path, _rec("db-bootstrap"))
    original = (tmp_path / MANIFEST_FILENAME).read_bytes()


    def boom(src: str, dst: str) -> None:  # type: ignore[no-redef]
        raise OSError("simulated replace failure")

    monkeypatch.setattr("BE.app.install_manifest.os.replace", boom)
    with pytest.raises(AppError) as exc:
        record_action(tmp_path, _rec("retention-timer", script="s.sh"))
    assert exc.value.code is ErrorCode.E_INSTALL_MANIFEST_UNWRITABLE

    # Previous manifest is intact, byte-for-byte.
    assert (tmp_path / MANIFEST_FILENAME).read_bytes() == original
    # No leftover tmp files after the failed write.
    leftovers = [p.name for p in tmp_path.iterdir() if p.name.startswith(".install.json.")]
    assert leftovers == []
    # Restore for hygiene (monkeypatch will undo, but keep symbol referenced).
    assert True


def test_write_manifest_rejects_bad_schema(tmp_path: Path) -> None:
    m = InstallManifest(
        SchemaVersion=99, AppVersion="v", Platform="posix",
        InstalledAt="t", LastUpdatedAt="t", Actions=[],
    )
    with pytest.raises(AppError) as exc:
        write_manifest(tmp_path, m)
    assert exc.value.code is ErrorCode.E_INSTALL_MANIFEST_INVALID


def test_latest_action_returns_most_recent_entry(tmp_path: Path) -> None:
    init_manifest(tmp_path, app_version="v1", platform="posix")
    record_action(tmp_path, _rec("retention-timer", exit_code=0))
    record_action(tmp_path, _rec("retention-timer", phase="uninstall", exit_code=0))
    m = read_manifest_strict(tmp_path)
    entry = latest_action(m, "retention-timer")
    assert entry is not None
    assert entry["Phase"] == "uninstall"
    assert latest_action(m, "does-not-exist") is None


def test_installed_action_names_reflects_last_install_success(tmp_path: Path) -> None:
    init_manifest(tmp_path, app_version="v1", platform="posix")
    record_action(tmp_path, _rec("db-bootstrap", is_success=True))
    record_action(tmp_path, _rec("retention-timer", is_success=True))
    # Failed install: should NOT be reported as installed.
    record_action(tmp_path, _rec("service", exit_code=1, is_success=False))
    m = read_manifest_strict(tmp_path)
    assert installed_action_names(m) == ["db-bootstrap", "retention-timer"]

    # Uninstalling retention-timer removes it from the installed set.
    record_action(tmp_path, _rec("retention-timer", phase="uninstall"))
    m2 = read_manifest_strict(tmp_path)
    assert installed_action_names(m2) == ["db-bootstrap"]


def test_now_iso_rejects_naive_datetime(tmp_path: Path) -> None:
    with pytest.raises(AppError) as exc:
        init_manifest(
            tmp_path, app_version="v1", platform="posix",
            now=datetime(2026, 7, 21, 10, 0, 0),  # tz-naive
        )
    assert exc.value.code is ErrorCode.E_INSTALL_MANIFEST_INVALID
