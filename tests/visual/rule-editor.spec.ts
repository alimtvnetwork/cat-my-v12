/**
 * Visual regression gate for the ROI editor rendering at
 * `/setup/rules/$id` (Plan 79 rule editor surface).
 *
 * Two element-scoped screenshots are compared against saved baselines
 * using the same pixelmatch pipeline as `routes.spec.ts`:
 *
 *   1. `rule-editor-full`   - the entire `[data-testid="rule-editor"]`
 *                              container (tools rail, metadata bar,
 *                              conditions panel, properties + layers
 *                              palettes). Catches layout/rail-width
 *                              regressions across the ROI editor shell.
 *   2. `rule-editor-tools`  - just the compact Tools rail. Small element
 *                              screenshot locks the ROI-tool row order
 *                              and icon sizing that the user has
 *                              repeatedly flagged.
 *
 * The rule is seeded directly into idb-keyval before navigating, so the
 * route resolves without any user setup. Header density is forced to
 * `comfortable` to keep top-of-page chrome deterministic.
 */
import { test, expect, chromium, type Browser } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { VISUAL_VIEWPORT, VISUAL_DIFF, VISUAL_PATHS } from "./routes.config";
import { FIXTURE_RULE_ID, installRuleEditorFixtures } from "./fixtures";
import { settleForVisual } from "./_settle";

const BASE_URL = process.env.VISUAL_BASE_URL ?? "http://localhost:8080";
const EXECUTABLE_PATH = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;

interface Target {
  slug: string;
  selector: string;
  description: string;
}

const TARGETS: readonly Target[] = [
  {
    slug: "rule-editor-full",
    selector: ".editor-shell",
    description: "Full ROI editor shell",
  },
  {
    slug: "rule-editor-tools",
    selector: '[data-testid="editor-canvas-slot"]',
    description: "Tools palette rail",
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

    const context = await browser.newContext({
      viewport: { ...VISUAL_VIEWPORT },
    });
    const page = await context.newPage();
    // Force comfortable density so the top chrome above the editor is
    // byte-stable across runs (matches header-spacing.spec.ts convention).
    await page.addInitScript(() => {
      localStorage.setItem(
        "ca.uiPrefs.v1",
        JSON.stringify({
          state: { showStatusBar: true, headerDensity: "comfortable" },
          version: 0,
        }),
      );
    });

    // Establish the origin so localStorage + IDB writes land on localhost.
    await page.goto(`${BASE_URL}/`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await installRuleEditorFixtures(page);

    await page.goto(`${BASE_URL}/setup/rules/${FIXTURE_RULE_ID}`, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });
    await page.waitForSelector(".editor-shell", {
      timeout: 10_000,
    });
    // Also wait for the canvas slot to render.
    await page.waitForSelector('[data-testid="editor-canvas-slot"]', {
      timeout: 10_000,
    });

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
