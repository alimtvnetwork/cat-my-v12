"""Vendor discovery aggregator (Plan 25 SS-05).

Anchor: spec/21-app/66-v2-vendor-discovery.md.

Merges `list_pylon_devices` / `list_spinnaker_devices` / `list_vimba_devices`
into a single `list[VendorDeviceDescriptor]`, deduped on `(vendor, serial)`.
Per-vendor failures do NOT abort the aggregate: the failing vendor is
skipped and a structured `W_DISCOVERY_PARTIAL` warning is logged with the
failing vendor and exception class name (spec 66 §Acceptance).

`resolve_selection(vendor, serial)` re-runs discovery and raises
`CaptureAdapterError(E_CFG_UNKNOWN_DEVICE)` when no descriptor matches,
matching `src/lib/capture.server.ts` behavior on the TS side.
"""
from __future__ import annotations

import logging
from typing import Callable, Iterable

from app.capture.vendor_device_io import (
    CaptureAdapterError,
    E_CFG_UNKNOWN_DEVICE,
    W_DISCOVERY_PARTIAL,
    VendorDeviceDescriptor,
)

logger = logging.getLogger(__name__)

VendorLister = Callable[[], list[VendorDeviceDescriptor]]


def _default_listers() -> dict[str, VendorLister]:
    # Lazy imports so a missing SDK on one vendor cannot break the module load.
    from app.capture.pylon_device_io import list_pylon_devices
    from app.capture.spinnaker_device_io import list_spinnaker_devices
    from app.capture.vimba_device_io import list_vimba_devices

    return {
        "pylon": lambda: list_pylon_devices(),
        "spinnaker": lambda: list_spinnaker_devices(),
        "vimba": lambda: list_vimba_devices(),
    }


def discover_all_devices(
    listers: dict[str, VendorLister] | None = None,
) -> list[VendorDeviceDescriptor]:
    """Aggregate discovery across all vendors, deduped on (vendor, serial)."""
    listers = listers if listers is not None else _default_listers()
    seen: set[tuple[str, str]] = set()
    out: list[VendorDeviceDescriptor] = []
    for vendor, lister in listers.items():
        try:
            rows: Iterable[VendorDeviceDescriptor] = lister()
        except BaseException as exc:
            logger.warning(
                "vendor_discovery.%s partial code=%s exc=%s",
                vendor,
                W_DISCOVERY_PARTIAL,
                type(exc).__name__,
                extra={"op": "discover", "vendor": vendor, "code": W_DISCOVERY_PARTIAL},
            )
            continue
        for row in rows:
            key = (row.vendor, row.serial)
            if key in seen:
                continue
            seen.add(key)
            out.append(row)
    logger.info("vendor_discovery.aggregate count=%d", len(out))
    return out


def resolve_selection(
    vendor: str,
    serial: str,
    listers: dict[str, VendorLister] | None = None,
) -> VendorDeviceDescriptor:
    """Return the descriptor matching (vendor, serial) or raise E_CFG_UNKNOWN_DEVICE."""
    for row in discover_all_devices(listers):
        if row.vendor == vendor and row.serial == serial:
            return row
    logger.error(
        "vendor_discovery.select unknown vendor=%s serial=%s code=%s",
        vendor,
        serial,
        E_CFG_UNKNOWN_DEVICE,
        extra={"op": "select", "vendor": vendor, "code": E_CFG_UNKNOWN_DEVICE},
    )
    raise CaptureAdapterError(E_CFG_UNKNOWN_DEVICE, vendor, f"serial={serial}")
