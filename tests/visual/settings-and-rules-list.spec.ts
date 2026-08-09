/**
 * Plan 81 step 20: visual-regression gate for the Settings hub and the
 * Rules library list. Two element-scoped screenshots per surface are
 * diffed with the shared 1% pixelmatch pipeline from `routes.config.ts`.
 *
 *   - `settings-hub-header`         The Settings hub top band (title +
 *                                    search input), which regressed the
 *                                    most during the header density work.
 *   - `settings-hub-vendor-radio`   The Capture vendor radiogroup that
 *                                    just gained roving-tabindex a11y.
 *   - `setup-rules-list-shell`      The full `/setup/rules` route body.
 *   - `setup-rules-list-empty`      The unified `<EmptyState>` shown when
 *                                    the search query has no matches.
 *
 * Baselines are captured with `VISUAL_UPDATE=1 bun run visual:update`.
 */
import { test, expect, chromium, type Browser } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { VISUAL_VIEWPORT, VISUAL_DIFF, VISUAL_PATHS } from "./routes.config";
import { settleForVisual } from "./_settle";

const BASE_URL = process.env.VISUAL_BASE_URL ?? "http://localhost:8080";
const EXECUTABLE_PATH = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;

interface Target {
  slug: string;
  path: string;
  selector: string;
  description: string;
  /** Optional page setup (e.g. type into the search box). */
  prepare?: (page: import("@playwright/test").Page) => Promise<void>;
}

const TARGETS: readonly Target[] = [
  {
    slug: "settings-hub-header",
    path: "/settings",
    selector: "main header, header",
    description: "Settings hub title + search band",
  },
  {
    slug: "settings-hub-vendor-radio",
    path: "/settings",
    selector: '[role="radiogroup"][aria-label="Capture vendor"]',
    description: "Capture vendor radiogroup (roving tabindex)",
  },
  {
    slug: "setup-rules-list-shell",
    path: "/setup/rules",
    selector: '[data-testid="setup-rules-list"], [data-testid="setup-rules-empty"]',
    description: "Rules library list body",
  },
  {
    slug: "setup-rules-list-empty",
    path: "/setup/rules",
    selector: '[data-testid="setup-rules-empty"]',
    description: "Rules library empty state (no search matches)",
    prepare: async (page) => {
      const input = page.locator('[data-testid="setup-rules-search"]');
      await input.waitFor({ state: "visible", timeout: 10_000 });
      await input.fill("zzz-no-such-rule-zzz");
    },
  },
  {
    slug: "setup-rules-group-categories",
    path: "/setup/rules",
    selector: '[data-testid="setup-rules-group-categories"]',
    description: "Grouped rules list: Categories section (Plan 100 D-31/33)",
  },
  {
    slug: "setup-rules-group-rules",
    path: "/setup/rules",
    selector: '[data-testid="setup-rules-group-rules"]',
    description: "Grouped rules list: Rules section (Plan 100 D-31/33)",
  },
  {
    slug: "setup-rules-group-categories-collapsed",
    path: "/setup/rules",
    selector: '[data-testid="setup-rules-group-categories"]',
    description:
      "Grouped rules list: Categories collapsed via rulesGroupsCollapsed (Plan 100 E-48)",
    prepare: async (page) => {
      const toggle = page.locator('[data-testid="setup-rules-group-categories-toggle"]');
      await toggle.waitFor({ state: "visible", timeout: 10_000 });
      const expanded = await toggle.getAttribute("aria-expanded");
      if (expanded !== "false") await toggle.click();
    },
  },
  {
    slug: "setup-rules-group-rules-collapsed",
    path: "/setup/rules",
    selector: '[data-testid="setup-rules-group-rules"]',
    description: "Grouped rules list: Rules collapsed via rulesGroupsCollapsed (Plan 100 E-48)",
    prepare: async (page) => {
      const toggle = page.locator('[data-testid="setup-rules-group-rules-toggle"]');
      await toggle.waitFor({ state: "visible", timeout: 10_000 });
      const expanded = await toggle.getAttribute("aria-expanded");
      if (expanded !== "false") await toggle.click();
    },
  },
] as const;

let browser: Browser;

test.beforeAll(async () => {
  mkdirSync(VISUAL_PATHS.diffDir, { recursive: true });
  mkdirSync(VISUAL_PATHS.actualDir, { recursive: true });
  browser = await chromium.launch({
    headless: true,
    executablePath: EXECUTABLE_PATH,
  });
});

test.afterAll(async () => {
  await browser.close();
});

for (const target of TARGETS) {
  test(`visual: ${target.slug} (${target.description})`, async () => {
    const baselinePath = join(VISUAL_PATHS.baselineDir, `${target.slug}.png`);
    const actualPath = join(VISUAL_PATHS.actualDir, `${target.slug}.png`);
    const diffPath = join(VISUAL_PATHS.diffDir, `${target.slug}.png`);

    if (!existsSync(baselinePath)) {
      throw new Error(
        `[visual] baseline missing for ${target.slug} at ${baselinePath}. ` +
          `Run: VISUAL_UPDATE=1 bun run visual:update`,
      );
    }

    const context = await browser.newContext({ viewport: { ...VISUAL_VIEWPORT } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem(
        "ca.uiPrefs.v1",
        JSON.stringify({
          state: { showStatusBar: true, headerDensity: "comfortable" },
          version: 0,
        }),
      );
    });

    await page.goto(`${BASE_URL}${target.path}`, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });
    if (target.prepare) await target.prepare(page);

    const handle = page.locator(target.selector).first();
    await handle.waitFor({ state: "visible", timeout: 10_000 });
    await settleForVisual(page);
    await handle.screenshot({ path: actualPath });
    await context.close();

    const baseline = PNG.sync.read(readFileSync(baselinePath));
    const actual = PNG.sync.read(readFileSync(actualPath));
    if (baseline.width !== actual.width || baseline.height !== actual.height) {
      throw new Error(
        `[visual] dimension mismatch for ${target.slug}: ` +
          `baseline ${baseline.width}x${baseline.height} vs ` +
          `actual ${actual.width}x${actual.height}. Artifact: ${actualPath}`,
      );
    }
    const { width, height } = baseline;
    const diff = new PNG({ width, height });
    const diffPixels = pixelmatch(baseline.data, actual.data, diff.data, width, height, {
      threshold: VISUAL_DIFF.threshold,
    });
    const ratio = diffPixels / (width * height);
    if (ratio > VISUAL_DIFF.maxDiffPixelRatio) {
      writeFileSync(diffPath, PNG.sync.write(diff));
      console.error(
        `[visual] FAIL ${target.slug} ratio=${ratio.toFixed(5)} ` +
          `(max ${VISUAL_DIFF.maxDiffPixelRatio}). Diff: ${diffPath}`,
      );
    }
    expect(ratio, `diff ratio for ${target.slug}`).toBeLessThanOrEqual(
      VISUAL_DIFF.maxDiffPixelRatio,
    );
  });
}
