/**
 * Responsive regression: the right-side top menu (TopMenuBar) must never
 * overlap the center content (breadcrumb / main region) at common
 * breakpoints. Guards the 3-column grid Titlebar layout from collapsing
 * back into the pre-plan-70 overlap bug.
 */
import { test, expect, chromium, type Browser, type Page } from "@playwright/test";

const BASE_URL = process.env.VISUAL_BASE_URL ?? "http://localhost:8080";
const EXECUTABLE_PATH = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;

const ROUTES = ["/", "/setup", "/run"] as const;
const WIDTHS = [360, 480, 768, 1024, 1280, 1440, 1600, 1920] as const;

let browser: Browser;

test.beforeAll(async () => {
  browser = await chromium.launch({ headless: true, executablePath: EXECUTABLE_PATH });
});

test.afterAll(async () => {
  await browser.close();
});

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function rectsOverlap(a: Box, b: Box): boolean {
  // Allow a 1px seam to absorb sub-pixel rounding.
  return !(
    a.x + a.width <= b.x + 1 ||
    b.x + b.width <= a.x + 1 ||
    a.y + a.height <= b.y + 1 ||
    b.y + b.height <= a.y + 1
  );
}

async function menuRect(page: Page): Promise<Box | null> {
  // TopMenuBar renders a horizontal row of triggers with testid `topnav-trigger`.
  // The visible group's bounding rect is the union of visible triggers.
  const rect = await page.evaluate(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>('[data-testid="topnav-trigger"]'),
    ).filter((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
    });
    if (nodes.length === 0) return null;
    let x = Infinity,
      y = Infinity,
      r = -Infinity,
      b = -Infinity;
    for (const n of nodes) {
      const box = n.getBoundingClientRect();
      x = Math.min(x, box.left);
      y = Math.min(y, box.top);
      r = Math.max(r, box.right);
      b = Math.max(b, box.bottom);
    }
    return { x, y, width: r - x, height: b - y };
  });
  return rect;
}

async function centerRect(page: Page): Promise<Box | null> {
  // Center content = breadcrumb region if present, else the first heading in <main>.
  return await page.evaluate(() => {
    const pick = (el: Element | null): DOMRect | null => {
      if (!el) return null;
      const r = (el as HTMLElement).getBoundingClientRect();
      return r.width > 0 && r.height > 0 ? r : null;
    };
    const crumb = pick(
      document.querySelector('nav[aria-label="Breadcrumb"], [data-testid="app-breadcrumb"]'),
    );
    const chosen = crumb ?? pick(document.querySelector("main h1, main h2, main"));
    if (!chosen) return null;
    return { x: chosen.left, y: chosen.top, width: chosen.width, height: chosen.height };
  });
}

for (const path of ROUTES) {
  for (const width of WIDTHS) {
    test(`right menu does not overlap center content at ${path} width=${width}`, async () => {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle", timeout: 30_000 });

      const menu = await menuRect(page);
      if (!menu) {
        // TopMenuBar collapses into a hamburger on very narrow widths; nothing
        // to overlap. Header integrity is covered by the header spec.
        test
          .info()
          .annotations.push({ type: "note", description: `menu hidden at width=${width}` });
        await context.close();
        return;
      }

      // Menu must stay inside the viewport.
      expect(menu.x, `menu left inside viewport (${path}@${width})`).toBeGreaterThanOrEqual(0);
      expect(
        menu.x + menu.width,
        `menu right inside viewport (${path}@${width})`,
      ).toBeLessThanOrEqual(width);

      const center = await centerRect(page);
      if (!center) {
        await context.close();
        return;
      }

      expect(
        rectsOverlap(menu, center),
        `right-side menu overlaps center content at ${path} width=${width}: ` +
          `menu=${JSON.stringify(menu)} center=${JSON.stringify(center)}`,
      ).toBe(false);

      await context.close();
    });
  }
}
