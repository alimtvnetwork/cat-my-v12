/**
 * Targeted structural regression check for the app header and the
 * offline-worker notice (issue: header errors / broken placement).
 *
 * Complements the pixel-diff gate in routes.spec.ts with cheap DOM
 * assertions that catch two recurring regressions:
 *
 *  1. Error/offline text leaking back into the `<header>` region.
 *  2. The WorkerHealthBanner losing its top-right fixed placement or
 *     being re-parented into the header chrome.
 *
 * No baseline files required, so this stays green in fresh checkouts.
 */
import { test, expect, chromium, type Browser } from "@playwright/test";

const BASE_URL = process.env.VISUAL_BASE_URL ?? "http://localhost:8080";
const EXECUTABLE_PATH = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;

/** Substrings that must never appear inside the app `<header>`. */
const FORBIDDEN_HEADER_TEXT = [
  /worker offline/i,
  /unreachable/i,
  /fall back to the stub scorer/i,
  /checking python worker/i,
];

let browser: Browser;

test.beforeAll(async () => {
  browser = await chromium.launch({ headless: true, executablePath: EXECUTABLE_PATH });
});

test.afterAll(async () => {
  await browser.close();
});

test("header stays clean on /setup (no worker error text leaks in)", async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/setup`, { waitUntil: "networkidle", timeout: 30_000 });

  // Exactly one `<header>` (SS-04 invariant). If this ever regresses, the
  // downstream text assertions become ambiguous, so check it up front.
  const headerCount = await page.locator("header").count();
  expect(headerCount, "exactly one <header> element").toBe(1);

  const headerText = (await page.locator("header").innerText()).replace(/\s+/g, " ");
  for (const pattern of FORBIDDEN_HEADER_TEXT) {
    expect(headerText, `forbidden text in header: ${pattern}`).not.toMatch(pattern);
  }

  await context.close();
});

test("worker health notice, when shown, is a fixed top-right card outside the header", async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/setup`, { waitUntil: "networkidle", timeout: 30_000 });

  const banner = page.getByTestId("setup-worker-health-banner");
  const visible = await banner.count();
  if (visible === 0) {
    // Silent-by-design states (loading, ok, not-configured, dismissed).
    // Nothing to assert on placement; the header assertion above already
    // guarantees no leftover chrome in that case.
    await context.close();
    test.info().annotations.push({ type: "note", description: "banner hidden (silent state)" });
    return;
  }

  // Must not be nested inside the <header>.
  const insideHeader = await banner.evaluate((el) => !!el.closest("header"));
  expect(insideHeader, "worker notice must not live inside <header>").toBe(false);

  // Must be `position: fixed` and anchored to the top-right of the viewport.
  const box = await banner.boundingBox();
  const position = await banner.evaluate((el) => getComputedStyle(el).position);
  expect(position, "worker notice is a fixed floating card").toBe("fixed");
  expect(box, "worker notice has a bounding box").not.toBeNull();
  if (box) {
    const viewport = page.viewportSize()!;
    expect(box.x + box.width, "anchored to right edge").toBeGreaterThan(viewport.width * 0.6);
    expect(box.y, "anchored near the top").toBeLessThan(viewport.height * 0.3);
  }

  // Must expose a dismiss control.
  await expect(page.getByTestId("setup-worker-health-banner-dismiss")).toBeVisible();

  await context.close();
});

/**
 * Plan 71 Step 17: viewport-safe regression.
 *
 * Enforces `.lovable/spec/commands/25-hide-clipped-floating-notices.md`:
 * at any viewport width the WorkerHealthBanner MUST either be hidden or
 * fit fully inside the viewport. Overflow at any width is a hard fail.
 */
const VIEWPORT_WIDTHS = [360, 480, 768, 1024, 1280, 1600];

for (const width of VIEWPORT_WIDTHS) {
  test(`worker notice never overflows viewport at width=${width}`, async () => {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/setup`, { waitUntil: "networkidle", timeout: 30_000 });

    const banner = page.getByTestId("setup-worker-health-banner");
    const count = await banner.count();
    if (count === 0) {
      // Hidden (silent state or `useViewportSafe` suppressed it). This is
      // the spec-required outcome when the card would clip, so pass.
      await context.close();
      return;
    }

    const box = await banner.boundingBox();
    expect(box, `banner has a bounding box at width=${width}`).not.toBeNull();
    if (box) {
      expect(box.x, `banner left inside viewport at width=${width}`).toBeGreaterThanOrEqual(0);
      expect(box.y, `banner top inside viewport at width=${width}`).toBeGreaterThanOrEqual(0);
      expect(
        box.x + box.width,
        `banner right inside viewport at width=${width}`,
      ).toBeLessThanOrEqual(width);
      expect(
        box.y + box.height,
        `banner bottom inside viewport at width=${width}`,
      ).toBeLessThanOrEqual(900);
    }

    await context.close();
  });
}

test("worker notice Details button opens the Global Error Modal", async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/setup`, { waitUntil: "networkidle", timeout: 30_000 });

  const details = page.getByTestId("setup-worker-health-banner-details");
  const visible = await details.count();
  if (visible === 0) {
    // Banner not shown (worker healthy or hidden). Nothing to click, and
    // spec §04-error-modal only requires the wiring when a producer fires.
    await context.close();
    test
      .info()
      .annotations.push({ type: "note", description: "details button not present (silent state)" });
    return;
  }

  await details.first().click();
  // Radix Dialog exposes role="dialog"; the modal renders inside a portal
  // outside <header>, so scope the query to the document.
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible({ timeout: 5_000 });

  await context.close();
});
