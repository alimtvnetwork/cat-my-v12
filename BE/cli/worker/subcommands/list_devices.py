"""Plan 90 Step 44 - `worker-cli list-devices` subcommand.

Anchors:
- `spec/21-app/74-worker-cli.md` §Subcommands (canonical verb name
  `list-devices`) and §Acceptance #2 (returns Universal Envelope with
  `Results = [DeviceInfo,...]`; failures use `E_CAM_*` codes).
- `BE.sdk_facade.camera.InMemoryCameraFacade.list_devices` returns
  `list[DeviceInfo]` (frozen dataclass, snake_case attrs).
- `spec/21-app/76-cli-log-and-ipc.md` §"Stdout contract" (single envelope
  on stdout; JSONL log lines via the shared logger).

Contract:
    Args:
        --provider    memory | vendor (default memory; vendor is Phase 12).

    Result payload (`Results`, one dict per device, PascalCase per spec):
        [{"Serial", "Model", "Vendor", "Interface", "Status"}, ...]

    Failure paths:
        --provider vendor  -> `E_CLI_UNSUPPORTED_HOST` (ExitCode.VendorError).
        Facade raises      -> propagated; dispatcher maps `E_CAM_*` to the
                              failure envelope with the original code intact.

`probe` (Step 20) remains registered as the substrate smoke verb and now
delegates to the same in-facade path; `list-devices` is the spec-named
operator verb the FE, PowerShell wrappers, and installer post-checks
bind against.
"""

from __future__ import annotations

import argparse
from typing import Any

from BE.cli.common.session import SessionCtx
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode
from BE.sdk_facade.camera import InMemoryCameraFacade


def configure(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--provider",
        choices=["memory", "vendor"],
        default="memory",
        help="Which CameraFacade to enumerate. 'vendor' will be wired in Phase 12.",
    )


def handle(ns: argparse.Namespace, ctx: SessionCtx) -> list[dict[str, Any]]:
    if ns.provider == "vendor":
        # Real Daheng adapter is Plan 90 Phase 12. Fail loud (VendorError),
        # do NOT silently fall through to the in-memory facade.
        raise AppError(
            ErrorCode.E_CLI_UNSUPPORTED_HOST,
            "vendor CameraFacade not wired yet (Plan 90 Phase 12)",
            details={"Provider": "vendor"},
        )
    facade = InMemoryCameraFacade()
    devices = facade.list_devices()
    ctx.logger.log(
        "INFO", "list_devices.enumerated",
        f"Enumerated {len(devices)} device(s) via memory facade",
        ctx={"Count": len(devices), "Provider": ns.provider},
    )
    # DeviceInfo has snake_case attrs; the wire contract in
    # spec/21-app/74-worker-cli.md §Acceptance #2 is PascalCase.
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


__all__ = ["configure", "handle"]
