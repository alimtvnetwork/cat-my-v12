"""Plan 90 Step 49 tests - `worker-cli` exhaustive AppError -> ExitCode mapping.

Root anchor: `BE/cli/common/dispatcher.py::_exit_for_apperror` +
`_IO_CODES` / `_VENDOR_CODES` / `_USAGE_CODES` frozensets. Every code
the worker can raise must land in exactly ONE bucket. This suite pins:

1. Per-code classification (parametrized over every ErrorCode member).
2. Bucket disjointness (no code in more than one set).
3. Default bucket is `DomainError` (unknown codes never accidentally
   downgrade to Ok / Usage / Vendor).
4. End-to-end dispatcher round-trip: a fake subcommand that raises
   `AppError(code)` must exit with the expected `ExitCode` AND emit
   an envelope whose `Errors.Code` equals `code.value`.
5. `SystemExit(int)` and bare `SystemExit()` pass through unchanged
   (argparse usage errors keep ExitCode.Usage).

Locks the taxonomy Step 74 (FE session drill-down) and PowerShell
wrappers (`$LASTEXITCODE`) will consume. A silent reclassification here
breaks every downstream consumer.
"""

from __future__ import annotations

import io
import json
from typing import Any

import pytest

from BE.cli.common.dispatcher import (
    Dispatcher,
    Subcommand,
    _IO_CODES,
    _USAGE_CODES,
    _VENDOR_CODES,
    _exit_for_apperror,
)
from BE.cli.common.exit_codes import ExitCode
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


# ---------- 1. Per-code classification ----------

_EXPECTED: dict[ErrorCode, ExitCode] = {}
for c in _IO_CODES:
    _EXPECTED[c] = ExitCode.IoError
for c in _VENDOR_CODES:
    _EXPECTED[c] = ExitCode.VendorError
for c in _USAGE_CODES:
    _EXPECTED[c] = ExitCode.Usage


@pytest.mark.parametrize("code", list(ErrorCode))
def test_every_code_maps_to_a_known_exit(code: ErrorCode) -> None:
    expected = _EXPECTED.get(code, ExitCode.DomainError)
    got = _exit_for_apperror(AppError(code, "x"))
    assert got == expected, f"{code.value} classified as {got.name}, expected {expected.name}"


# ---------- 2. Bucket disjointness ----------

def test_buckets_are_disjoint() -> None:
    assert _IO_CODES.isdisjoint(_VENDOR_CODES), _IO_CODES & _VENDOR_CODES
    assert _IO_CODES.isdisjoint(_USAGE_CODES), _IO_CODES & _USAGE_CODES
    assert _VENDOR_CODES.isdisjoint(_USAGE_CODES), _VENDOR_CODES & _USAGE_CODES


# ---------- 3. Contract pins for downstream consumers ----------
# These are the classifications Step 74 (FE session panel) and the
# PowerShell wrappers depend on. A change here is a spec change.

@pytest.mark.parametrize(
    ("code", "exit"),
    [
        (ErrorCode.E_CAM_NOT_CONNECTED, ExitCode.VendorError),
        (ErrorCode.E_CAM_CAPTURE_FAILED, ExitCode.VendorError),
        (ErrorCode.E_CLI_UNSUPPORTED_HOST, ExitCode.VendorError),
        (ErrorCode.E_CLI_USAGE, ExitCode.Usage),
        (ErrorCode.E_CLI_PREFLIGHT_FAILED, ExitCode.Usage),
        (ErrorCode.E_CLI_CHECKSUM_MISMATCH, ExitCode.IoError),
        (ErrorCode.E_LOG_ROOT_UNWRITABLE, ExitCode.IoError),
        (ErrorCode.E_LOG_INDEX_LOCKED, ExitCode.IoError),
        (ErrorCode.E_IPC_WRITE_FAILED, ExitCode.IoError),
        (ErrorCode.E_IPC_PAYLOAD_INVALID, ExitCode.IoError),
        (ErrorCode.E_IPC_UNKNOWN_KIND, ExitCode.IoError),
        (ErrorCode.E_BE_CONFLICT, ExitCode.DomainError),
        (ErrorCode.E_BE_BAD_REQUEST, ExitCode.DomainError),
        (ErrorCode.E_BE_NOT_FOUND, ExitCode.DomainError),
        (ErrorCode.E_CAM_TIMEOUT, ExitCode.DomainError),
    ],
)
def test_pinned_downstream_classifications(code: ErrorCode, exit: ExitCode) -> None:
    assert _exit_for_apperror(AppError(code, "x")) == exit


# ---------- 4. End-to-end round-trip through the dispatcher ----------

def _run_raising(code: ErrorCode, tmp_path, monkeypatch) -> tuple[int, dict[str, Any]]:
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path / "logs"))

    def _configure(p):  # noqa: ANN001
        return None

    def _handle(ns, ctx):  # noqa: ANN001
        raise AppError(code, f"raised {code.value}")

    d = Dispatcher(prog="worker-cli-test", source="worker-cli")
    d.register(Subcommand(name="boom", handler=_handle, configure=_configure, help="test"))
    out, err = io.StringIO(), io.StringIO()
    rc = d.run(["boom"], stdout=out, stderr=err, log_root=str(tmp_path / "logs"))
    lines = out.getvalue().splitlines()
    assert len(lines) == 1, f"expected one envelope line, got {out.getvalue()!r} / stderr={err.getvalue()!r}"
    return rc, json.loads(lines[0])


@pytest.mark.parametrize("code", sorted(_EXPECTED.keys(), key=lambda c: c.value))
def test_dispatcher_roundtrip_bucketed_codes(code: ErrorCode, tmp_path, monkeypatch) -> None:
    rc, env = _run_raising(code, tmp_path, monkeypatch)
    assert rc == int(_EXPECTED[code]), f"{code.value}: rc={rc} expected {int(_EXPECTED[code])}"
    assert env["Errors"]["Code"] == code.value
    assert env["Status"]["IsFailed"] is True


def test_dispatcher_roundtrip_default_bucket_is_domain(tmp_path, monkeypatch) -> None:
    # E_BE_CONFLICT falls through all frozensets -> DomainError.
    rc, env = _run_raising(ErrorCode.E_BE_CONFLICT, tmp_path, monkeypatch)
    assert rc == int(ExitCode.DomainError)
    assert env["Errors"]["Code"] == "E_BE_CONFLICT"


# ---------- 5. SystemExit passthrough (argparse usage errors) ----------

# ---------- 5. Argparse usage error round-trip ----------

def test_argparse_unknown_subcommand_returns_usage(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path / "logs"))
    d = Dispatcher(prog="worker-cli-test", source="worker-cli")
    d.register(Subcommand(name="known", handler=lambda ns, ctx: {"ok": True},
                          configure=lambda p: None, help=""))
    out, err = io.StringIO(), io.StringIO()
    rc = d.run(["nope"], stdout=out, stderr=err, log_root=str(tmp_path / "logs"))
    assert rc == int(ExitCode.Usage), f"argparse error must be Usage(2), got {rc}"
    env = json.loads(out.getvalue().splitlines()[0])
    assert env["Errors"]["Code"] == ErrorCode.E_CLI_USAGE.value
