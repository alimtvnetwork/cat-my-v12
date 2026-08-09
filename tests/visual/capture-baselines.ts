/**
 * Baseline capture script for the plan 69 visual-regression gate.
 *
 * Usage:
 *   VISUAL_UPDATE=1 bun run visual:update
 *
 * Refuses to overwrite baselines unless VISUAL_UPDATE=1 is set, so a
 * stray CI invocation cannot silently rewrite the ground truth.
 */
import { chromium } from "@playwright/test";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { VISUAL_ROUTES, VISUAL_VIEWPORT, VISUAL_PATHS } from "./routes.config";
import { settleForVisual } from "./_settle";
import {
  installProjectCameraFixtures,
  installRuleEditorFixtures,
  installRuleMixedStatusFixtures,
  FIXTURE_RULE_ID,
} from "./fixtures";

const BASE_URL = process.env.VISUAL_BASE_URL ?? "http://localhost:8080";
const EXECUTABLE_PATH = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;

async function main(): Promise<void> {
  if (process.env.VISUAL_UPDATE !== "1") {
    console.error(
      "[visual:update] refusing to run without VISUAL_UPDATE=1 (safety guard, see plan 69 step 5)",
    );
    process.exit(2);
  }
  mkdirSync(VISUAL_PATHS.baselineDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: EXECUTABLE_PATH,
  });

  let failed = 0;
  for (const route of VISUAL_ROUTES) {
    const url = `${BASE_URL}${route.path}`;
    const outPath = join(VISUAL_PATHS.baselineDir, `${route.slug}.png`);
    // Fresh context per route mirrors tests/visual/routes.spec.ts:52 so
    // localStorage written by a prior route's seed cannot bleed into the
    // next route's baseline. Root cause of the projects-hub 0.01634 stable
    // drift: the previously shared context carried rule/camera fixture
    // state into /projects, hiding cards that the fresh-context compare
    // capture rendered. Do not collapse this back to a shared context.
    const context = await browser.newContext({ viewport: { ...VISUAL_VIEWPORT } });
    const page = await context.newPage();
    try {
      if (route.seed === "projects-camera") {
        // Fixtures must be written on the target origin BEFORE the SPA
        // hydrates; navigate to `/` first, then seed, then goto path.
        await page.goto(BASE_URL + "/", { waitUntil: "domcontentloaded", timeout: 30_000 });
        await installProjectCameraFixtures(page, route.seedLibraryMode ?? "with-camera");
      } else if (route.seed === "rules") {
        await page.goto(BASE_URL + "/", { waitUntil: "domcontentloaded", timeout: 30_000 });
        await installRuleEditorFixtures(page);
      } else if (route.seed === "rules-mixed-status") {
        await page.goto(BASE_URL + "/", { waitUntil: "domcontentloaded", timeout: 30_000 });
        await installRuleMixedStatusFixtures(page);
      }
      await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
      if (route.waitForSelector) {
        await page.waitForSelector(route.waitForSelector, { timeout: 10_000 });
      }
      // Match the compare side (routes.spec.ts) exactly: double rAF +
      // document.fonts.ready. Without this, late webfont paints get baked
      // into the baseline PNG and every compare capture (which does settle)
      // shows subpixel drift, consuming the I-CX-04 tolerance budget.
      await settleForVisual(page);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`[visual:update] wrote ${outPath} (${route.description})`);
    } catch (err) {
      failed += 1;
      console.error(`[visual:update] FAILED ${route.slug} (${url})`, err);
    } finally {
      await context.close();
    }
  }

  // Element-scoped baselines for the ROI editor at /setup/rules/$id.
  // Kept out of VISUAL_ROUTES because routes.spec.ts captures full-page
  // screenshots and this surface is asserted per-element instead.
  const RULE_EDITOR_TARGETS = [
    { slug: "rule-editor-full", selector: ".editor-shell" },
    { slug: "rule-editor-tools", selector: '[data-testid="editor-canvas-slot"]' },
  ] as const;
  for (const target of RULE_EDITOR_TARGETS) {
    const outPath = join(VISUAL_PATHS.baselineDir, `${target.slug}.png`);
    const context = await browser.newContext({ viewport: { ...VISUAL_VIEWPORT } });
    const page = await context.newPage();
    try {
      await page.addInitScript(() => {
        localStorage.setItem(
          "ca.uiPrefs.v1",
          JSON.stringify({ showStatusBar: true, headerDensity: "comfortable" }),
        );
      });
      await page.goto(BASE_URL + "/", { waitUntil: "domcontentloaded", timeout: 30_000 });
      await installRuleEditorFixtures(page);
      await page.goto(`${BASE_URL}/setup/rules/${FIXTURE_RULE_ID}`, {
        waitUntil: "networkidle",
        timeout: 30_000,
      });
      await page.waitForSelector(".editor-shell", { timeout: 10_000 });
      await page.waitForSelector('[data-testid="editor-canvas-slot"]', { timeout: 10_000 });
      await settleForVisual(page);
      await page.locator(target.selector).first().screenshot({ path: outPath });
      console.log(`[visual:update] wrote ${outPath} (rule editor: ${target.slug})`);
    } catch (err) {
      failed += 1;
      console.error(`[visual:update] FAILED ${target.slug}`, err);
    } finally {
      await context.close();
    }
  }

  await browser.close();

  if (failed > 0) {
    console.error(`[visual:update] ${failed} route(s) failed; baseline set is incomplete`);
    process.exit(1);
  }
  console.log(
    `[visual:update] captured ${VISUAL_ROUTES.length + 2} baselines (routes + rule editor)`,
  );

  if (!existsSync(VISUAL_PATHS.baselineDir)) {
    console.error("[visual:update] baseline dir missing after capture; aborting");
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error("[visual:update] unhandled error", err);
  process.exit(1);
});
