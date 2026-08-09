"""Plan 90 Step 50 (file item 54) - worker-cli end-to-end subprocess harness.

Spawns the shipped entry point (`python -m BE.cli.worker.main`) as a real
subprocess and asserts the wire contract every downstream consumer relies
on:

- stdout: EXACTLY one line of JSON = the Universal Envelope. Nothing else.
- stderr: at least one non-empty human summary line.
- exit code: matches `BE/cli/common/exit_codes.py::ExitCode`.
- log file: `<APP_LOG_ROOT>/worker-cli/<YYYY-MM-DD>/<HHMMSS>-<pid>-<subcmd>.jsonl`
  exists after the run, with at least one JSON line and matching `Source`.

This is the first test that crosses the process boundary. All prior
Steps 20-49 exercised the dispatcher in-process. Without this harness
regressions in stdout buffering, encoding, exit-code truncation, or
log-path resolution reach PowerShell wrappers and CI verify workflows
with no unit-level safety net.

Root anchors:
- `BE/cli/worker/main.py::main`  (module entry)
- `BE/cli/common/dispatcher.py::Dispatcher.run` (stdout / stderr / exit contract)
- `BE/cli/common/logger.py::_build_log_path` (log path format)
- `BE/cli/common/paths.py::resolve_root` (APP_LOG_ROOT resolution)
- `spec/21-app/76-cli-log-and-ipc.md` §Stdout contract
- `spec/21-app/74-worker-cli.md` §Acceptance #6 (exit-code table)
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from BE.cli.common.exit_codes import ExitCode
from BE.errors.codes import ErrorCode

REPO_ROOT = Path(__file__).resolve().parents[4]


def _run(argv: list[str], log_root: Path, ipc_root: Path | None = None) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["APP_LOG_ROOT"] = str(log_root)
    if ipc_root is not None:
        env["APP_IPC_ROOT"] = str(ipc_root)
    # Force UTF-8 on Windows/Python defaults so the JSON line is not mangled.
    env["PYTHONUTF8"] = "1"
    env["PYTHONIOENCODING"] = "utf-8"
    # Ensure `BE` package is importable from the repo root when tests run
    # from a different CWD.
    env["PYTHONPATH"] = str(REPO_ROOT) + os.pathsep + env.get("PYTHONPATH", "")
    return subprocess.run(
        [sys.executable, "-m", "BE.cli.worker.main", *argv],
        cwd=str(REPO_ROOT),
        env=env,
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=30,
    )


def _assert_single_envelope(stdout: str) -> dict:
    lines = [ln for ln in stdout.splitlines() if ln.strip()]
    assert len(lines) == 1, (
        f"stdout contract violated: expected 1 non-empty line (Universal Envelope), "
        f"got {len(lines)}: {stdout!r}"
    )
    env = json.loads(lines[0])
    # PascalCase Status is always present; Results present on success paths;
    # Errors present on failure paths. See BE/envelope.py.
    assert "Status" in env and isinstance(env["Status"], dict), env
    return env


def _find_log_file(log_root: Path, subcmd: str) -> Path:
    root = log_root / "worker-cli"
    assert root.exists(), f"log source dir missing: {root}"
    matches = list(root.glob(f"*/*-{subcmd}.jsonl"))
    assert matches, f"no log file for subcmd={subcmd} under {root}"
    # Expect exactly one for a single subprocess.
    assert len(matches) == 1, f"multiple log files: {matches}"
    return matches[0]


# ---------- 1. Success path: `probe --provider memory` ----------

def test_e2e_probe_memory_success(tmp_path: Path) -> None:
    log_root = tmp_path / "logs"
    r = _run(["probe", "--provider", "memory"], log_root)
    assert r.returncode == int(ExitCode.Ok), f"rc={r.returncode} stderr={r.stderr!r}"
    env = _assert_single_envelope(r.stdout)
    assert env["Status"]["IsSuccess"] is True
    assert env.get("Errors") in (None, {}), env.get("Errors")
    assert isinstance(env["Results"], list)
    assert r.stderr.strip(), "human summary line missing on stderr"

    log_path = _find_log_file(log_root, "probe")
    log_lines = [json.loads(ln) for ln in log_path.read_text(encoding="utf-8").splitlines() if ln.strip()]
    assert log_lines, "log file exists but is empty"
    # Every line carries Source=worker-cli per BE/cli/common/logger.py line 92, 108, 130.
    assert all(rec.get("Source") == "worker-cli" for rec in log_lines), log_lines


# ---------- 2. Vendor-provider rejection: exit=VendorError ----------

def test_e2e_probe_vendor_rejected(tmp_path: Path) -> None:
    log_root = tmp_path / "logs"
    r = _run(["probe", "--provider", "vendor"], log_root)
    assert r.returncode == int(ExitCode.VendorError), (
        f"vendor path must exit VendorError(5), got {r.returncode}; stderr={r.stderr!r}"
    )
    env = _assert_single_envelope(r.stdout)
    assert env["Status"]["IsFailed"] is True
    assert env["Errors"]["Code"] == ErrorCode.E_CLI_UNSUPPORTED_HOST.value


# ---------- 3. Status is side-effect-free and succeeds when idle ----------

def test_e2e_status_idle(tmp_path: Path) -> None:
    log_root = tmp_path / "logs"
    ipc_root = tmp_path / "ipc"
    r = _run(["status"], log_root, ipc_root=ipc_root)
    assert r.returncode == int(ExitCode.Ok), f"rc={r.returncode} stderr={r.stderr!r}"
    env = _assert_single_envelope(r.stdout)
    assert env["Status"]["IsSuccess"] is True
    results = env["Results"]
    assert isinstance(results, list) and results, results


# ---------- 4. list-devices success + envelope shape ----------

def test_e2e_list_devices_success(tmp_path: Path) -> None:
    log_root = tmp_path / "logs"
    r = _run(["list-devices"], log_root)
    assert r.returncode == int(ExitCode.Ok), f"rc={r.returncode} stderr={r.stderr!r}"
    env = _assert_single_envelope(r.stdout)
    assert env["Status"]["IsSuccess"] is True
    for row in env["Results"]:
        # PascalCase device rows per BE/cli/worker/subcommands/list_devices.py.
        assert set(row.keys()) >= {"Serial", "Model", "Vendor", "Interface", "Status"}, row


# ---------- 5. Argparse usage: unknown subcommand -> ExitCode.Usage(2) ----------

def test_e2e_unknown_subcommand_usage(tmp_path: Path) -> None:
    log_root = tmp_path / "logs"
    r = _run(["definitely-not-a-subcommand"], log_root)
    assert r.returncode == int(ExitCode.Usage), (
        f"argparse error must exit Usage(2), got {r.returncode}; stderr={r.stderr!r}"
    )
    env = _assert_single_envelope(r.stdout)
    assert env["Status"]["IsFailed"] is True
    assert env["Errors"]["Code"] == ErrorCode.E_CLI_USAGE.value


# ---------- 6. No stray stdout: help path writes to stderr, no envelope ----------

def test_e2e_help_exits_zero_and_stdout_is_help(tmp_path: Path) -> None:
    # argparse `--help` sys.exit(0); the dispatcher preserves that exit code.
    log_root = tmp_path / "logs"
    r = _run(["--help"], log_root)
    assert r.returncode == 0, f"--help must exit 0, got {r.returncode}; stderr={r.stderr!r}"
    # --help writes usage to stdout (argparse default). We do NOT require a
    # single-envelope contract on the help path; that only applies to real
    # subcommand invocations. But we DO require the entry point survived.
    assert "worker-cli" in (r.stdout + r.stderr)


# ---------- 7. Log file survives even on a failure path ----------

def test_e2e_failure_still_writes_log(tmp_path: Path) -> None:
    log_root = tmp_path / "logs"
    r = _run(["probe", "--provider", "vendor"], log_root)
    assert r.returncode == int(ExitCode.VendorError)
    log_path = _find_log_file(log_root, "probe")
    assert log_path.stat().st_size > 0, f"log file empty after failure: {log_path}"
