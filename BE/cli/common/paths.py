"""Plan 90 Step 13 - canonical filesystem-root resolver for the CLIs.

Anchors:
- `spec/21-app/76-cli-log-and-ipc.md` §"Root layout" (Windows `%LOCALAPPDATA%`,
  Linux `~/.local/state`, sibling `<APP_IPC_ROOT>`).
- `spec/21-app/74-worker-cli.md` + `75-processing-cli.md` (consumers).
- `.lovable/memory/26-split-db-cli-cheatsheet.md` §8 (env-var override order:
  env layer between user TOML and CLI flags).

Root name matrix (all under `<app_root>`):

    <app_root>/logs   -> APP_LOG_ROOT
    <app_root>/db     -> APP_DB_ROOT
    <app_root>/ipc    -> APP_IPC_ROOT
    <app_root>/config -> APP_CONFIG_ROOT
    <app_root>/data   -> APP_DATA_ROOT

`<app_root>` per OS:
    Windows -> %LOCALAPPDATA%\\vision-app         (falls back to %APPDATA%, then ~)
    Linux   -> ${XDG_STATE_HOME:-~/.local/state}/vision-app
    macOS   -> ~/Library/Application Support/vision-app

Override precedence for every root (highest wins):
    1. explicit `override=` argument (from `CliConfig`, Step 12)
    2. env var (`APP_LOG_ROOT`, `APP_DB_ROOT`, ...)
    3. per-OS default derived from `<app_root>`

Failure contract:
    * Cannot resolve any home/`LOCALAPPDATA`  -> `E_CLI_UNSUPPORTED_HOST`
    * `ensure=True` and mkdir fails           -> `E_LOG_ROOT_UNWRITABLE`

Nothing here creates directories unless the caller asks (`ensure=True`).
Step 14 (logger) and Step 23 (IPC) are the two call sites that opt in.
"""

from __future__ import annotations

import os
import sys
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

APP_DIR_NAME = "vision-app"

RootKind = Literal["log", "db", "ipc", "config", "data"]

_ROOT_ENV: dict[RootKind, str] = {
    "log": "APP_LOG_ROOT",
    "db": "APP_DB_ROOT",
    "ipc": "APP_IPC_ROOT",
    "config": "APP_CONFIG_ROOT",
    "data": "APP_DATA_ROOT",
}

_ROOT_SUBDIR: dict[RootKind, str] = {
    "log": "logs",
    "db": "db",
    "ipc": "ipc",
    "config": "config",
    "data": "data",
}

Platform = Literal["windows", "linux", "darwin"]


def _detect_platform(platform: str | None) -> Platform:
    p = (platform or sys.platform).lower()
    if p.startswith("win"):
        return "windows"
    if p == "darwin":
        return "darwin"
    return "linux"


def _app_root(platform: Platform, env: Mapping[str, str]) -> Path:
    if platform == "windows":
        base = env.get("LOCALAPPDATA") or env.get("APPDATA")
        if not base:
            home = env.get("USERPROFILE") or env.get("HOME")
            if not home:
                raise AppError(
                    ErrorCode.E_CLI_UNSUPPORTED_HOST,
                    "Windows host exposes neither %LOCALAPPDATA% nor %APPDATA% nor %USERPROFILE%",
                    details={"Platform": platform},
                )
            base = str(Path(home) / "AppData" / "Local")
        return Path(base) / APP_DIR_NAME

    if platform == "darwin":
        home = env.get("HOME")
        if not home:
            raise AppError(
                ErrorCode.E_CLI_UNSUPPORTED_HOST,
                "macOS host exposes no $HOME",
                details={"Platform": platform},
            )
        return Path(home) / "Library" / "Application Support" / APP_DIR_NAME

    # linux
    state = env.get("XDG_STATE_HOME")
    if state:
        return Path(state) / APP_DIR_NAME
    home = env.get("HOME")
    if not home:
        raise AppError(
            ErrorCode.E_CLI_UNSUPPORTED_HOST,
            "Linux host exposes neither $XDG_STATE_HOME nor $HOME",
            details={"Platform": platform},
        )
    return Path(home) / ".local" / "state" / APP_DIR_NAME


def _ensure_writable(path: Path) -> None:
    try:
        path.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise AppError(
            ErrorCode.E_LOG_ROOT_UNWRITABLE,
            f"Cannot create or access root directory {path}: {exc}",
            details={"Path": str(path)},
        ) from exc
    if not os.access(path, os.W_OK):
        raise AppError(
            ErrorCode.E_LOG_ROOT_UNWRITABLE,
            f"Root directory {path} is not writable by the current user",
            details={"Path": str(path)},
        )


def resolve_root(
    kind: RootKind,
    *,
    override: Path | str | None = None,
    env: Mapping[str, str] | None = None,
    platform: str | None = None,
    ensure: bool = False,
) -> Path:
    """Resolve one filesystem root by kind, honouring override > env > OS default."""
    if kind not in _ROOT_ENV:
        raise AppError(
            ErrorCode.E_CLI_PREFLIGHT_FAILED,
            f"Unknown root kind '{kind}'",
            details={"Kind": kind},
        )
    env = env if env is not None else os.environ
    if override is not None and str(override) != "":
        path = Path(override)
    elif env.get(_ROOT_ENV[kind]):
        path = Path(env[_ROOT_ENV[kind]])
    else:
        path = _app_root(_detect_platform(platform), env) / _ROOT_SUBDIR[kind]
    if ensure:
        _ensure_writable(path)
    return path


@dataclass(frozen=True, slots=True)
class ResolvedPaths:
    log: Path
    db: Path
    ipc: Path
    config: Path
    data: Path


def resolve_all(
    *,
    overrides: Mapping[RootKind, Path | str | None] | None = None,
    env: Mapping[str, str] | None = None,
    platform: str | None = None,
    ensure: bool = False,
) -> ResolvedPaths:
    """Resolve all five roots in one call. Consumers should prefer this."""
    ov = overrides or {}
    return ResolvedPaths(
        log=resolve_root("log", override=ov.get("log"), env=env, platform=platform, ensure=ensure),
        db=resolve_root("db", override=ov.get("db"), env=env, platform=platform, ensure=ensure),
        ipc=resolve_root("ipc", override=ov.get("ipc"), env=env, platform=platform, ensure=ensure),
        config=resolve_root("config", override=ov.get("config"), env=env, platform=platform, ensure=ensure),
        data=resolve_root("data", override=ov.get("data"), env=env, platform=platform, ensure=ensure),
    )


__all__ = [
    "APP_DIR_NAME",
    "Platform",
    "ResolvedPaths",
    "RootKind",
    "resolve_all",
    "resolve_root",
]
