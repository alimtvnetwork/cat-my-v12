"""Plan 80 step 49: end-to-end coverage for the live-camera capture flow
wired into `ImageSamplesSection` (Plan 80 step 47) and the typed
permission banner (Plan 80 step 48).

Two scenarios run in isolated browser contexts against the running dev
server:

  1. HAPPY  - `getUserMedia` returns a canvas-backed MediaStream. Clicking
              "Capture from live camera" persists +1 ImageSample and the
              new thumbnail appears in the grid. No permission banner.
  2. DENIED - `getUserMedia` throws `NotAllowedError`. The permission
              banner renders with `data-permission-code`
              = `E_CAMERA_PERMISSION_DENIED` and a Retry button (actionable
              codes only).

Fixtures mirror `tests/visual/fixtures.ts` (bound project + one
CameraSetting) so `ImageSamplesSection` sees `cameraBound === true` and
enables the Capture button.
"""
import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
SHOTS = Path("/tmp/browser/live-capture/shots")
SHOTS.mkdir(parents=True, exist_ok=True)

# Fake getUserMedia: canvas.captureStream so <video> loadedmetadata resolves.
INIT_HAPPY = """
(() => {
  const c = document.createElement('canvas');
  c.width = 320; c.height = 240;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c0ffee';
  ctx.fillRect(0,0,320,240);
  const fakeStream = c.captureStream(15);
  const md = navigator.mediaDevices || {};
  md.getUserMedia = async () => fakeStream;
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, get: () => md });
})();
"""

INIT_DENIED = """
(() => {
  const md = navigator.mediaDevices || {};
  md.getUserMedia = async () => {
    const e = new Error('perm denied');
    e.name = 'NotAllowedError';
    throw e;
  };
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, get: () => md });
})();
"""

async def seed(page):
    await page.goto(BASE)
    await page.evaluate("""
      ({projectsKey, projectsValue, cameraKey, cameraValue}) => {
        localStorage.setItem(projectsKey, projectsValue);
        localStorage.setItem(cameraKey, cameraValue);
      }
    """, {
        "projectsKey": "ca:projects:v1",
        "projectsValue": '{"state":{"projects":{"p-fixture-bound-0001":{"id":"p-fixture-bound-0001","name":"Fixture Project (bound)","createdAt":1700000000000,"rulesetIds":[],"cameraSettingId":"cam-fixture-0001"}},"rulesets":{}},"version":0}',
        "cameraKey": "ca.camera.library.v1",
        "cameraValue": '{"entries":[{"id":"cam-fixture-0001","name":"Fixture Camera","vendor":"GenericV4L2","deviceSerial":"SN-FIX","fovMmW":100,"fovMmH":75,"resolutionW":1920,"resolutionH":1080,"exposureUs":5000,"gainDb":0,"gamma":1,"whiteBalanceKelvin":0,"focusMode":"Auto","triggerMode":"Software","frameRateHz":30,"pockets":1,"roi":null,"colorMode":"Mono8","notes":"","createdAt":1700000000000,"updatedAt":1700000000000}]}',
    })

async def run():
    async with async_playwright() as pw:
        browser = await getattr(pw, __import__('os').environ.get('E2E_BROWSER', 'chromium')).launch(headless=True, args=["--use-fake-ui-for-media-stream"])
        # ---- Happy path ----
        ctx = await browser.new_context(viewport={"width":1280,"height":1200})
        await ctx.add_init_script(INIT_HAPPY)
        page = await ctx.new_page()
        console_msgs = []
        page.on("console", lambda m: console_msgs.append(f"[{m.type}] {m.text}"))
        await seed(page)
        await page.goto(f"{BASE}/projects/p-fixture-bound-0001", wait_until="commit")
        # Wait for the samples section to render.
        await page.wait_for_selector('[data-testid="samples-capture-btn"]', timeout=10000)
        await page.screenshot(path=str(SHOTS / "1_before.png"))
        before = await page.evaluate("() => document.querySelectorAll('[data-testid=\"project-editor-image-samples\"] img').length")
        await page.click('[data-testid="samples-capture-btn"]')
        # Wait for a new image sample to appear.
        await page.wait_for_function(
            "(prev) => document.querySelectorAll('[data-testid=\"project-editor-image-samples\"] img').length > prev",
            arg=before, timeout=8000,
        )
        after = await page.evaluate("() => document.querySelectorAll('[data-testid=\"project-editor-image-samples\"] img').length")
        await page.screenshot(path=str(SHOTS / "2_after_happy.png"))
        assert after == before + 1, f"expected +1 sample, before={before}, after={after}"
        # No permission banner in happy path.
        assert await page.query_selector('[data-testid="samples-permission-banner"]') is None
        print(f"HAPPY OK before={before} after={after}")
        await ctx.close()

        # ---- Permission denied ----
        ctx2 = await browser.new_context(viewport={"width":1280,"height":1200})
        await ctx2.add_init_script(INIT_DENIED)
        page2 = await ctx2.new_page()
        page2.on("console", lambda m: console_msgs.append(f"[denied {m.type}] {m.text}"))
        await seed(page2)
        await page2.goto(f"{BASE}/projects/p-fixture-bound-0001", wait_until="commit")
        await page2.wait_for_selector('[data-testid="samples-capture-btn"]', timeout=10000)
        await page2.click('[data-testid="samples-capture-btn"]')
        banner = await page2.wait_for_selector('[data-testid="samples-permission-banner"]', timeout=5000)
        code = await banner.get_attribute("data-permission-code")
        retry = await page2.query_selector('[data-testid="samples-permission-retry"]')
        await page2.screenshot(path=str(SHOTS / "3_denied.png"))
        assert code == "E_CAMERA_PERMISSION_DENIED", f"unexpected code: {code}"
        assert retry is not None, "retry button missing for actionable code"
        print(f"DENIED OK code={code}")
        await ctx2.close()

        await browser.close()
        # Print any warnings/errors from console for diagnostics.
        for m in console_msgs[-30:]:
            if 'error' in m or 'warn' in m:
                print(m)

asyncio.run(run())
