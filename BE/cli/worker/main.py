"""Plan 90 Step 20 - worker-cli entrypoint and first subcommand (`probe`).

Anchors:
- `spec/21-app/74-worker-cli.md` §"Subcommands" (probe listed first),
  §"Acceptance #1" (probe enumerates devices via SDK facade).
- `spec/21-app/76-cli-log-and-ipc.md` §"Stdout contract".
- Facade: `BE.sdk_facade.camera.InMemoryCameraFacade.list_devices` returns
  `list[DeviceInfo]` (see `BE/sdk_facade/__init__.py` line 70).

`main(argv=None) -> int` is the single canonical entry. The pyproject
`[project.scripts]` line binds `worker-cli` to `BE.cli.worker.main:main`
so PowerShell wrappers (Step 71) can invoke it without knowing about
Python paths.

`probe` is deliberately the first subcommand: it exercises the full
paths -> logger -> index -> session -> dispatcher -> facade spine with
zero side effects on real hardware, which is exactly what CI needs to
prove the substrate before we add capture subcommands (Step 21+).
"""

from __future__ import annotations

import argparse
import sys
from typing import Any

from BE.cli.common.dispatcher import Dispatcher, Subcommand
from BE.cli.common.doctor import assert_healthy, run_preflight
from BE.cli.common.session import SessionCtx
from BE.cli.worker.subcommands import capture as _capture
from BE.cli.worker.subcommands import capture_frames as _capture_frames
from BE.cli.worker.subcommands import close as _close
from BE.cli.worker.subcommands import list_devices as _list_devices
from BE.cli.worker.subcommands import open as _open
from BE.cli.worker.subcommands import open_stream as _open_stream
from BE.cli.worker.subcommands import status as _status
from BE.cli.worker.subcommands import stream as _stream
from BE.cli.worker.subcommands import version as _version


def _configure_probe(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--provider",
        choices=["inmemory", "daheng", "replay"],
        default="inmemory",
        help="Which CameraFacade to enumerate.",
    )


def _handle_probe(ns: argparse.Namespace, ctx: SessionCtx) -> list[dict[str, Any]]:
    from BE.sdk_facade import get_camera_facade
    facade = get_camera_facade(ns.provider)
    devices = facade.list_devices()
    ctx.logger.log(
        "INFO", "probe.enumerated",
        f"Enumerated {len(devices)} device(s) via memory facade",
        ctx={"Count": len(devices), "Provider": ns.provider},
    )
    # DeviceInfo is a frozen dataclass with PascalCase fields already,
    # except attribute names are snake_case. Map to spec-PascalCase.
    return [
        {
            "Serial": d.serial,
            "Model": d.model,
            "Vendor": d.vendor,
            "Interface": d.interface,
            "Status": d.status,
        }
        for d in devices
    ]


def _configure_doctor(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--db-root",
        default=None,
        help="Override APP_DB_ROOT for this probe (falls back to env, then OS default).",
    )


def _handle_doctor(ns: argparse.Namespace, ctx: SessionCtx) -> list[dict[str, Any]]:
    from pathlib import Path
    db_root = Path(ns.db_root) if ns.db_root else None
    summaries = run_preflight(ctx, db_root=db_root)
    # Raise AFTER computing summaries so the dispatcher's failure envelope
    # still surfaces per-probe detail via envelope Results + AppError.details.
    assert_healthy(summaries)
    return summaries



def build_dispatcher() -> Dispatcher:
    d = Dispatcher(
        prog="worker-cli",
        source="worker-cli",
        description="Vision worker CLI (Plan 90, spec/21-app/74).",
        helptext_package="BE.cli.worker.helptext",
    )
    d.register(Subcommand(
        name="probe",
        handler=_handle_probe,
        configure=_configure_probe,
        help="Enumerate Daheng Galaxy devices via the SDK facade.",
    ))
    d.register(Subcommand(
        name="list-devices",
        handler=_list_devices.handle,
        configure=_list_devices.configure,
        help="Enumerate cameras via CameraFacade.list_devices() (spec 74 §Acceptance #2).",
    ))
    d.register(Subcommand(
        name="open",
        handler=_open.handle,
        configure=_open.configure,
        help="Acquire the single-camera lease for the given serial (spec 74 §Acceptance #3).",
    ))
    d.register(Subcommand(
        name="close",
        handler=_close.handle,
        configure=_close.configure,
        help="Release the single-camera lease. Idempotent.",
    ))
    d.register(Subcommand(
        name="open-stream",
        handler=_open_stream.handle,
        configure=_open_stream.configure,
        help="Open a camera, start streaming, block until shutdown or bounded exit.",
    ))
    d.register(Subcommand(
        name="stream",
        handler=_stream.handle,
        configure=_stream.configure,
        help="Split-phase streaming: 'stream start|stop' on the held camera (spec 74 §Subcommands).",
    ))
    d.register(Subcommand(
        name="capture-frames",
        handler=_capture_frames.handle,
        configure=_capture_frames.configure,
        help="Bounded grab loop that hands each Frame to StorageFacade.put().",
    ))
    d.register(Subcommand(
        name="capture",
        handler=_capture.handle,
        configure=_capture.configure,
        help="Single-shot capture on the held camera; refuses when stream marker active (spec 74 §Acceptance #4).",
    ))
    d.register(Subcommand(
        name="doctor",
        handler=_handle_doctor,
        configure=_configure_doctor,
        help="Read-only preflight: verify all DB tiers match on-disk migrations.",
    ))
    d.register(Subcommand(
        name="status",
        handler=_status.handle,
        configure=_status.configure,
        help="Read-only reporter: current camera lease + stream marker state (spec 74 §Subcommands).",
    ))
    d.register(Subcommand(
        name="version",
        handler=_version.handle,
        configure=_version.configure,
        help="Emit {Name,Version,Commit,BuildDate} identity envelope (spec 74 §Subcommands).",
    ))
    return d


def main(argv: list[str] | None = None) -> int:
    return build_dispatcher().run(argv)


if __name__ == "__main__":  # pragma: no cover - script entry
    sys.exit(main(sys.argv[1:]))
