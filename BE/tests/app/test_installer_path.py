"""Plan 90 Step 126 - unit tests for `BE.app.installer_path` + CLI.

Coverage
--------
- ``plan_link_actions``: pure path derivation, Windows vs POSIX, arg validation.
- ``apply_link_install`` POSIX: symlink materialized, idempotent replace.
- ``apply_link_install`` Windows: ``.cmd`` shim body + ``.exe`` source suffix.
- ``apply_link_install``: missing source -> ``E_INSTALL_PATH_LINK_FAILED``.
- ``apply_link_uninstall``: idempotent, refuses to remove a directory.
- CLI: happy path exit 0, missing source exit 30, unknown platform exit 2.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

from BE.app.installer_binaries import BINARIES
from BE.app.installer_path import (
    LinkPlatform,
    apply_link_install,
    apply_link_uninstall,
    default_link_dir,
    plan_link_actions,
)
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

REPO_ROOT = Path(__file__).resolve().parents[3]
CLI = REPO_ROOT / "bin" / "install-path-link.py"


def _touch_windows_binaries(binaries_dir: Path) -> None:
    binaries_dir.mkdir(parents=True, exist_ok=True)
    for b in BINARIES:
        (binaries_dir / f"{b.ExeName}.exe").write_text("MZ")


def _touch_posix_binaries(binaries_dir: Path) -> None:
    binaries_dir.mkdir(parents=True, exist_ok=True)
    for b in BINARIES:
        p = binaries_dir / b.ExeName
        p.write_text("#!/bin/sh\nexit 0\n")
        p.chmod(0o755)


# --- plan_link_actions --------------------------------------------------


def test_plan_windows_uses_cmd_and_exe(tmp_path: Path) -> None:
    actions = plan_link_actions(
        platform=LinkPlatform.WINDOWS,
        binaries_dir=tmp_path / "rel",
        link_dir=tmp_path / "bin",
    )
    assert [a.Name for a in actions] == [b.Name for b in BINARIES]
    for a, b in zip(actions, BINARIES, strict=True):
        assert a.Source.name == f"{b.ExeName}.exe"
        assert a.LinkPath.name == f"{b.ExeName}.cmd"


def test_plan_posix_uses_symlink_names(tmp_path: Path) -> None:
    actions = plan_link_actions(
        platform=LinkPlatform.POSIX,
        binaries_dir=tmp_path / "rel",
        link_dir=tmp_path / "bin",
    )
    for a, b in zip(actions, BINARIES, strict=True):
        assert a.Source.name == b.ExeName
        assert a.LinkPath.name == b.ExeName


def test_plan_rejects_non_path(tmp_path: Path) -> None:
    with pytest.raises(AppError) as exc:
        plan_link_actions(
            platform=LinkPlatform.POSIX,
            binaries_dir="not/a/path",  # type: ignore[arg-type]
            link_dir=tmp_path,
        )
    assert exc.value.code is ErrorCode.E_CLI_USAGE


def test_default_link_dir_windows_uses_localappdata(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path / "LocalAppData"))
    d = default_link_dir(LinkPlatform.WINDOWS)
    assert d == tmp_path / "LocalAppData" / "vision-app" / "bin"


def test_default_link_dir_posix_under_home(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setenv("HOME", str(tmp_path))
    d = default_link_dir(LinkPlatform.POSIX)
    assert d == tmp_path / ".local" / "share" / "vision-app" / "bin"


# --- apply_link_install -------------------------------------------------


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX symlink semantics")
def test_install_posix_creates_symlink_and_is_idempotent(tmp_path: Path) -> None:
    rel = tmp_path / "rel"
    link = tmp_path / "bin"
    _touch_posix_binaries(rel)

    actions = plan_link_actions(
        platform=LinkPlatform.POSIX, binaries_dir=rel, link_dir=link
    )
    apply_link_install(actions, LinkPlatform.POSIX)
    for a in actions:
        assert a.LinkPath.is_symlink()
        assert os.readlink(a.LinkPath) == str(a.Source)

    # Re-run must replace atomically without error.
    apply_link_install(actions, LinkPlatform.POSIX)
    for a in actions:
        assert a.LinkPath.is_symlink()


def test_install_windows_writes_cmd_shim(tmp_path: Path) -> None:
    rel = tmp_path / "rel"
    link = tmp_path / "bin"
    _touch_windows_binaries(rel)

    actions = plan_link_actions(
        platform=LinkPlatform.WINDOWS, binaries_dir=rel, link_dir=link
    )
    apply_link_install(actions, LinkPlatform.WINDOWS)
    for a in actions:
        body = a.LinkPath.read_text(encoding="utf-8")
        assert body.startswith("@echo off")
        assert f'@call "{a.Source}" %*' in body


def test_install_missing_source_raises(tmp_path: Path) -> None:
    actions = plan_link_actions(
        platform=LinkPlatform.POSIX,
        binaries_dir=tmp_path / "empty",
        link_dir=tmp_path / "bin",
    )
    with pytest.raises(AppError) as exc:
        apply_link_install(actions, LinkPlatform.POSIX)
    assert exc.value.code is ErrorCode.E_INSTALL_PATH_LINK_FAILED
    assert "source exe missing" in exc.value.message


# --- apply_link_uninstall ----------------------------------------------


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX symlink semantics")
def test_uninstall_removes_and_is_idempotent(tmp_path: Path) -> None:
    rel = tmp_path / "rel"
    link = tmp_path / "bin"
    _touch_posix_binaries(rel)
    actions = plan_link_actions(
        platform=LinkPlatform.POSIX, binaries_dir=rel, link_dir=link
    )
    apply_link_install(actions, LinkPlatform.POSIX)
    apply_link_uninstall(actions, LinkPlatform.POSIX)
    for a in actions:
        assert not a.LinkPath.exists()
    # Second uninstall must be a no-op.
    apply_link_uninstall(actions, LinkPlatform.POSIX)


def test_uninstall_refuses_to_remove_directory(tmp_path: Path) -> None:
    link = tmp_path / "bin"
    link.mkdir()
    actions = plan_link_actions(
        platform=LinkPlatform.POSIX,
        binaries_dir=tmp_path / "rel",
        link_dir=link,
    )
    # Place a directory where the first shim would live.
    actions[0].LinkPath.mkdir()
    with pytest.raises(AppError) as exc:
        apply_link_uninstall(actions, LinkPlatform.POSIX)
    assert exc.value.code is ErrorCode.E_INSTALL_PATH_LINK_FAILED


# --- CLI ---------------------------------------------------------------


def _run_cli(*args: str, env_extra: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(REPO_ROOT)
    if env_extra:
        env.update(env_extra)
    return subprocess.run(
        [sys.executable, str(CLI), *args],
        capture_output=True, text=True, env=env, cwd=str(REPO_ROOT),
    )


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX symlink semantics")
def test_cli_install_happy_path(tmp_path: Path) -> None:
    rel = tmp_path / "rel"
    link = tmp_path / "bin"
    _touch_posix_binaries(rel)
    r = _run_cli(
        "install",
        "--binaries-dir", str(rel),
        "--link-dir", str(link),
        "--platform", "posix",
    )
    assert r.returncode == 0, r.stderr
    for b in BINARIES:
        assert (link / b.ExeName).is_symlink()


def test_cli_install_missing_source_exit_30(tmp_path: Path) -> None:
    r = _run_cli(
        "install",
        "--binaries-dir", str(tmp_path / "empty"),
        "--link-dir", str(tmp_path / "bin"),
        "--platform", "posix",
    )
    assert r.returncode == 30, r.stderr
    assert "E_INSTALL_PATH_LINK_FAILED" in r.stderr


def test_cli_usage_error_exit_2(tmp_path: Path) -> None:
    r = _run_cli("install", "--link-dir", str(tmp_path))
    assert r.returncode == 2
