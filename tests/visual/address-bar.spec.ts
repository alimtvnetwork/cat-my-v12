/**
 * Plan 100 Phase C step 30: visual-regression gate for the unified
 * Titlebar (address bar + right control cluster).
 *
 * Three representative routes cover the surface:
 *   - `titlebar-home`     `/`         landing (no program label)
 *   - `titlebar-setup`    `/setup`    setup shell with breadcrumb
 *   - `titlebar-run`      `/run`      run picker
 *
 * Two element-scoped screenshots per route: the full header and the
 * newly-grouped right cluster (`[data-testid="titlebar-right-cluster"]`)
 * so step 29's `gap-1 px-2` spacing is pinned independently of the
 * left cluster. Baselines are captured with `VISUAL_UPDATE=1 bun run
 * visual:update`.
 */
import { test, expect, chromium, type Browser } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { settleForVisual } from "./_settle";
import { VISUAL_VIEWPORT, VISUAL_DIFF, VISUAL_PATHS } from "./routes.config";

const BASE_URL = process.env.VISUAL_BASE_URL ?? "http://localhost:8080";
const EXECUTABLE_PATH = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;

interface Target {
  slug: string;
  path: string;
  selector: string;
  description: string;
}

const TARGETS: readonly Target[] = [
  {
    slug: "titlebar-home-header",
    path: "/",
    selector: "header.app-titlebar",
    description: "Titlebar full header on /",
  },
  {
    slug: "titlebar-home-right",
    path: "/",
    selector: '[data-testid="titlebar-right-cluster"]',
    description: "Right cluster on /",
  },
  {
    slug: "titlebar-setup-header",
    path: "/setup",
    selector: "header.app-titlebar",
    description: "Titlebar full header on /setup",
  },
  {
    slug: "titlebar-setup-right",
    path: "/setup",
    selector: '[data-testid="titlebar-right-cluster"]',
    description: "Right cluster on /setup",
  },
  {
    slug: "titlebar-run-header",
    path: "/run",
    selector: "header.app-titlebar",
    description: "Titlebar full header on /run",
  },
  {
    slug: "titlebar-run-right",
    path: "/run",
    selector: '[data-testid="titlebar-right-cluster"]',
    description: "Right cluster on /run",
  },
] as const;

let browser: Browser;

test.beforeAll(async () => {
  mkdirSync(VISUAL_PATHS.diffDir, { recursive: true });
  mkdirSync(VISUAL_PATHS.actualDir, { recursive: true });
  browser = await chromium.launch({ headless: true, executablePath: EXECUTABLE_PATH });
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
    await page.goto(`${BASE_URL}${target.path}`, { waitUntil: "networkidle", timeout: 30_000 });

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
          `baseline ${baseline.width}x${baseline.height} vs actual ${actual.width}x${actual.height}. ` +
          `Artifact: ${actualPath}`,
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
