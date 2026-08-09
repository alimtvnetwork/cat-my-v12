import { defineConfig } from "@playwright/test";

// The sandbox ships Chromium 1194 at a fixed path; Playwright's own
// installer targets 1228 which is not present. `routes.spec.ts` calls
// `chromium.launch({ executablePath })` manually, but the advisory
// specs (`sticky-header-states`, `header-spacing`,
// `settings-and-rules-list`, `address-bar`, `right-menu-no-overlap`,
// `header-and-worker-notice`, `rules-list-keyboard`, `rule-editor`)
// use Playwright's fixture-injected `page`, which reads this config.
// Without wiring PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH into `launchOptions`
// here, those specs fail at launch with "Executable doesn't exist at
// /chromium_headless_shell-1228/…" and the two-run promotion pipeline
// for advisory specs stays blocked.
const EXECUTABLE_PATH = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

/**
 * Playwright config scoped to the plan-69 visual-regression gate.
 *
 * Kept minimal: single project, no retries, no reporter beyond list so
 * the console.error diff lines from tests/visual/routes.spec.ts remain
 * the primary signal in CI logs.
 */
export default defineConfig({
  testDir: "tests/visual",
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 60_000,
  use: EXECUTABLE_PATH ? { launchOptions: { executablePath: EXECUTABLE_PATH } } : undefined,
});
