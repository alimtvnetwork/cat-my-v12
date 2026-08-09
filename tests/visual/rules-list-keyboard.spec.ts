/**
 * Plan 100 Phase D step 39. Keyboard activation audit for the
 * /setup/rules row link.
 *
 * Locks the two invariants introduced in steps 32 and 38:
 *   - Enter on a focused row link navigates to the rule/category
 *     editor (browser default for anchors).
 *   - Space on a focused row link ALSO navigates, via the onKeyDown
 *     handler added in step 38 (V4 §17 keyboard-primary surface).
 *
 * Skipping this test would let a future edit remove the Space handler
 * and silently regress keyboard a11y again, since anchors ignore Space
 * by default and no other assertion covers it.
 */
import { test, expect, chromium, type Browser } from "@playwright/test";
import { VISUAL_VIEWPORT } from "./routes.config";

const BASE_URL = process.env.VISUAL_BASE_URL ?? "http://localhost:8080";
const EXECUTABLE_PATH = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;

let browser: Browser;

test.beforeAll(async () => {
  browser = await chromium.launch({
    headless: true,
    executablePath: EXECUTABLE_PATH,
  });
});

test.afterAll(async () => {
  await browser.close();
});

async function firstRow(page: import("@playwright/test").Page) {
  const row = page.locator('[data-testid="setup-rules-row-link"][data-kind="rule"]').first();
  await row.waitFor({ state: "visible", timeout: 10_000 });
  return row;
}

test("Enter activates the row link", async () => {
  const context = await browser.newContext({ viewport: { ...VISUAL_VIEWPORT } });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/setup/rules`, {
    waitUntil: "networkidle",
    timeout: 30_000,
  });
  const row = await firstRow(page);
  await row.focus();
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/setup\/rules\/[^/]+$/, { timeout: 10_000 });
  expect(page.url()).toMatch(/\/setup\/rules\/[^/]+$/);
  await context.close();
});

test("Space activates the row link (Plan 100 D-38)", async () => {
  const context = await browser.newContext({ viewport: { ...VISUAL_VIEWPORT } });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  await page.goto(`${BASE_URL}/setup/rules`, {
    waitUntil: "networkidle",
    timeout: 30_000,
  });
  const row = await firstRow(page);
  await row.focus();
  await page.keyboard.press(" ");
  await page.waitForURL(/\/setup\/rules\/[^/]+$/, { timeout: 10_000 });
  expect(page.url()).toMatch(/\/setup\/rules\/[^/]+$/);
  // Handler must not have logged an error for a successful nav.
  expect(consoleErrors.filter((e) => e.includes("Space nav failed"))).toHaveLength(0);
  await context.close();
});
