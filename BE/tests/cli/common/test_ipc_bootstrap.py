"""Plan 90 Step 31 tests for `BE/cli/common/ipc_bootstrap.py`.

Coverage:
- B1: fresh bootstrap creates all four drop dirs.
- B2: idempotent re-run creates nothing, reports `existing`.
- B3: `link_consumers=True` links processing-in -> worker-out and
      main-in -> processing-out (POSIX symlink path).
- B4: `link_consumers=False` produces four independent directories.
- B5: producer writes to worker-out are visible via processing-in link.
- B6: symlink-failure fallback on non-Windows degrades to standalone with
      a recorded link_failure (no crash).
- B7: unwritable ipc_root raises `E_IPC_WRITE_FAILED`.
- B8: pre-existing plain dir at consumer path is not clobbered; reported
      as standalone with a failure message.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

from BE.cli.common.ipc_bootstrap import (
    DROP_DIRS,
    LINK_MAP,
    bootstrap_ipc_dirs,
)
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def test_b1_fresh_bootstrap_creates_all_drop_dirs(tmp_path: Path) -> None:
    report = bootstrap_ipc_dirs(tmp_path / "ipc")
    for name in DROP_DIRS:
        assert (tmp_path / "ipc" / name).is_dir()
    assert set(report.created) == set(DROP_DIRS)
    assert report.existing == ()


def test_b2_idempotent_second_run_reports_existing(tmp_path: Path) -> None:
    bootstrap_ipc_dirs(tmp_path / "ipc")
    report = bootstrap_ipc_dirs(tmp_path / "ipc")
    assert report.created == ()
    assert set(report.existing) == set(DROP_DIRS)


@pytest.mark.skipif(sys.platform.startswith("win"), reason="POSIX symlink path")
def test_b3_consumer_dirs_are_linked_on_posix(tmp_path: Path) -> None:
    report = bootstrap_ipc_dirs(tmp_path / "ipc")
    for consumer, producer in LINK_MAP.items():
        link = tmp_path / "ipc" / consumer
        assert link.is_symlink()
        assert Path(os.readlink(link)) == (tmp_path / "ipc" / producer)
        assert report.link_kind[consumer] == "symlink"
        assert report.linked[consumer] == producer
    assert report.link_failures == {}


def test_b4_link_consumers_false_makes_independent_dirs(tmp_path: Path) -> None:
    report = bootstrap_ipc_dirs(tmp_path / "ipc", link_consumers=False)
    for name in DROP_DIRS:
        p = tmp_path / "ipc" / name
        assert p.is_dir()
        assert not p.is_symlink()
    for consumer in LINK_MAP:
        assert report.link_kind[consumer] == "standalone"
    assert report.linked == {}


@pytest.mark.skipif(sys.platform.startswith("win"), reason="POSIX symlink path")
def test_b5_write_to_producer_is_visible_via_consumer_link(tmp_path: Path) -> None:
    bootstrap_ipc_dirs(tmp_path / "ipc")
    payload = tmp_path / "ipc" / "worker-out" / "hello.txt"
    payload.write_text("hi")
    seen = tmp_path / "ipc" / "processing-in" / "hello.txt"
    assert seen.exists()
    assert seen.read_text() == "hi"


@pytest.mark.skipif(sys.platform.startswith("win"), reason="POSIX fallback")
def test_b6_symlink_failure_degrades_to_standalone(tmp_path: Path) -> None:
    with patch(
        "BE.cli.common.ipc_bootstrap._try_symlink",
        side_effect=OSError("simulated EPERM"),
    ):
        report = bootstrap_ipc_dirs(tmp_path / "ipc")
    for consumer in LINK_MAP:
        p = tmp_path / "ipc" / consumer
        assert p.is_dir()
        assert not p.is_symlink()
        assert report.link_kind[consumer] == "standalone"
        assert "simulated EPERM" in report.link_failures[consumer]
    # Producers still real.
    assert (tmp_path / "ipc" / "worker-out").is_dir()


def test_b7_unwritable_ipc_root_raises_e_ipc_write_failed(tmp_path: Path) -> None:
    bogus = tmp_path / "does-not-exist" / "nested"
    with patch("pathlib.Path.mkdir", side_effect=OSError("boom")):
        with pytest.raises(AppError) as exc_info:
            bootstrap_ipc_dirs(bogus)
    assert exc_info.value.code == ErrorCode.E_IPC_WRITE_FAILED


def test_b8_preexisting_plain_dir_at_consumer_is_not_clobbered(
    tmp_path: Path,
) -> None:
    root = tmp_path / "ipc"
    (root / "processing-in").mkdir(parents=True)
    (root / "processing-in" / "sentinel").write_text("keep-me")
    report = bootstrap_ipc_dirs(root)
    assert (root / "processing-in" / "sentinel").read_text() == "keep-me"
    assert report.link_kind["processing-in"] == "standalone"
    assert "already exists" in report.link_failures["processing-in"]
