"""Plan 81 step 4: end-to-end coverage for the "no camera detected"
notice in `ImageSamplesSection`.

Mocks `navigator.mediaDevices.enumerateDevices` to return zero video
inputs while keeping `getUserMedia` present. The hot-plug subscription
(`watchCameraDevices`) reports 0 devices; the UI must render the
`samples-no-devices-notice` element and DISABLE the Capture button.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
SHOTS = Path("/tmp/browser/no-devices/shots")
SHOTS.mkdir(parents=True, exist_ok=True)

INIT_NO_DEVICES = """
(() => {
  const md = navigator.mediaDevices || {};
  md.enumerateDevices = async () => [
    { kind: 'audioinput', deviceId: 'a', groupId: 'g', label: '' },
  ];
  md.getUserMedia = async () => { const e = new Error('no dev'); e.name = 'NotFoundError'; throw e; };
  md.addEventListener = md.addEventListener || (() => {});
  md.removeEventListener = md.removeEventListener || (() => {});
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, get: () => md });
})();
"""

SEED = {
    "projectsKey": "ca:projects:v1",
    "projectsValue": '{"state":{"projects":{"p-fixture-bound-0001":{"id":"p-fixture-bound-0001","name":"Fixture Project (bound)","createdAt":1700000000000,"rulesetIds":[],"cameraSettingId":"cam-fixture-0001"}},"rulesets":{}},"version":0}',
    "cameraKey": "ca.camera.library.v1",
    "cameraValue": '{"entries":[{"id":"cam-fixture-0001","name":"Fixture Camera","vendor":"GenericV4L2","deviceSerial":"SN-FIX","fovMmW":100,"fovMmH":75,"resolutionW":1920,"resolutionH":1080,"exposureUs":5000,"gainDb":0,"gamma":1,"whiteBalanceKelvin":0,"focusMode":"Auto","triggerMode":"Software","frameRateHz":30,"pockets":1,"roi":null,"colorMode":"Mono8","notes":"","createdAt":1700000000000,"updatedAt":1700000000000}]}',
}

async def run():
    async with async_playwright() as pw:
        browser = await getattr(pw, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1200})
        await ctx.add_init_script(INIT_NO_DEVICES)
        page = await ctx.new_page()
        console_msgs = []
        page.on("console", lambda m: console_msgs.append(f"[{m.type}] {m.text}"))
        await page.goto(BASE)
        await page.evaluate(
            "({projectsKey,projectsValue,cameraKey,cameraValue})=>{localStorage.setItem(projectsKey,projectsValue);localStorage.setItem(cameraKey,cameraValue);}",
            SEED,
        )
        await page.goto(f"{BASE}/projects/p-fixture-bound-0001", wait_until="load")
        notice = await page.wait_for_selector('[data-testid="samples-no-devices-notice"]', timeout=10000)
        assert notice is not None, "no-devices notice missing"
        btn = await page.query_selector('[data-testid="samples-capture-btn"]')
        assert btn is not None, "capture button missing"
        disabled = await btn.get_attribute("disabled")
        aria_disabled = await btn.get_attribute("aria-disabled")
        await page.screenshot(path=str(SHOTS / "no_devices.png"))
        assert disabled is not None or aria_disabled == "true", (
            f"capture button not disabled: disabled={disabled} aria-disabled={aria_disabled}"
        )
        # devicechange log line should have fired at least once (count=0).
        assert any("devices changed" in m for m in console_msgs), (
            "expected [project-editor/samples] devices changed log line"
        )
        print(f"NO-DEVICES OK disabled={disabled} aria-disabled={aria_disabled}")
        await ctx.close()
        await browser.close()

asyncio.run(run())
