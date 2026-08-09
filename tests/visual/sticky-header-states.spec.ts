/**
 * Sticky header visual regression across main routes and UI states.
 *
 * Locks the single app `<header data-app-shell="true">` chrome (SS-04)
 * against three failure modes that have historically slipped through:
 *   - route-specific header regressions (breadcrumb, TopMenuBar active tab)
 *   - hover state flicker on the primary nav link
 *   - scroll compression / shadow / offset drift when content scrolls
 *
 * Screenshots are clipped to the header bounding box so unrelated body
 * churn does not falsely fail the gate. Baselines live next to the spec
 * under `tests/visual/sticky-header-states.spec.ts-snapshots/`.
 */
import { test, expect, type Page } from "@playwright/test";
import { HEADER_VISUAL_DIFF } from "./routes.config";
import { settleForVisual } from "./_settle";

const BASE_URL = process.env.VISUAL_BASE_URL ?? "http://localhost:8080";

/** Main routes the sticky header must render cleanly on. */
const ROUTES = [
  { slug: "home", path: "/" },
  { slug: "setup", path: "/setup" },
  { slug: "setup-rules", path: "/setup/rules" },
  { slug: "setup-camera", path: "/setup/camera" },
  { slug: "run", path: "/run" },
] as const;

const VIEWPORT = { width: 1280, height: 900 } as const;

/**
 * Per-image tolerance sourced from the single I-CX-04 seam
 * (`HEADER_VISUAL_DIFF` in `tests/visual/routes.config.ts`) so a
 * Plan 84 tightening of `maxDiffPixelRatio` reaches this spec
 * automatically. See `docs/plans/84/visual-tolerance-pin.md`.
 */
const SCREENSHOT_OPTS = HEADER_VISUAL_DIFF;

async function seedPrefs(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "ca.uiPrefs.v1",
      JSON.stringify({
        state: { showStatusBar: true, headerDensity: "comfortable" },
        version: 0,
      }),
    );
  });
}

async function gotoAndSettle(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle", timeout: 30_000 });
  const header = page.locator("header[data-app-shell='true']");
  await expect(header, "single app header present").toHaveCount(1);
  // Freeze any CSS transitions on the header so hover/scroll captures are stable.
  await page.addStyleTag({
    content: `
      header[data-app-shell='true'], header[data-app-shell='true'] * {
        transition: none !important;
        animation: none !important;
        caret-color: transparent !important;
      }
    `,
  });
  return header;
}

for (const route of ROUTES) {
  test.describe(`sticky header @ ${route.slug}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORT);
      await seedPrefs(page);
    });

    test("idle state", async ({ page }) => {
      const header = await gotoAndSettle(page, route.path);
      await expect(header).toHaveScreenshot(`header-${route.slug}-idle.png`, SCREENSHOT_OPTS);
    });

    test("hover state on primary nav", async ({ page }) => {
      const header = await gotoAndSettle(page, route.path);
      // Hover the first top-menu link if present; otherwise fall back to
      // hovering the header itself so the baseline still captures the
      // hover-inert surface for routes without a nav item exposed there.
      const navLink = header.locator("nav a, nav [role='link']").first();
      if (await navLink.count()) {
        await navLink.hover({ trial: false });
        await settleForVisual(page);
      } else {
        await header.hover();
        await settleForVisual(page);
      }
      await expect(header).toHaveScreenshot(`header-${route.slug}-hover.png`, SCREENSHOT_OPTS);
    });

    test("scrolled state stays sticky", async ({ page }) => {
      const header = await gotoAndSettle(page, route.path);
      const before = await header.boundingBox();
      // Scroll the main scroll container (or window) by a meaningful amount
      // so shadow / compression states, if any, kick in.
      await page.evaluate(() => {
        const main = document.querySelector("main#app-main") as HTMLElement | null;
        if (main && main.scrollHeight > main.clientHeight) {
          main.scrollTo({ top: 600, behavior: "instant" as ScrollBehavior });
        } else {
          window.scrollTo({ top: 600, behavior: "instant" as ScrollBehavior });
        }
      });
      await settleForVisual(page);
      const after = await header.boundingBox();
      expect(before, "header bbox before scroll").not.toBeNull();
      expect(after, "header bbox after scroll").not.toBeNull();
      // Sticky invariant: header top stays at viewport y=0 (within 1px).
      expect(Math.abs((after?.y ?? 0) - 0)).toBeLessThanOrEqual(1);
      // Height must not grow when scrolling; compact-on-scroll is allowed.
      expect(after!.height).toBeLessThanOrEqual(before!.height + 1);
      await expect(header).toHaveScreenshot(`header-${route.slug}-scrolled.png`, SCREENSHOT_OPTS);
    });
  });
}
