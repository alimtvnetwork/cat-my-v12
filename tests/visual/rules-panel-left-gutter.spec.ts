/**
 * v3.978: Screenshot-based visual regression that locks the Rules panel
 * left gutter in both densities (comfortable + compact).
 *
 * Motivation. The Rules panel had a recurring regression where either the
 * surrounding rail section or the first visible column of a rule row reserved
 * extra width and pushed the kind-icon + name several pixels right of the
 * panel/list gutter (see `assets/issues/16-rules-panel-left-gutter-padding.md`).
 * The fix in v3.975 -> v3.977 made the drag handle and order badge pure
 * absolute overlays. This spec locks that shape by pixel-diffing the
 * rendered `.editor-rule-row` against a captured baseline in each
 * density mode.
 *
 * Isolation strategy. Reaching the editor RightRail requires a seeded
 * project + ruleset, which the visual pipeline does not provision.
 * Instead we render a minimal fixture DOM via `page.setContent()` that
 * mirrors the exact LayerRow markup (see `src/components/editor/layers/LayerRow.tsx`)
 * and loads the app stylesheet through the Vite dev server. That gives
 * a deterministic, dependency-free screenshot of the rule section that
 * regressions in `src/styles.css` will trip regardless of how the editor is
 * entered, including broad `.editor-shell aside section` padding rules.
 *
 * Update baselines with:
 *   VISUAL_UPDATE=1 bunx playwright test tests/visual/rules-panel-left-gutter.spec.ts
 */
import { test, expect, chromium, type Browser } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { VISUAL_DIFF, VISUAL_PATHS } from "./routes.config";
import { settleForVisual } from "./_settle";

const BASE_URL = process.env.VISUAL_BASE_URL ?? "http://localhost:8080";
const EXECUTABLE_PATH = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;
const UPDATE = process.env.VISUAL_UPDATE === "1";

// Mirrors LayerRow.tsx markup: drag handle (data-layer-drag-handle),
// order badge (.editor-rule-order-badge), and .editor-rule-row-main grid
// (22px kind badge + 1fr name). Wrapped in a fixed-width right-rail
// container so density selectors (`.right-rail[data-density=...]`) apply.
function fixtureHtml(density: "comfortable" | "compact"): string {
  return /* html */ `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<link rel="stylesheet" href="${BASE_URL}/src/styles.css" />
<style>
  html, body { margin: 0; background: #0f1115; }
  .fixture-frame {
    width: 320px; padding: 12px; box-sizing: border-box;
    background: var(--ca-panel, #14161d);
  }
</style>
</head>
<body>
  <div class="editor-shell">
    <aside class="right-rail" data-density="${density}">
      <div class="fixture-frame">
        <div class="relative min-h-0 flex-1 overflow-y-auto" role="list" aria-label="Layer list">
          <section aria-label="Rules" data-layer-section="rules">
            <div class="editor-layer-section-head">
              <span class="inline-flex items-center gap-hmi-1">Rules</span>
              <span>1</span>
            </div>
            <div class="editor-rule-row" data-focused="false" data-selected="false">
              <span class="editor-rule-icon cursor-grab" data-layer-drag-handle aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/>
                  <circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/>
                </svg>
              </span>
              <span class="editor-rule-order-badge" data-order-index="1">1</span>
              <button type="button" class="editor-rule-row-main" title="Presence: LED D3">
                <span class="editor-rule-kind-badge" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25">
                    <rect x="4" y="4" width="16" height="16" rx="2"/>
                  </svg>
                </span>
                <span class="min-w-0">Presence: LED D3</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </aside>
  </div>
</body>
</html>`;
}

const TARGETS = [
  { slug: "rules-panel-left-gutter-comfortable", density: "comfortable" as const },
  { slug: "rules-panel-left-gutter-compact", density: "compact" as const },
];

let browser: Browser;

