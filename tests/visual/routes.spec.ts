/**
 * Visual regression gate for plan 69.
 *
 * Compares live screenshots of each VISUAL_ROUTES entry against baselines
 * captured by `bun run visual:update`. Fails when the diff-pixel ratio
 * exceeds VISUAL_DIFF.maxDiffPixelRatio.
 *
 * Diff artifacts land under VISUAL_PATHS.diffDir on failure so the CI log
 * line is actionable.
 */
import { test, expect, chromium, type Browser } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { VISUAL_ROUTES, VISUAL_VIEWPORT, VISUAL_DIFF, VISUAL_PATHS } from "./routes.config";
import { settleForVisual } from "./_settle";
import {
  installProjectCameraFixtures,
  installRuleEditorFixtures,
  installRuleMixedStatusFixtures,
} from "./fixtures";

const BASE_URL = process.env.VISUAL_BASE_URL ?? "http://localhost:8080";
const EXECUTABLE_PATH = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;

let browser: Browser;

test.beforeAll(async () => {
  mkdirSync(VISUAL_PATHS.diffDir, { recursive: true });
  mkdirSync(VISUAL_PATHS.actualDir, { recursive: true });
  browser = await chromium.launch({ headless: true, executablePath: EXECUTABLE_PATH });
});

test.afterAll(async () => {
  await browser.close();
});

for (const route of VISUAL_ROUTES) {
  test(`visual: ${route.slug} (${route.description})`, async () => {
    const baselinePath = join(VISUAL_PATHS.baselineDir, `${route.slug}.png`);
    const actualPath = join(VISUAL_PATHS.actualDir, `${route.slug}.png`);
    const diffPath = join(VISUAL_PATHS.diffDir, `${route.slug}.png`);

    if (!existsSync(baselinePath)) {
      throw new Error(
        `[visual] baseline missing for ${route.slug} at ${baselinePath}. ` +
          `Run: VISUAL_UPDATE=1 bun run visual:update`,
      );
    }

    const context = await browser.newContext({ viewport: { ...VISUAL_VIEWPORT } });
    const page = await context.newPage();
    if (route.seed === "projects-camera") {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await installProjectCameraFixtures(page, route.seedLibraryMode ?? "with-camera");
    } else if (route.seed === "rules") {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await installRuleEditorFixtures(page);
    } else if (route.seed === "rules-mixed-status") {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await installRuleMixedStatusFixtures(page);
    }
    await page.goto(`${BASE_URL}${route.path}`, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });
    if (route.waitForSelector) {
      await page.waitForSelector(route.waitForSelector, { timeout: 10_000 });
    }
    await settleForVisual(page);
    await page.screenshot({ path: actualPath, fullPage: false });
    await context.close();

    const baseline = PNG.sync.read(readFileSync(baselinePath));
    const actual = PNG.sync.read(readFileSync(actualPath));

    if (baseline.width !== actual.width || baseline.height !== actual.height) {
      throw new Error(
        `[visual] dimension mismatch for ${route.slug}: ` +
          `baseline ${baseline.width}x${baseline.height} vs ` +
          `actual ${actual.width}x${actual.height}. Artifact: ${actualPath}`,
      );
    }

    const { width, height } = baseline;
    const diff = new PNG({ width, height });
    const diffPixels = pixelmatch(baseline.data, actual.data, diff.data, width, height, {
      threshold: VISUAL_DIFF.threshold,
    });
    const totalPixels = width * height;
    const ratio = diffPixels / totalPixels;

    if (ratio > VISUAL_DIFF.maxDiffPixelRatio) {
      writeFileSync(diffPath, PNG.sync.write(diff));
      console.log(
        "ACTUAL MAX DIFF:",
        VISUAL_DIFF.maxDiffPixelRatio,
        typeof VISUAL_DIFF.maxDiffPixelRatio,
      );
      // Actionable CI log line; picked up by scripts/ci-v3.sh output.
      console.error(
        `[visual] FAIL ${route.slug} ratio=${ratio.toFixed(5)} ` +
          `(max ${VISUAL_DIFF.maxDiffPixelRatio}). Diff: ${diffPath}`,
      );
    }

    expect(ratio, `diff ratio for ${route.slug}`).toBeLessThanOrEqual(
      VISUAL_DIFF.maxDiffPixelRatio,
    );
  });
}
