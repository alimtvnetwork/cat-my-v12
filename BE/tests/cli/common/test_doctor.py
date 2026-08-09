"""Plan 90 Step 41 - tests for the shared doctor probe and CLI wiring.

Covers:
- ``bin/db-bootstrap.py --check`` on a fully bootstrapped root -> exit 0,
  envelope ``IsSuccess`` with per-tier ``IsHealthy=True``.
- ``--check`` on a *never-bootstrapped* root -> exit 3, envelope failure
  ``E_CLI_PREFLIGHT_FAILED``, per-tier ``PendingVersions`` non-empty.
- Programmatic ``BE.cli.common.doctor.run_doctor`` + ``assert_healthy``
  contract.
- ``worker-cli doctor`` subcommand end-to-end via ``main([...])``.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[4]
BOOTSTRAP = REPO_ROOT / "bin" / "db-bootstrap.py"


def _run_bootstrap(*args: str, env_overrides: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    import os
    env = os.environ.copy()
    if env_overrides:
        env.update(env_overrides)
    return subprocess.run(
        [sys.executable, str(BOOTSTRAP), *args],
        capture_output=True, text=True, env=env, cwd=str(REPO_ROOT),
    )


def test_check_on_fully_bootstrapped_root_reports_healthy(tmp_path: Path) -> None:
    # First apply migrations.
    apply = _run_bootstrap("--db-root", str(tmp_path))
    assert apply.returncode == 0, apply.stderr

    # Then --check must be a clean no-op.
    check = _run_bootstrap("--db-root", str(tmp_path), "--check")
    assert check.returncode == 0, check.stderr
    payload = json.loads(check.stdout)
    assert payload["Status"]["IsSuccess"] is True
    assert payload["Status"]["Code"] == 200
    results = payload["Results"]
    assert {r["Tier"] for r in results} == {"root", "task", "rules"}
    for r in results:
        assert r["IsHealthy"] is True
        assert r["PendingVersions"] == []
        assert r["MissingVersions"] == []


def test_check_on_uninitialised_root_reports_drift(tmp_path: Path) -> None:
    check = _run_bootstrap("--db-root", str(tmp_path), "--check")
    assert check.returncode == 2, (check.returncode, check.stderr)
    payload = json.loads(check.stdout)
    assert payload["Status"]["IsSuccess"] is False
    assert payload["Errors"]["Code"] == "E_CLI_PREFLIGHT_FAILED"
    results = payload["Results"]
    # Every tier has migrations pending because nothing was applied.
    assert any(r["PendingVersions"] for r in results)
    assert all(r["MissingVersions"] == [] for r in results)


def test_run_doctor_programmatic_returns_summaries(tmp_path: Path) -> None:
    apply = _run_bootstrap("--db-root", str(tmp_path))
    assert apply.returncode == 0, apply.stderr

    from BE.cli.common.doctor import assert_healthy, run_doctor

    class _FakeLogger:
        def log(self, *args, **kwargs) -> None:  # noqa: D401
            return None

    class _FakeCtx:
        logger = _FakeLogger()

    summaries = run_doctor(_FakeCtx(), db_root=tmp_path)  # type: ignore[arg-type]
    assert {s["Tier"] for s in summaries} == {"root", "task", "rules"}
    assert all(s["IsHealthy"] for s in summaries)
    # Must not raise.
    assert_healthy(summaries)


def test_assert_healthy_raises_on_drift(tmp_path: Path) -> None:
    from BE.cli.common.doctor import assert_healthy
    from BE.errors.apperror import AppError
    from BE.errors.codes import ErrorCode

    drifted = [
        {"Tier": "root", "IsHealthy": False, "PendingVersions": [10], "MissingVersions": []},
        {"Tier": "task", "IsHealthy": True, "PendingVersions": [], "MissingVersions": []},
    ]
    with pytest.raises(AppError) as excinfo:
        assert_healthy(drifted)
    assert excinfo.value.code is ErrorCode.E_CLI_PREFLIGHT_FAILED
    assert excinfo.value.details["Drift"][0]["Tier"] == "root"


def test_worker_cli_doctor_subcommand_success(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    apply = _run_bootstrap("--db-root", str(tmp_path))
    assert apply.returncode == 0, apply.stderr

    from BE.cli.worker.main import main

    rc = main(["doctor", "--db-root", str(tmp_path)])
    assert rc == 0
    captured = capsys.readouterr()
    payload = json.loads(captured.out.strip())
    assert payload["Status"]["IsSuccess"] is True
    tiers = {r["Tier"] for r in payload["Results"]}
    # DB tiers + spec-74 §5 preflight probes (sdk, config, logroot).
    assert tiers >= {"root", "task", "rules", "sdk", "config", "logroot"}
    assert all(r["IsHealthy"] for r in payload["Results"])


def test_worker_cli_doctor_subcommand_drift(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    from BE.cli.worker.main import main

    rc = main(["doctor", "--db-root", str(tmp_path)])
    assert rc == 2, rc
    captured = capsys.readouterr()
    payload = json.loads(captured.out.strip())
    assert payload["Status"]["IsSuccess"] is False
    assert payload["Errors"]["Code"] == "E_CLI_PREFLIGHT_FAILED"


def test_run_preflight_includes_sdk_config_logroot_probes(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Spec 74 §Acceptance #5 - doctor must probe SDK, config, and log root."""
    apply = _run_bootstrap("--db-root", str(tmp_path))
    assert apply.returncode == 0, apply.stderr

    log_root = tmp_path / "logs"
    monkeypatch.setenv("APP_LOG_ROOT", str(log_root))

    from BE.cli.common.doctor import run_preflight

    class _FakeLogger:
        def log(self, *args, **kwargs) -> None:
            return None

    class _FakeCtx:
        logger = _FakeLogger()

    results = run_preflight(_FakeCtx(), db_root=tmp_path)  # type: ignore[arg-type]
    by_tier = {r["Tier"]: r for r in results}
    for tier in ("sdk", "config", "logroot", "root", "task", "rules"):
        assert tier in by_tier, f"missing preflight probe: {tier}"
        assert by_tier[tier]["IsHealthy"] is True, by_tier[tier]
    # Log-root probe must not leave the write-probe behind.
    assert not (log_root / ".doctor.write-probe").exists()

