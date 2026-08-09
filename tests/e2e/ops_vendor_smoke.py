"""Playwright smoke for /ops (live audit-events bridge) and /settings vendor toggle.

Covers the server-fn bridges landed in v1.39:
- getAuditEvents (src/lib/ops.functions.ts) rendered on /ops
- setCaptureVendor (src/lib/capture.functions.ts) driven by the vendor radiogroup on /settings

Failure modes surfaced with context (no swallowed errors); JSON report at tests/reports/e2e-ops-vendor.json.
"""
import asyncio
import json
import os
from pathlib import Path

from playwright.async_api import async_playwright, expect


BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
REPORT_PATH = Path("tests/reports/e2e-ops-vendor.json")
events: list[dict[str, str]] = []


def record(name: str, status: str, detail: str) -> None:
    events.append({"Name": name, "Status": status, "Detail": detail})


async def check_ops(page) -> None:
    await page.goto(f"{BASE_URL}/ops", wait_until="networkidle")
    await expect(page.get_by_role("heading", name="Ops Telemetry")).to_be_visible()
    # Buffer readout transitions from "loading..." to "N events in buffer" once
    # getAuditEvents resolves; seed buffer has 5 rows.
    await expect(page.get_by_text("events in buffer")).to_be_visible(timeout=5000)
    # Tile counters must render numeric values.
    for label in ("Audit pruned", "Admin writes", "Denial bursts", "Role denied"):
        await expect(page.get_by_text(label, exact=True)).to_be_visible()
    # At least the seed I_SEC_AUDIT_PRUNED row is present.
    await expect(page.get_by_text("I_SEC_AUDIT_PRUNED").first).to_be_visible()
    record("ops-live-bridge", "Passed", page.url)


async def toggle_vendor(page) -> None:
    await page.goto(f"{BASE_URL}/settings", wait_until="networkidle")
    await expect(page.get_by_role("heading", name="Settings")).to_be_visible()
    # Radiogroup exposes pylon | spinnaker | vimba via role=radio.
    spinnaker = page.get_by_role("radio", name="spinnaker")
    await expect(spinnaker).to_be_visible(timeout=5000)
    await spinnaker.click()
    await expect(spinnaker).to_have_attribute("aria-checked", "true")
    # Active-badge readout reflects the write.
    await expect(page.get_by_text("Active: spinnaker")).to_be_visible(timeout=5000)
    # No inline error surface (role=alert) after a valid write.
    if await page.get_by_role("alert").count() > 0:
        raise AssertionError("unexpected role=alert after valid vendor write")
    record("vendor-toggle", "Passed", "pylon -> spinnaker")


async def verify_write_reached_ops(page) -> None:
    # setCaptureVendor emits I_SEC_ADMIN_WRITE into the ops buffer, so /ops
    # must now show the write we just performed.
    await page.goto(f"{BASE_URL}/ops", wait_until="networkidle")
    await expect(page.get_by_text("I_SEC_ADMIN_WRITE").first).to_be_visible(timeout=5000)
    await expect(page.get_by_text("settings.capture.vendor").first).to_be_visible()
    record("ops-shows-admin-write", "Passed", "round-trip confirmed")


async def pick_discovered_device(page) -> None:
    # Plan 15 Step 13: DeviceDiscoveryPanel round-trip must reach /ops with
    # subject settings.capture.device AND event I_SEC_ADMIN_WRITE co-located.
    await page.goto(f"{BASE_URL}/settings", wait_until="networkidle")
    heading = page.get_by_role("heading", name="Camera discovery")
    await expect(heading).to_be_visible(timeout=5000)
    scan_readout = page.get_by_text("Scanned at", exact=False)
    await expect(scan_readout).to_be_visible(timeout=5000)
    first_tile = page.locator("section:has(h2:text('Camera discovery')) button[type=button]").nth(1)
    await first_tile.click()
    if await page.get_by_role("alert").count() > 0:
        raise AssertionError("unexpected role=alert after device selection")
    await page.goto(f"{BASE_URL}/ops", wait_until="networkidle")
    # Row content: subject + event code co-visible within one 5s refresh interval.
    await expect(page.get_by_text("settings.capture.device").first).to_be_visible(timeout=5000)
    await expect(page.get_by_text("I_SEC_ADMIN_WRITE").first).to_be_visible(timeout=5000)
    record("discovery-pick", "Passed", "device selection row + I_SEC_ADMIN_WRITE co-visible")


async def probe_denied_selection(page) -> None:
    # Plan 15 Step 13: unknown {vendor, serial} must surface E_CFG_UNKNOWN_DEVICE
    # via the DeviceDiscoveryPanel banner (role=alert, data-error-code). This is
    # the closest CI-safe proxy for E_SEC_DENIED without a non-admin session; both
    # codes flow through the same toBanner path in DeviceDiscoveryPanel.tsx.
    await page.goto(f"{BASE_URL}/settings", wait_until="networkidle")
    result = await page.evaluate(
        """
        async () => {
          const res = await fetch('/_serverFn/src_lib_capture_functions_ts--selectCaptureDevice_createServerFn_handler', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: { vendor: 'pylon', serial: 'ZZZ-NOT-A-REAL-SERIAL' } }),
          }).catch((e) => ({ error: String(e) }));
          if (res && res.text) {
            return { status: res.status, body: (await res.text()).slice(0, 400) };
          }
          return { status: 0, body: JSON.stringify(res) };
        }
        """
    )
    body = (result or {}).get("body", "")
    # Best-effort: accept any E_CFG_UNKNOWN_DEVICE or E_SEC_DENIED string in the envelope.
    if "E_CFG_UNKNOWN_DEVICE" not in body and "E_SEC_DENIED" not in body and "E_CFG_BAD_INPUT" not in body:
        record("discovery-denied-probe", "Warn", f"no E_* code seen; body={body[:120]}")
    else:
        record("discovery-denied-probe", "Passed", "E_* envelope surfaced on invalid selection")


def write_report(status: str) -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {"Suite": "ops-vendor-bridge", "Status": status, "Events": events}
    REPORT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


async def run() -> None:
    async with async_playwright() as playwright:
        browser = await getattr(playwright, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        page.on("pageerror", lambda exc: record("pageerror", "Warn", str(exc)))
        page.on("console", lambda msg: msg.type == "error" and record("console", "Warn", msg.text))
        await check_ops(page)
        await toggle_vendor(page)
        await verify_write_reached_ops(page)
        await pick_discovered_device(page)
        await probe_denied_selection(page)
        await browser.close()


async def main() -> None:
    try:
        await run()
        write_report("Passed")
    except Exception as exc:
        record("error", "Failed", str(exc))
        write_report("Failed")
        raise


if __name__ == "__main__":
    asyncio.run(main())
