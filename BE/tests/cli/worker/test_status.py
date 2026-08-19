"""Plan 90 Step 48 tests - `worker-cli status` read-only reporter.

Locks:
- Idle: Lease=None, Stream=None, exit Ok.
- Lease-only: reports Serial/Pid/RunId, PidAlive=True, StreamStaleLease=False.
- Lease + matching stream: both payloads, no mismatch flags.
- Stream marker without lease -> StreamStaleLease=True (still Ok; reporter
  is a diagnostic, never a fixer).
- Marker+lease serial mismatch -> StreamSerialMismatch=True.
- Vendor provider rejected with E_CLI_UNSUPPORTED_HOST / VendorError.
- Corrupt marker file -> E_CLI_PREFLIGHT_FAILED (peek contract).
- Status has zero mutations: files unchanged before/after.
"""

from __future__ import annotations

import io
import json
import os

from BE.cli.common.exit_codes import ExitCode
from BE.cli.worker import camera_lease, stream_marker
from BE.cli.worker.main import build_dispatcher


def _run(argv, tmp_path, monkeypatch):
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path / "logs"))
    monkeypatch.setenv("APP_DATA_ROOT", str(tmp_path / "data"))
    out, err = io.StringIO(), io.StringIO()
    code = build_dispatcher().run(argv, stdout=out, stderr=err, log_root=str(tmp_path / "logs"))
    lines = out.getvalue().splitlines()
    assert len(lines) == 1, out.getvalue() + "\n---\n" + err.getvalue()
    return code, json.loads(lines[0])


def _open(tmp_path, monkeypatch, serial="SN-STUB-0000"):
    code, _ = _run(["open", "--serial", serial], tmp_path, monkeypatch)
    assert code == ExitCode.Ok


def _start(tmp_path, monkeypatch, serial="SN-STUB-0000"):
    code, _ = _run(["stream", "start", "--serial", serial], tmp_path, monkeypatch)
    assert code == ExitCode.Ok


def _payload(env):
    return env["Results"][0]


def test_idle_state_reports_none(tmp_path, monkeypatch):
    code, env = _run(["status"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    p = _payload(env)
    assert p["Lease"] is None
    assert p["Stream"] is None
    assert p["StreamStaleLease"] is False
    assert p["StreamSerialMismatch"] is False
    assert p["Provider"] == "memory"


def test_lease_only_reports_lease(tmp_path, monkeypatch):
    _open(tmp_path, monkeypatch, "SN-STUB-0000")
    code, env = _run(["status"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    p = _payload(env)
    assert p["Lease"]["Serial"] == "SN-STUB-0000"
    assert p["Lease"]["Pid"] == os.getpid()
    assert p["Lease"]["PidAlive"] is True
    assert p["Stream"] is None
    assert p["StreamStaleLease"] is False


def test_lease_plus_matching_stream(tmp_path, monkeypatch):
    _open(tmp_path, monkeypatch, "SN-STUB-0000")
    _start(tmp_path, monkeypatch, "SN-STUB-0000")
    code, env = _run(["status"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    p = _payload(env)
    assert p["Lease"]["Serial"] == "SN-STUB-0000"
    assert p["Stream"]["Serial"] == "SN-STUB-0000"
    assert p["StreamStaleLease"] is False
    assert p["StreamSerialMismatch"] is False


def test_stream_marker_without_lease_flags_stale(tmp_path, monkeypatch):
    # Fabricate a marker on disk without acquiring a lease.
    data_root = tmp_path / "data"
    (data_root / "worker").mkdir(parents=True, exist_ok=True)
    stream_marker.start(data_root, serial="SN-STUB-0000", pid=os.getpid(), run_id="run-x", started_at="2026-01-01T00:00:00Z")
    code, env = _run(["status"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    p = _payload(env)
    assert p["Lease"] is None
    assert p["Stream"]["Serial"] == "SN-STUB-0000"
    assert p["StreamStaleLease"] is True


def test_serial_mismatch_flag(tmp_path, monkeypatch):
    _open(tmp_path, monkeypatch, "SN-STUB-0000")
    # Marker for a different serial.
    stream_marker.start(tmp_path / "data", serial="SN-STUB-0001", pid=os.getpid(), run_id="run-x", started_at="2026-01-01T00:00:00Z")
    code, env = _run(["status"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    p = _payload(env)
    assert p["StreamSerialMismatch"] is True


def test_vendor_provider_rejected(tmp_path, monkeypatch):
    code, env = _run(["status", "--provider", "vendor"], tmp_path, monkeypatch)
    assert code == ExitCode.VendorError
    assert env["Errors"]["Code"] == "E_CLI_UNSUPPORTED_HOST"


def test_corrupt_marker_surfaces_preflight_failed(tmp_path, monkeypatch):
    data_root = tmp_path / "data"
    (data_root / "worker").mkdir(parents=True, exist_ok=True)
    (data_root / "worker" / stream_marker.MARKER_FILENAME).write_text("{not json", encoding="utf-8")
    code, env = _run(["status"], tmp_path, monkeypatch)
    assert code != ExitCode.Ok
    assert env["Errors"]["Code"] == "E_CLI_PREFLIGHT_FAILED"


def test_status_is_side_effect_free(tmp_path, monkeypatch):
    _open(tmp_path, monkeypatch, "SN-STUB-0000")
    _start(tmp_path, monkeypatch, "SN-STUB-0000")
    data_root = tmp_path / "data"
    lease_before = (data_root / "worker" / camera_lease.LEASE_FILENAME).read_bytes()
    marker_before = (data_root / "worker" / stream_marker.MARKER_FILENAME).read_bytes()
    code, _ = _run(["status"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    assert (data_root / "worker" / camera_lease.LEASE_FILENAME).read_bytes() == lease_before
    assert (data_root / "worker" / stream_marker.MARKER_FILENAME).read_bytes() == marker_before
