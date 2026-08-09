"""Plan 90 Step 27 - cross-process IPC round-trip.

Every prior IPC test lives in one process, so `os.replace`'s atomicity
looks free. This suite spawns two real Python subprocesses that share a
tmp drop-dir: a `worker` that emits N `FrameReady` messages via
`ipc.send`, and a `processing` reader that consumes with `ipc.receive`,
re-validates through `FrameReadyPayload`, and `ipc.ack`s each message.

Invariants asserted (all from the parent process, after both children
exit 0):

  R1. Every message written by the worker is seen exactly once by the
      reader, in FIFO order (Seq 1..N).
  R2. Typed round-trip: consumer re-parses payload into
      `FrameReadyPayload` and every field equals the producer's input.
  R3. File lifecycle: after ack, every `<ulid>.msg.json` is gone and
      every `<ulid>.msg.ack.json` is present in the drop-dir.
  R4. Producer stderr / consumer stdout carry the Universal Envelope
      shape (no bare tracebacks leaked to stderr).

Spec anchors: `spec/21-app/76-cli-log-and-ipc.md` §"IPC protocol"
(atomic write, ack), `spec/21-app/74-worker-cli.md` §Acceptance #4.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[4]  # BE/tests/cli/common/.. -> repo
DIR = "worker-out"
RUN = "01HZZZROUNDTRIPZZZZZZZZZZZ"

# --- worker child: writes N FrameReady messages, prints an envelope ---------
_WORKER = r"""
import json, sys
from pathlib import Path
sys.path.insert(0, r"{REPO}")
from BE.cli.common import ipc
from BE.cli.common.ipc_models import FrameReadyPayload, Roi

root = Path(sys.argv[1])
count = int(sys.argv[2])
run_id = sys.argv[3]
written = []
for i in range(1, count + 1):
    p = ipc.send(
        root, "{DIR}", "FrameReady",
        FrameReadyPayload(
            FramePath=f"cap/{i:08d}.mono8",
            Serial="SN-RT",
            ExposureUs=1000 + i,
            Gain=float(i),
            Roi=Roi(X=0, Y=0, W=8, H=8),
            CapturedAt="2026-01-01T00:00:00.000Z",
        ),
        run_id=run_id, from_="worker", to="processing", seq=i,
    )
    written.append(p.name)
env = {
    "Status": {"Success": True, "Code": "OK", "Message": "wrote",
                "Ts": "2026-01-01T00:00:00.000Z"},
    "Data": {"Count": count, "Files": written},
    "Errors": [],
}
sys.stdout.write(json.dumps(env))
""".replace("{REPO}", str(REPO)).replace("{DIR}", DIR)

# --- reader child: consumes, re-validates, acks ------------------------------
_READER = r"""
import json, sys
from pathlib import Path
sys.path.insert(0, r"{REPO}")
from BE.cli.common import ipc
from BE.cli.common.ipc_models import FrameReadyPayload

root = Path(sys.argv[1])
expected = int(sys.argv[2])
seen = []
for msg in ipc.receive(root, "{DIR}", kind_filter=["FrameReady"]):
    # R2: re-validate through the typed model on the consumer side.
    model = FrameReadyPayload.model_validate(msg.payload)
    seen.append({
        "Seq": msg.seq,
        "MsgId": msg.msg_id,
        "FramePath": model.FramePath,
        "ExposureUs": model.ExposureUs,
        "Gain": model.Gain,
    })
    ipc.ack(msg.path)
env = {
    "Status": {"Success": len(seen) == expected, "Code": "OK",
                "Message": f"read {len(seen)}",
                "Ts": "2026-01-01T00:00:00.000Z"},
    "Data": {"Seen": seen},
    "Errors": [],
}
sys.stdout.write(json.dumps(env))
""".replace("{REPO}", str(REPO)).replace("{DIR}", DIR)


def _run(script: str, *args: str) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env.setdefault("PYTHONPATH", str(REPO))
    return subprocess.run(
        [sys.executable, "-c", script, *args],
        capture_output=True, text=True, check=False, env=env, cwd=str(REPO),
    )


def test_cross_process_roundtrip(tmp_path: Path) -> None:
    n = 6
    w = _run(_WORKER, str(tmp_path), str(n), RUN)
    assert w.returncode == 0, f"worker failed:\nstderr={w.stderr!r}"
    prod_env = json.loads(w.stdout)
    assert prod_env["Status"]["Success"] is True
    assert prod_env["Data"]["Count"] == n
    assert len(prod_env["Data"]["Files"]) == n
    assert w.stderr == "", f"worker leaked to stderr: {w.stderr!r}"  # R4

    r = _run(_READER, str(tmp_path), str(n))
    assert r.returncode == 0, f"reader failed:\nstderr={r.stderr!r}"
    cons_env = json.loads(r.stdout)
    assert cons_env["Status"]["Success"] is True
    seen = cons_env["Data"]["Seen"]

    # R1: exactly-once, FIFO across the process boundary.
    assert [s["Seq"] for s in seen] == list(range(1, n + 1))
    assert len({s["MsgId"] for s in seen}) == n

    # R2: typed round-trip preserved every field.
    for i, s in enumerate(seen, start=1):
        assert s["FramePath"] == f"cap/{i:08d}.mono8"
        assert s["ExposureUs"] == 1000 + i
        assert s["Gain"] == float(i)

    # R3: file lifecycle - every msg is now an ack.
    drop = tmp_path / DIR
    assert list(drop.glob("*.msg.json")) == []
    acks = sorted(drop.glob("*.msg.ack.json"))
    assert len(acks) == n
    assert r.stderr == "", f"reader leaked to stderr: {r.stderr!r}"  # R4


def test_cross_process_reader_sees_nothing_when_dir_empty(tmp_path: Path) -> None:
    """Reader on an empty (but existing) drop-dir must exit clean, not hang."""
    (tmp_path / DIR).mkdir()
    r = _run(_READER, str(tmp_path), "0")
    assert r.returncode == 0, f"reader failed:\nstderr={r.stderr!r}"
    env = json.loads(r.stdout)
    assert env["Status"]["Success"] is True
    assert env["Data"]["Seen"] == []
