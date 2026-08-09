"""Plan 90 Step 13 tests - per-OS defaults, env override, override arg, ensure."""

from __future__ import annotations

from pathlib import Path

import pytest

from BE.cli.common.paths import APP_DIR_NAME, ResolvedPaths, resolve_all, resolve_root
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def test_linux_default_uses_xdg_state_home() -> None:
    p = resolve_root("log", env={"XDG_STATE_HOME": "/xdg"}, platform="linux")
    assert p == Path("/xdg") / APP_DIR_NAME / "logs"


def test_linux_default_falls_back_to_home() -> None:
    p = resolve_root("db", env={"HOME": "/home/u"}, platform="linux")
    assert p == Path("/home/u/.local/state") / APP_DIR_NAME / "db"


def test_linux_missing_home_raises_unsupported_host() -> None:
    with pytest.raises(AppError) as ei:
        resolve_root("log", env={}, platform="linux")
    assert ei.value.code is ErrorCode.E_CLI_UNSUPPORTED_HOST


def test_windows_default_uses_localappdata() -> None:
    p = resolve_root("ipc", env={"LOCALAPPDATA": r"C:\Users\me\AppData\Local"}, platform="win32")
    assert p == Path(r"C:\Users\me\AppData\Local") / APP_DIR_NAME / "ipc"


def test_windows_falls_back_to_appdata_then_userprofile() -> None:
    p = resolve_root("config", env={"APPDATA": r"C:\A"}, platform="win32")
    assert p == Path(r"C:\A") / APP_DIR_NAME / "config"

    p = resolve_root("config", env={"USERPROFILE": "/u/me"}, platform="win32")
    assert p == Path("/u/me/AppData/Local") / APP_DIR_NAME / "config"


def test_windows_no_home_raises_unsupported_host() -> None:
    with pytest.raises(AppError) as ei:
        resolve_root("log", env={}, platform="win32")
    assert ei.value.code is ErrorCode.E_CLI_UNSUPPORTED_HOST


def test_darwin_uses_library_application_support() -> None:
    p = resolve_root("data", env={"HOME": "/Users/me"}, platform="darwin")
    assert p == Path("/Users/me/Library/Application Support") / APP_DIR_NAME / "data"


def test_env_override_wins_over_os_default() -> None:
    p = resolve_root(
        "log",
        env={"APP_LOG_ROOT": "/custom/logs", "HOME": "/home/u"},
        platform="linux",
    )
    assert p == Path("/custom/logs")


def test_explicit_override_wins_over_env() -> None:
    p = resolve_root(
        "log",
        override="/from/flag",
        env={"APP_LOG_ROOT": "/from/env", "HOME": "/h"},
        platform="linux",
    )
    assert p == Path("/from/flag")


def test_unknown_kind_raises_preflight() -> None:
    with pytest.raises(AppError) as ei:
        resolve_root("nope", env={"HOME": "/h"}, platform="linux")  # type: ignore[arg-type]
    assert ei.value.code is ErrorCode.E_CLI_PREFLIGHT_FAILED


def test_resolve_all_returns_all_five(tmp_path: Path) -> None:
    r = resolve_all(env={"HOME": str(tmp_path)}, platform="linux")
    assert isinstance(r, ResolvedPaths)
    root = tmp_path / ".local" / "state" / APP_DIR_NAME
    assert r.log == root / "logs"
    assert r.db == root / "db"
    assert r.ipc == root / "ipc"
    assert r.config == root / "config"
    assert r.data == root / "data"


def test_resolve_all_ensure_creates_directories(tmp_path: Path) -> None:
    r = resolve_all(env={"HOME": str(tmp_path)}, platform="linux", ensure=True)
    assert r.log.is_dir()
    assert r.ipc.is_dir()
    assert r.db.is_dir()


def test_ensure_on_unwritable_parent_raises(tmp_path: Path) -> None:
    # Point log at a path whose parent is a regular file, so mkdir fails.
    blocker = tmp_path / "not-a-dir"
    blocker.write_text("x")
    with pytest.raises(AppError) as ei:
        resolve_root("log", override=blocker / "child", env={"HOME": "/h"}, platform="linux", ensure=True)
    assert ei.value.code is ErrorCode.E_LOG_ROOT_UNWRITABLE


def test_resolved_paths_is_frozen(tmp_path: Path) -> None:
    r = resolve_all(env={"HOME": str(tmp_path)}, platform="linux")
    with pytest.raises((AttributeError, TypeError)):
        r.log = Path("/nope")  # type: ignore[misc]


def test_override_from_cli_config_pathlike(tmp_path: Path) -> None:
    r = resolve_all(
        overrides={"log": tmp_path / "L", "ipc": tmp_path / "I"},
        env={"HOME": str(tmp_path)},
        platform="linux",
    )
    assert r.log == tmp_path / "L"
    assert r.ipc == tmp_path / "I"
    # non-overridden roots still fall back to OS default
    assert r.db == tmp_path / ".local/state" / APP_DIR_NAME / "db"