test.beforeAll(async () => {
  mkdirSync(VISUAL_PATHS.diffDir, { recursive: true });
  mkdirSync(VISUAL_PATHS.actualDir, { recursive: true });
  mkdirSync(VISUAL_PATHS.baselineDir, { recursive: true });
  browser = await chromium.launch({
    headless: true,
    executablePath: EXECUTABLE_PATH,
  });
});

test.afterAll(async () => {
  await browser.close();
});

for (const target of TARGETS) {
  test(`visual: ${target.slug} (${target.density} density)`, async () => {
    const baselinePath = join(VISUAL_PATHS.baselineDir, `${target.slug}.png`);
    const actualPath = join(VISUAL_PATHS.actualDir, `${target.slug}.png`);
    const diffPath = join(VISUAL_PATHS.diffDir, `${target.slug}.png`);

    const context = await browser.newContext({
      viewport: { width: 400, height: 200 },
    });
    const page = await context.newPage();
    await page.setContent(fixtureHtml(target.density), {
      waitUntil: "networkidle",
    });

    const handle = page.locator("section[data-layer-section='rules']").first();
    await handle.waitFor({ state: "visible", timeout: 5_000 });
    await settleForVisual(page);

    // Structural guardrail (fails independently of pixel drift): the section
    // and header must start flush with the list scrollport, and the row-main
    // must stay close to row content-left. This catches both inherited aside
    // padding and drag/order-badge overlay regressions before pixel-diff runs.
    const geometry = await handle.evaluate((row) => {
      const sectionRect = row.getBoundingClientRect();
      const list = row.closest<HTMLElement>("[role='list']");
      const listRect = list?.getBoundingClientRect();
      const header = row.querySelector<HTMLElement>(".editor-layer-section-head");
      const headerRect = header?.getBoundingClientRect();
      const rule = row.querySelector<HTMLElement>(".editor-rule-row");
      const ruleRect = rule?.getBoundingClientRect();
      const cs = rule ? getComputedStyle(rule) : null;
      const padLeft = cs ? parseFloat(cs.paddingLeft) : -1;
      const main = rule?.querySelector<HTMLElement>(".editor-rule-row-main");
      const mainRect = main?.getBoundingClientRect();
      return {
        listLeft: listRect?.left ?? -1,
        sectionLeft: sectionRect.left,
        headerLeft: headerRect?.left ?? -1,
        rowLeft: ruleRect?.left ?? -1,
        contentLeft: (ruleRect?.left ?? -1) + padLeft,
        mainLeft: mainRect?.left ?? -1,
        padLeft,
      };
    });
    const sectionDrift = geometry.sectionLeft - geometry.listLeft;
    const headerDrift = geometry.headerLeft - geometry.listLeft;
    const rowDrift = geometry.rowLeft - geometry.listLeft;
    const drift = geometry.mainLeft - geometry.contentLeft;
    expect(
      sectionDrift,
      `rule section drifted ${sectionDrift.toFixed(1)}px past list-left. ` +
        `Inherited shell padding or panel body padding caused the red-box gutter.`,
    ).toBeLessThanOrEqual(2);
    expect(
      headerDrift,
      `section header drifted ${headerDrift.toFixed(1)}px past list-left.`,
    ).toBeLessThanOrEqual(2);
    expect(
      rowDrift,
      `rule row drifted ${rowDrift.toFixed(1)}px past list-left.`,
    ).toBeLessThanOrEqual(2);
    expect(
      drift,
      `rule-row-main drifted ${drift.toFixed(1)}px past row content-left ` +
        `(padLeft=${geometry.padLeft}px). Overlay regressions in ` +
        `.editor-rule-order-badge / [data-layer-drag-handle] typically ` +
        `push this past 20px. Fixture density=${target.density}.`,
    ).toBeLessThanOrEqual(12);

    await handle.screenshot({ path: actualPath });
    await context.close();

    if (UPDATE || !existsSync(baselinePath)) {
      writeFileSync(baselinePath, readFileSync(actualPath));
      if (!UPDATE) {
        console.warn(
          `[visual] seeded baseline for ${target.slug} at ${baselinePath}. ` +
            `Review the image and commit it.`,
        );
      }
      return;
    }

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
