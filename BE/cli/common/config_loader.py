"""Plan 90 Step 12 - unified config loader for worker + processing CLIs.

Layer order (increasing precedence), locked in `.lovable/memory/26-split-db-cli-cheatsheet.md` §8:

    defaults -> repo `config/*.toml` -> `<APP_CONFIG_ROOT>/*.toml` -> env vars -> CLI flags

Anchors:
- `spec/06-seedable-config-architecture/{00,01,02}` (persistence + versioning).
- `spec/21-app/76-cli-log-and-ipc.md` §"Seedable config" (runtime overlay).
- `.lovable/memory/26-split-db-cli-cheatsheet.md` §8.

This module is deliberately narrow. It does NOT touch the Root DB seed table
(that arrives at Step 33). It exposes the runtime-overlay resolution only, so
Steps 13 (paths), 14 (logger), and 41 (doctor) can consume a single frozen
`CliConfig` instance instead of re-implementing precedence.

Error contract: every failure raises `AppError` with a wire code registered in
`BE/errors/codes.py`. No silent fallbacks, no swallowed exceptions.
"""

from __future__ import annotations

import os
import tomllib
from dataclasses import dataclass, field, replace
from pathlib import Path
from typing import Any, Literal, Mapping

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

CliName = Literal["worker", "processing"]

# Env-var prefixes per CLI. Only keys with the matching prefix are consumed;
# everything else is ignored to avoid accidental pollution from the host env.
_ENV_PREFIX: dict[str, str] = {
    "worker": "VISION_WORKER_",
    "processing": "VISION_PROCESSING_",
}

# Whitelist of keys the runtime overlay accepts. Adding a key here is a spec
# change; do not widen without updating spec 76 + memory §8.
_ALLOWED_KEYS: frozenset[str] = frozenset(
    {"log_root", "ipc_root", "config_root", "data_root", "verbose", "quiet"}
)

# Keys matching this regex are refused from repo/user TOML per memory §8 and
# Step 20 redaction. Env layer is allowed (operator-controlled surface).
_SECRET_KEY_RX = ("secret", "password", "token", "apikey", "api_key")


@dataclass(frozen=True, slots=True)
class CliConfig:
    """Resolved CLI runtime overlay. Frozen so downstream code cannot mutate."""

    cli_name: CliName
    log_root: Path | None = None
    ipc_root: Path | None = None
    config_root: Path | None = None
    data_root: Path | None = None
    verbose: bool = False
    quiet: bool = False
    # Provenance: which layer each field came from. Useful for `doctor`.
    sources: Mapping[str, str] = field(default_factory=dict)


def _defaults(cli_name: CliName) -> dict[str, Any]:
    return {"cli_name": cli_name, "verbose": False, "quiet": False}


def _load_toml(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        with path.open("rb") as f:
            return tomllib.load(f)
    except tomllib.TOMLDecodeError as exc:
        raise AppError(
            ErrorCode.E_CLI_PREFLIGHT_FAILED,
            message=f"Invalid TOML at {path}: {exc}",
            details={"Path": str(path), "Layer": "toml"},
        ) from exc
    except OSError as exc:
        raise AppError(
            ErrorCode.E_CLI_PREFLIGHT_FAILED,
            message=f"Cannot read {path}: {exc}",
            details={"Path": str(path), "Layer": "toml"},
        ) from exc


def _filter(layer: str, raw: Mapping[str, Any], *, reject_secrets: bool) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in raw.items():
        norm = key.lower()
        if reject_secrets and any(tok in norm for tok in _SECRET_KEY_RX):
            raise AppError(
                ErrorCode.E_LOG_ROOT_UNWRITABLE,
                message=f"Secret-like key '{key}' rejected from {layer} layer",
                details={"Layer": layer, "Key": key},
            )
        if norm not in _ALLOWED_KEYS:
            # Unknown key: silently drop (spec 76 allows forward-compat keys),
            # but never let it reach the frozen dataclass.
            continue
        out[norm] = value
    return out


def _env_layer(cli_name: CliName, env: Mapping[str, str]) -> dict[str, Any]:
    prefix = _ENV_PREFIX[cli_name]
    raw: dict[str, Any] = {}
    for key, value in env.items():
        if not key.startswith(prefix):
            continue
        raw[key[len(prefix) :].lower()] = value
    # Env layer skips secret rejection (operator-controlled); still allow-listed.
    return _filter("env", raw, reject_secrets=False)


def _coerce(kwargs: dict[str, Any]) -> dict[str, Any]:
    """Coerce string values from env/flags into their dataclass types."""
    out: dict[str, Any] = {}
    for key, value in kwargs.items():
        if key in {"log_root", "ipc_root", "config_root", "data_root"}:
            if value is None or value == "":
                continue
            out[key] = Path(value) if not isinstance(value, Path) else value
        elif key in {"verbose", "quiet"}:
            if isinstance(value, str):
                out[key] = value.strip().lower() in {"1", "true", "yes", "on"}
            else:
                out[key] = bool(value)
        else:
            out[key] = value
    return out


def load_config(
    cli_name: CliName,
    *,
    repo_config_path: Path | None = None,
    user_config_root: Path | None = None,
    env: Mapping[str, str] | None = None,
    flags: Mapping[str, Any] | None = None,
) -> CliConfig:
    """Resolve the effective CLI runtime config per the spec-76 layer order.

    All arguments are injectable for testing. In production, the defaults are:
    - `repo_config_path`: `<repo>/config/<cli_name>.toml`
    - `user_config_root`: `<APP_CONFIG_ROOT>` (resolved in Step 13)
    - `env`: `os.environ`
    - `flags`: parsed argparse namespace (Step 40+)
    """
    if cli_name not in _ENV_PREFIX:
        raise AppError(
            ErrorCode.E_CLI_PREFLIGHT_FAILED,
            message=f"Unknown CLI '{cli_name}'; expected 'worker' or 'processing'",
            details={"CliName": cli_name},
        )

    env = env if env is not None else os.environ
    flags = flags or {}

    layers: list[tuple[str, dict[str, Any]]] = [("defaults", _defaults(cli_name))]

    if repo_config_path is not None:
        raw = _load_toml(repo_config_path)
        layers.append(("repo", _filter("repo", raw, reject_secrets=True)))

    if user_config_root is not None:
        user_file = user_config_root / f"{cli_name}.toml"
        raw = _load_toml(user_file)
        layers.append(("user", _filter("user", raw, reject_secrets=True)))

    layers.append(("env", _env_layer(cli_name, env)))
    layers.append(("flags", _filter("flags", flags, reject_secrets=False)))

    merged: dict[str, Any] = {}
    provenance: dict[str, str] = {}
    for name, layer in layers:
        for key, value in layer.items():
            if key == "cli_name":
                continue
            merged[key] = value
            provenance[key] = name

    merged = _coerce(merged)
    return CliConfig(cli_name=cli_name, sources=provenance, **merged)


def override(cfg: CliConfig, **changes: Any) -> CliConfig:
    """Test/debug helper: return a copy of `cfg` with `changes` applied."""
    coerced = _coerce(dict(changes))
    new_sources = dict(cfg.sources)
    for key in coerced:
        new_sources[key] = "override"
    return replace(cfg, sources=new_sources, **coerced)


__all__ = ["CliConfig", "CliName", "load_config", "override"]
