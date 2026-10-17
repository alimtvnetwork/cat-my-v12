/**
 * Header spacing regression gate.
 *
 * The single app `<header>` (SS-04) has repeatedly regressed with
 * accidental large vertical gaps (extra padding, stacked wrappers,
 * empty rows). This spec locks the geometry with cheap DOM measurements
 * so future edits cannot silently reintroduce the "why so many gaps"
 * issue the user has already flagged multiple times.
 *
 * Budgets are derived from src/styles.css tokens:
 *   --header-h: 40px (comfortable) / 32px (compact)
 *   --header-crumb-h: 24px (comfortable) / 22px (compact)
 *
 * We assert:
 *   1. Exactly one `<header>` (SS-04 invariant).
 *   2. Top row height matches `--header-h` exactly.
 *   3. Full header height stays within a tight ceiling per density
 *      (top row + breadcrumb + borders, no stray padding).
 *   4. Breadcrumb row sits flush under the top row (no vertical gap).
 *   5. Density toggle actually shrinks the header.
 */
import { test, expect, chromium, type Browser, type Page } from "@playwright/test";
import { settleForVisual } from "./_settle";

const BASE_URL = process.env.VISUAL_BASE_URL ?? "http://localhost:8080";
const EXECUTABLE_PATH = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;

/**
 * `useUiPrefsStore` (src/lib/ui-prefs-store.ts:307) persists through zustand's
 * `persist` middleware backed by `createFacadeStateStorage`
 * (src/lib/projects/facade.ts:101). Zustand expects the JSON envelope
 * `{ state: {...}, version }`, not a raw prefs object. Seeding the raw shape
 * (as this file previously did) makes hydration read `parsed.state === undefined`
 * and the store silently falls back to the default `headerDensity: "comfortable"`,
 * which was the root cause of "compact" tests measuring a 40px comfortable row.
 */
// Ceilings include the 1px bottom border on the top row plus the
// breadcrumb row. Anything larger means new chrome was added.
const MAX_TOTAL_H_COMFORTABLE = 80; // 40 top + ~28 crumb + borders + slack
const MAX_TOTAL_H_COMPACT = 68; //     32 top + ~24 crumb + borders + slack
const EXPECTED_TOP_H_COMFORTABLE = 40;
const EXPECTED_TOP_H_COMPACT = 32;

let browser: Browser;

test.beforeAll(async () => {
  browser = await chromium.launch({ headless: true, executablePath: EXECUTABLE_PATH });
});

test.afterAll(async () => {
  await browser.close();
});

/**
 * Facade hydration (IndexedDB via `createFacadeStateStorage`) is async and
 * `waitUntil: "networkidle"` does not await it. Titlebar (src/components/hmi/Titlebar.tsx:43)
 * writes `data-density={density}` from the store, so waiting for that attribute
 * is the deterministic signal that the seeded density has been applied.
 */
async function waitForDensity(page: Page, density: "comfortable" | "compact"): Promise<void> {
  await page.waitForSelector(`header[data-app-shell="true"][data-density="${density}"]`, {
    timeout: 5_000,
  });
}

async function applyDensity(page: Page, density: "comfortable" | "compact"): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => {});
      await page.waitForSelector('header[data-app-shell="true"]', { timeout: 10_000 });
      await page.evaluate(async (nextDensity) => {
        const win = window as unknown as {
          __useUiPrefsStore?: {
            getState: () => { setHeaderDensity: (d: string) => void };
          };
        };

        if (win.__useUiPrefsStore) {
          win.__useUiPrefsStore.getState().setHeaderDensity(nextDensity);

          return;
        }

        const mod = await import("/src/lib/stores/ui-prefs-store.ts");
        mod.useUiPrefsStore.getState().setHeaderDensity(nextDensity);
      }, density);
      await waitForDensity(page, density);

      return;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }

      await page.waitForTimeout(500);
    }
  }
}

async function seedDensityAndOpenSetup(
  page: Page,
  density: "comfortable" | "compact",
): Promise<void> {
  await page.addInitScript((nextDensity) => {
    window.localStorage.setItem(
      "ca.uiPrefs.v1",
      JSON.stringify({
        state: {
          showStatusBar: true,
          headerDensity: nextDensity,
          uiFlavor: "standard",
        },
        version: 0,
      }),
    );
  }, density);
  await page.goto(`${BASE_URL}/setup`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await applyDensity(page, density);
  await settleForVisual(page);
}

async function measureHeader(page: Page) {
  const header = page.locator("header[data-app-shell='true']");
  await expect(header, "single app header").toHaveCount(1);
  const topRow = header.locator("[data-app-shell-row='top']");
  const crumbRow = header.locator("[data-app-shell-row='breadcrumb']");
  const headerBox = await header.boundingBox();
  const topBox = await topRow.boundingBox();
  const crumbBox = (await crumbRow.count()) ? await crumbRow.boundingBox() : null;
  expect(headerBox, "header bbox").not.toBeNull();
  expect(topBox, "top-row bbox").not.toBeNull();
  return { headerBox: headerBox!, topBox: topBox!, crumbBox };
}

test("header spacing @ comfortable density stays tight", async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await seedDensityAndOpenSetup(page, "comfortable");

  const { headerBox, topBox, crumbBox } = await measureHeader(page);

  expect(Math.round(topBox.height), "top row height == --header-h").toBe(
    EXPECTED_TOP_H_COMFORTABLE,
  );
  expect(headerBox.height, "total header height ceiling").toBeLessThanOrEqual(
    MAX_TOTAL_H_COMFORTABLE,
  );

  if (crumbBox) {
    // Breadcrumb row must sit flush under the top row (< 2px gap tolerance
    // for subpixel rounding on the 1px border).
    const gap = crumbBox.y - (topBox.y + topBox.height);
    expect(gap, "no vertical gap between top row and breadcrumb").toBeLessThanOrEqual(2);
    expect(gap, "breadcrumb not floating above top row").toBeGreaterThanOrEqual(-1);
  }

  await context.close();
});

test("header spacing @ compact density stays tight", async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await seedDensityAndOpenSetup(page, "compact");

  const { headerBox, topBox, crumbBox } = await measureHeader(page);

  expect(Math.round(topBox.height), "top row height == --header-h").toBe(EXPECTED_TOP_H_COMPACT);
  expect(headerBox.height, "total header height ceiling").toBeLessThanOrEqual(MAX_TOTAL_H_COMPACT);

  if (crumbBox) {
    const gap = crumbBox.y - (topBox.y + topBox.height);
    expect(gap, "no vertical gap between top row and breadcrumb").toBeLessThanOrEqual(2);
    expect(gap, "breadcrumb not floating above top row").toBeGreaterThanOrEqual(-1);
  }

  await context.close();
});

test("compact density is strictly shorter than comfortable", async () => {
  async function totalHeight(density: "comfortable" | "compact"): Promise<number> {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await seedDensityAndOpenSetup(page, density);
    const box = await page.locator("header[data-app-shell='true']").boundingBox();
    await context.close();
    return box!.height;
  }

  const comfortable = await totalHeight("comfortable");
  const compact = await totalHeight("compact");
  expect(compact, "compact < comfortable").toBeLessThan(comfortable);
});
