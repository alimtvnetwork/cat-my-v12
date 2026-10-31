import * as fs from "node:fs";
import type { CdpPage } from "./cdp-browser";
import { EditorRuleKindType } from "@/lib/editor/types";
import { APP_VERSION_INFO } from "@/lib/version-info";
import { filterPatternRgba, pinPatternRule } from "@/lib/vision/pinned-pattern-geometry";
import {
  evaluatePatternRule,
  type WorkpieceImageData,
} from "@/lib/vision/workpiece-rule-analyzer";

export interface CliCaseResult {
  feature: string;
  step: string;
  isPassed: boolean;
  durationMs: number;
  details: string;
}

const FEATURE = "Pattern search and UI";
const MENU_FLUID_BUDGET_MS = 1500;
const RULE_FLUID_BUDGET_MS = 4000;
const TEST_RULE_FLUID_BUDGET_MS = 5000;

function assertCase(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function runCase(step: string, action: () => string): CliCaseResult {
  const startedAt = Date.now();

  try {
    const details = action();

    return {
      feature: FEATURE,
      step,
      isPassed: true,
      durationMs: Date.now() - startedAt,
      details,
    };
  } catch (err: unknown) {
    return {
      feature: FEATURE,
      step,
      isPassed: false,
      durationMs: Date.now() - startedAt,
      details: err instanceof Error ? err.message : String(err),
    };
  }
}

export function runPatternSearchLogicCases(): CliCaseResult[] {
  return [
    runCase("Fresh wide ROI pins to a square and stores 24 Atmel boxes", () => {
      const pinned = pinPatternRule(
        {
          id: "fresh",
          name: "Greyscale Pattern Matching",
          kind: EditorRuleKindType.C,
          isHidden: false,
          isLocked: false,
          x: 49,
          y: 158,
          width: 930,
          height: 174,
          params: { toolCode: "T102" },
        },
        1046,
        360,
      );
      const boxes = pinned.params?.referenceBoxes;

      assertCase(pinned.width === pinned.height, `ROI stayed ${pinned.width}x${pinned.height}`);
      assertCase(pinned.width === 174, `square side is ${pinned.width}`);
      assertCase(Array.isArray(boxes) && boxes.length === 24, "expected 24 reference boxes");

      return `Square ${pinned.width}x${pinned.height} with ${boxes.length} boxes`;
    }),
    runCase("Taught 760x400 search region is not squared away", () => {
      const width = 800;
      const height = 500;
      const rgba = new Uint8ClampedArray(width * height * 4);
      rgba.fill(80);
      const taught = { x: 10, y: 10, width: 760, height: 400 };
      const boxes = [
        {
          number: 1,
          x: 400,
          y: 200,
          width: 20,
          height: 16,
          area: 320,
          expectedLuma: 80,
        },
      ];
      const imageData: WorkpieceImageData = { width, height, rgba };
      const result = evaluatePatternRule(
        {
          id: "taught",
          name: "Greyscale Pattern Match",
          kind: EditorRuleKindType.C,
          isHidden: false,
          isLocked: false,
          x: 10,
          y: 10,
          width: 760,
          height: 400,
          params: {
            toolCode: "T102",
            searchRegion: taught,
            referenceBoxes: boxes,
            minMatchPercent: 0,
            minPresenceLuma: 1,
            lumaTolerance: 255,
          },
        },
        imageData,
        "Taught region",
      );
      const region = result.debug?.searchRegion as { width?: number; height?: number } | undefined;

      assertCase(region?.width === 760 && region?.height === 400, `region became ${region?.width}x${region?.height}`);
      assertCase(
        !String(result.message ?? "").includes("missing saved pattern boxes"),
        result.message ?? "empty message",
      );

      return `Search region stayed ${region?.width}x${region?.height}`;
    }),
    runCase("A rule with no saved boxes is configured instead of failing closed", () => {
      const width = 200;
      const height = 200;
      const rgba = new Uint8ClampedArray(width * height * 4);
      rgba.fill(90);
      const imageData: WorkpieceImageData = { width, height, rgba };
      const result = evaluatePatternRule(
        {
          id: "unconfigured",
          name: "Greyscale Pattern Match",
          kind: EditorRuleKindType.C,
          isHidden: false,
          isLocked: false,
          x: 40,
          y: 40,
          width: 120,
          height: 80,
          params: { toolCode: "T102", minPresenceLuma: 1 },
        },
        imageData,
        "Unconfigured",
      );

      assertCase(
        !String(result.message ?? "").includes("missing saved pattern boxes"),
        result.message ?? "empty message",
      );

      return result.message ?? "configured";
    }),
    runCase("Greyscale filter binarizes through BT.601", () => {
      const rgba = new Uint8ClampedArray(8);
      rgba[4] = 255;
      rgba[5] = 255;
      rgba[6] = 255;
      rgba[7] = 255;
      const filtered = filterPatternRgba(rgba, 2, 1, 128);

      assertCase(filtered[0] === 0 && filtered[1] === 0 && filtered[2] === 0, "dark pixel was not black");
      assertCase(filtered[4] === 255 && filtered[5] === 255 && filtered[6] === 255, "bright pixel was not white");

      return "Black pixel stayed 0 and white pixel stayed 255 after BT.601 binary";
    }),
    runCase("Launchers bind the frontend port and skip only a real app window", () => {
      const powershell = fs.readFileSync("run.ps1", "utf8");
      const shell = fs.readFileSync("run.sh", "utf8");
      const command = fs.readFileSync("run.cmd", "utf8");
      const marker = "Skipping duplicate browser window";

      assertCase(powershell.includes(marker), "run.ps1 does not skip an open window");
      assertCase(shell.includes(marker), "run.sh does not skip an open window");
      assertCase(powershell.includes("--strictPort"), "run.ps1 lets Vite hop off the launcher port");
      assertCase(shell.includes("--strictPort"), "run.sh lets Vite hop off the launcher port");
      assertCase(shell.includes("/healthz"), "run.sh waits on the wrong backend health path");
      assertCase(powershell.includes('--type='), "run.ps1 treats a Chrome crash helper as the app window");
      assertCase(!powershell.includes('.browser-profile")'), "run.ps1 skips the window because a profile string is present");
      assertCase(command.includes("run.ps1"), "run.cmd does not start run.ps1");

      return "run.cmd starts run.ps1, both launchers pin the port, and only a live app window is skipped";
    }),
    runCase("Status version matches version.json", () => {
      const versionFile = JSON.parse(fs.readFileSync("version.json", "utf8")) as { version: string };

      assertCase(APP_VERSION_INFO.version === `v${versionFile.version}`, `${APP_VERSION_INFO.version} vs v${versionFile.version}`);

      return APP_VERSION_INFO.version;
    }),
  ];
}

async function timed<T>(action: () => Promise<T>): Promise<{ value: T; durationMs: number }> {
  const startedAt = Date.now();
  const value = await action();

  return { value, durationMs: Date.now() - startedAt };
}

export async function runPatternSearchUiCases(page: CdpPage, baseUrl: string): Promise<CliCaseResult[]> {
  const results: CliCaseResult[] = [];

  const record = async (step: string, budgetMs: number, action: () => Promise<string>): Promise<void> => {
    const startedAt = Date.now();

    try {
      const details = await action();
      const durationMs = Date.now() - startedAt;
      const isFluid = durationMs <= budgetMs;

      results.push({
        feature: FEATURE,
        step,
        isPassed: isFluid,
        durationMs,
        details: isFluid ? details : `${details} — exceeded fluid budget ${budgetMs}ms`,
      });
    } catch (err: unknown) {
      results.push({
        feature: FEATURE,
        step,
        isPassed: false,
        durationMs: Date.now() - startedAt,
        details: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const analyzeUrl = `${baseUrl}/analyze?project=prj-smt-74hc595-line&ruleset=rs-smt-74hc-production`;

  await record("Analyze status line shows the app version", 8000, async () => {
    await page.goto(analyzeUrl, { waitUntil: "domcontentloaded" });
    const version = APP_VERSION_INFO.version;
    const status = page.locator(`text=${version}`).first();

    await status.waitFor({ state: "visible", timeout: 8000 });

    return `Status line shows ${version}`;
  });

  await record("Source menu is one portaled picker and opens fluidly", MENU_FLUID_BUDGET_MS, async () => {
    const closedPocket2 = page.locator("button:has-text('Pocket 2')");
    const closedCount = await closedPocket2.count();

    assertCase(closedCount === 0, `Pocket 2 is visible before the menu opens (${closedCount})`);

    const opened = await timed(async () => {
      await page.locator("[data-tour='project-image-selector-dropdown']").click();
      await page.locator("text=Live Camera Feed").first().waitFor({ state: "visible", timeout: 5000 });
      await page.locator("text=Pocket 2 [Empty Defect]").first().waitFor({ state: "visible", timeout: 2000 });
      await page.locator("text=Pocket 5 [Strip]").first().waitFor({ state: "visible", timeout: 2000 });
    });

    assertCase(opened.durationMs <= MENU_FLUID_BUDGET_MS, `menu opened in ${opened.durationMs}ms`);
    await page.keyboard.press("Escape");

    return `Menu opened in ${opened.durationMs}ms with Live Camera, Pocket 2, and Pocket 5`;
  });

  await record("Greyscale pattern rule shows a square ROI and the in-ROI toolbar", RULE_FLUID_BUDGET_MS, async () => {
    const rule = page.getByText(/Greyscale/i).first();

    await rule.waitFor({ state: "visible", timeout: 8000 });
    const selected = await timed(async () => {
      await rule.click();
      await page.locator("button[title='Square ROI']").waitFor({ state: "visible", timeout: 8000 });
    });
    const roiSection = page.locator("div.rounded-xl", { hasText: "Region of Interest (ROI)" }).first();
    const roiInputs = roiSection.locator("input[type='number']");
    const width = Number(await roiInputs.nth(2).inputValue());
    const height = Number(await roiInputs.nth(3).inputValue());

    assertCase(width === height, `ROI is ${width}x${height}`);
    assertCase(selected.durationMs <= RULE_FLUID_BUDGET_MS, `rule focus took ${selected.durationMs}ms`);

    return `Square ROI ${width}x${height}; toolbar ready in ${selected.durationMs}ms`;
  });

  await record("ROI lock control toggles without leaving the canvas", 2000, async () => {
    const lockButton = page.locator("button[title='Lock ROI'], button[title='Unlock ROI']").first();
    const before = await lockButton.getAttribute("title");

    await lockButton.click();
    await page.waitForTimeout(200);
    const after = await lockButton.getAttribute("title");

    assertCase(before !== after, `lock title stayed ${before}`);

    return `${before} -> ${after}`;
  });

  await record("Greyscale threshold slider accepts a new value", 2000, async () => {
    const slider = page
      .locator("div.space-y-1", { hasText: "Greyscale Threshold" })
      .locator("input[type='range']");

    await slider.waitFor({ state: "visible", timeout: 4000 });
    await slider.fill("151");
    const value = await slider.inputValue();

    assertCase(value === "151", `slider value is ${value}`);

    return `Greyscale threshold is ${value}`;
  });

  await record("Test This Rule does not fail for missing saved boxes", TEST_RULE_FLUID_BUDGET_MS, async () => {
    const tested = await timed(async () => {
      await page.locator("button:has-text('Test This Rule')").click();
      await page.waitForTimeout(1200);
    });
    const bodyText = await page.locator("body").innerText();

    assertCase(
      !bodyText.includes("missing saved pattern boxes"),
      "Test This Rule still reports missing saved pattern boxes",
    );
    assertCase(tested.durationMs <= TEST_RULE_FLUID_BUDGET_MS, `evaluation took ${tested.durationMs}ms`);

    return `Evaluation finished in ${tested.durationMs}ms without the missing-box failure`;
  });

  await record("Minimize control stays on the page", 2000, async () => {
    const minimize = page.locator("button[aria-label='Minimize Window']");

    await minimize.waitFor({ state: "visible", timeout: 4000 });
    await minimize.click();
    await page.locator("[data-tour='project-image-selector-dropdown']").waitFor({ state: "visible", timeout: 3000 });

    return "Minimize clicked and the analyze workspace stayed open";
  });

  return results;
}
