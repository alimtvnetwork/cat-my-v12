"""Plan 90 Step 12 tests - config loader layer precedence + guardrails."""

from __future__ import annotations

from pathlib import Path

import pytest

from BE.cli.common.config_loader import CliConfig, load_config, override
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _write_toml(path: Path, body: str) -> Path:
    path.write_text(body, encoding="utf-8")
    return path


def test_defaults_only(tmp_path: Path) -> None:
    cfg = load_config("worker", env={}, flags={})
    assert isinstance(cfg, CliConfig)
    assert cfg.cli_name == "worker"
    assert cfg.verbose is False
    assert cfg.quiet is False
    assert cfg.log_root is None
    assert cfg.sources.get("verbose") == "defaults"


def test_rejects_unknown_cli() -> None:
    with pytest.raises(AppError) as ei:
        load_config("nope", env={}, flags={})  # type: ignore[arg-type]
    assert ei.value.code is ErrorCode.E_CLI_PREFLIGHT_FAILED


def test_layer_precedence_flags_beats_env_beats_user_beats_repo(tmp_path: Path) -> None:
    repo = _write_toml(tmp_path / "repo.toml", 'verbose = false\nlog_root = "/repo/logs"\n')
    user_root = tmp_path / "user"
    user_root.mkdir()
    _write_toml(user_root / "worker.toml", 'log_root = "/user/logs"\nquiet = false\n')

    cfg = load_config(
        "worker",
        repo_config_path=repo,
        user_config_root=user_root,
        env={"VISION_WORKER_LOG_ROOT": "/env/logs", "VISION_WORKER_QUIET": "true"},
        flags={"log_root": "/flag/logs"},
    )
    assert cfg.log_root == Path("/flag/logs")
    assert cfg.sources["log_root"] == "flags"
    assert cfg.quiet is True
    assert cfg.sources["quiet"] == "env"


def test_env_prefix_scopes_per_cli() -> None:
    cfg = load_config(
        "processing",
        env={
            "VISION_WORKER_VERBOSE": "true",  # wrong prefix, must be ignored
            "VISION_PROCESSING_VERBOSE": "true",
            "PATH": "/usr/bin",  # unrelated, must be ignored
        },
    )
    assert cfg.verbose is True
    assert cfg.sources["verbose"] == "env"


def test_repo_toml_rejects_secret_key(tmp_path: Path) -> None:
    repo = _write_toml(tmp_path / "repo.toml", 'api_token = "xxx"\n')
    with pytest.raises(AppError) as ei:
        load_config("worker", repo_config_path=repo, env={}, flags={})
    assert ei.value.code is ErrorCode.E_LOG_ROOT_UNWRITABLE
    assert "api_token" in ei.value.message


def test_user_toml_rejects_password_key(tmp_path: Path) -> None:
    root = tmp_path / "user"
    root.mkdir()
    _write_toml(root / "worker.toml", 'db_password = "x"\n')
    with pytest.raises(AppError) as ei:
        load_config("worker", user_config_root=root, env={}, flags={})
    assert ei.value.code is ErrorCode.E_LOG_ROOT_UNWRITABLE


def test_env_layer_allows_secret_like_key_but_drops_unknown(tmp_path: Path) -> None:
    # Env is operator-controlled: no secret rejection. Unknown keys are dropped.
    cfg = load_config(
        "worker",
        env={"VISION_WORKER_API_TOKEN": "ok", "VISION_WORKER_VERBOSE": "1"},
    )
    # api_token is not in the allow-list, so it's dropped, not raised.
    assert not hasattr(cfg, "api_token")
    assert cfg.verbose is True


def test_invalid_toml_raises_preflight(tmp_path: Path) -> None:
    bad = _write_toml(tmp_path / "bad.toml", "this is = not = toml")
    with pytest.raises(AppError) as ei:
        load_config("worker", repo_config_path=bad, env={}, flags={})
    assert ei.value.code is ErrorCode.E_CLI_PREFLIGHT_FAILED
    assert "Invalid TOML" in ei.value.message


def test_missing_toml_is_silently_skipped(tmp_path: Path) -> None:
    # spec 76: missing layer files degrade to next layer; not an error.
    cfg = load_config(
        "worker",
        repo_config_path=tmp_path / "does-not-exist.toml",
        user_config_root=tmp_path / "no-user-dir",
        env={},
        flags={},
    )
    assert cfg.log_root is None


def test_path_coercion_from_env_and_flags(tmp_path: Path) -> None:
    cfg = load_config(
        "worker",
        env={"VISION_WORKER_IPC_ROOT": "/env/ipc"},
        flags={"data_root": "/flag/data"},
    )
    assert cfg.ipc_root == Path("/env/ipc")
    assert cfg.data_root == Path("/flag/data")


def test_bool_coercion_from_env_strings() -> None:
    for truthy in ("1", "true", "TRUE", "yes", "on"):
        cfg = load_config("worker", env={"VISION_WORKER_VERBOSE": truthy})
        assert cfg.verbose is True, truthy
    for falsy in ("0", "false", "no", ""):
        cfg = load_config("worker", env={"VISION_WORKER_VERBOSE": falsy})
        assert cfg.verbose is False, falsy


def test_config_is_frozen() -> None:
    cfg = load_config("worker", env={})
    with pytest.raises((AttributeError, TypeError)):
        cfg.verbose = True  # type: ignore[misc]


def test_override_helper_records_provenance() -> None:
    cfg = load_config("worker", env={})
    updated = override(cfg, verbose=True, log_root="/tmp/x")
    assert updated.verbose is True
    assert updated.log_root == Path("/tmp/x")
    assert updated.sources["verbose"] == "override"
    assert updated.sources["log_root"] == "override"
    # Original unchanged.
    assert cfg.verbose is False
