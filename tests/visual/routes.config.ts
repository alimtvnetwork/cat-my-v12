/**
 * Route inventory for the visual-regression gate (plan 69).
 *
 * Public routes only. Auth-gated routes are out of scope for step 1;
 * add them after wiring the Supabase session-restore snippet from the
 * browser-use guidance.
 */
export interface VisualRoute {
  /** Stable slug used as the baseline filename (no path separators). */
  slug: string;
  /** Path relative to the dev-server origin. Leading slash required. */
  path: string;
  /** Human description surfaced in CI log lines on failure. */
  description: string;
  /**
   * Optional fixture applied on the same origin BEFORE navigating to `path`.
   * `"projects-camera"` seeds the deterministic project + camera-library
   * payloads from `tests/visual/fixtures.ts` so `/projects/$id/camera`
   * has stable data to render.
   * `"rules"` seeds the deterministic rule fixture used by the ROI editor
   * and the rules list surface (Plan 83 item 23).
   */
  seed?: "projects-camera" | "rules" | "rules-mixed-status";
  /** Only meaningful when seed === "projects-camera". */
  seedLibraryMode?: "with-camera" | "empty";
  /**
   * Optional selector to wait for after navigation, useful when the route
   * hydrates async state (e.g. zustand persist via IDB facade).
   */
  waitForSelector?: string;
}

export const VISUAL_ROUTES: readonly VisualRoute[] = [
  { slug: "home", path: "/", description: "Home / landing" },
  { slug: "setup", path: "/setup", description: "Setup shell" },
  {
    slug: "setup-camera",
    path: "/setup/camera",
    description: "Camera library + editor (Plan 78 I-SU-05)",
  },
  { slug: "run", path: "/run", description: "Run picker" },
  {
    slug: "projects-camera-bound",
    path: "/projects/p-fixture-bound-0001/camera",
    description: "Project camera tab, bound CameraSetting (Plan 78 slice 8)",
    seed: "projects-camera",
    seedLibraryMode: "with-camera",
    waitForSelector: '[data-project-id="p-fixture-bound-0001"] dl',
  },
  {
    slug: "projects-camera-unbound",
    path: "/projects/p-fixture-unbound-0001/camera",
    description: "Project camera tab, no binding + empty library (Plan 78 slice 8)",
    seed: "projects-camera",
    seedLibraryMode: "empty",
    waitForSelector: '[data-project-id="p-fixture-unbound-0001"]',
  },
  // Plan 83 item 23: six additional surfaces.
  {
    slug: "rules-list",
    path: "/setup/rules",
    description: "Rules list w/ seeded fixture rule (Plan 83 item 23)",
    seed: "rules",
  },
  {
    slug: "rule-editor-page",
    path: "/setup/rules/rule-fixture-0001",
    description: "Rule editor full page, seeded fixture (Plan 83 item 23)",
    seed: "rules",
    waitForSelector: '.editor-shell',
  },
  {
    slug: "projects-hub",
    path: "/projects",
    description: "Projects hub landing (Plan 83 item 23)",
  },
  {
    slug: "settings-index",
    path: "/settings",
    description: "Settings shell landing (Plan 83 item 23)",
  },
  {
    slug: "errors-page",
    path: "/errors",
    description: "Error history route (Plan 83 item 23)",
  },
  {
    slug: "diagnostics-page",
    path: "/diagnostics",
    description: "Diagnostics route (Plan 83 item 23)",
  },
  // Plan 83 item 15: rule enable/disable visual coverage.
  // Locks StatusFilter deep-link chrome + disabled-row rendering so a
  // token change on `.rule-disabled` cannot silently regress all
  // enable/disable surfaces at once.
  {
    slug: "rules-list-status-disabled",
    path: "/setup/rules?status=disabled",
    description: "Rules list, status=disabled deep-link (Plan 83 item 15)",
    seed: "rules-mixed-status",
  },
  {
    slug: "rules-list-status-enabled",
    path: "/setup/rules?status=enabled",
    description: "Rules list, status=enabled deep-link (Plan 83 item 15)",
    seed: "rules-mixed-status",
  },
  // Plan 85: broaden coverage across key screens users navigate so a
  // layout shift in shared chrome (Titlebar, hub headers, settings
  // shell) is caught by the CI gate rather than by human review.
  { slug: "results", path: "/results", description: "Results hub (Plan 85)" },
  { slug: "ops", path: "/ops", description: "Ops dashboard (Plan 85)" },
  { slug: "run-picker", path: "/run", description: "Run picker deep-link (Plan 85)" },
  { slug: "settings-camera", path: "/settings/camera", description: "Settings > Camera (Plan 85)" },
  {
    slug: "settings-lighting",
    path: "/settings/lighting",
    description: "Settings > Lighting (Plan 85)",
  },
  {
    slug: "settings-trigger",
    path: "/settings/trigger",
    description: "Settings > Trigger (Plan 85)",
  },
  {
    slug: "settings-shortcuts",
    path: "/settings/shortcuts",
    description: "Settings > Shortcuts (Plan 85)",
  },
  {
    slug: "settings-license",
    path: "/settings/license",
    description: "Settings > License (Plan 85)",
  },
  { slug: "setup-reference", path: "/setup/reference", description: "Setup > Reference (Plan 85)" },
  {
    slug: "setup-chain-events",
    path: "/setup/chain-events",
    description: "Setup > Chain events (Plan 85)",
  },
  { slug: "setup-functions", path: "/setup/functions", description: "Setup > Functions (Plan 85)" },
  { slug: "setup-roi", path: "/setup/roi", description: "Setup > ROI (Plan 85)" },
] as const;

export const VISUAL_VIEWPORT = { width: 1280, height: 900 } as const;

/** Fail thresholds: match plan 69 doc. */
export const VISUAL_DIFF = {
  /** Per-pixel color distance tolerance passed to pixelmatch. */
  threshold: 0.1,
  /**
   * Max diff-pixel ratio (0..1) before the gate fails.
   *
   * History:
   * - v3.745.0 aspirationally cut 0.01 -> 0.005 without measurement.
   * - v3.746.0 rebuilt on empirical evidence: after fixing the
   *   baseline-capture bug (missing `settleForVisual` in
   *   `capture-baselines.ts`, resolved in v3.746.0), rerunning the
   *   gate against fresh baselines shows a real noise band of
   *   0.006-0.016 across `run`, `projects-hub`, `errors-page` (plus
   *   a 0.10 outlier on `setup-camera` traced to an intermittent
   *   hydration mismatch, tracked separately). 0.02 gives ~20%
   *   headroom over the measured floor.
   * - Further tightening (target 0.01) requires per-route drift
   *   investigation and a warm-Chromium recapture on CI.
   */
  maxDiffPixelRatio: 0.02,
} as const;

/**
 * Header-only variant used by `sticky-header-states.spec.ts`. The
 * `maxDiffPixelRatio` MUST stay in lockstep with `VISUAL_DIFF` (single
 * I-CX-04 tolerance seam under Plan 84); only `threshold` (pixelmatch
 * per-pixel color-distance) is intentionally relaxed to absorb subpixel
 * font hinting across Chromium builds on the clipped header capture.
 * Extra Playwright screenshot flags live here too so specs consume one
 * frozen object rather than assembling their own.
 */
export const HEADER_VISUAL_DIFF = {
  ...VISUAL_DIFF,
  threshold: 0.2,
  animations: "disabled",
  caret: "hide",
} as const;

export const VISUAL_PATHS = {
  baselineDir: "tests/visual/baselines/plan69",
  diffDir: "tests/reports/screenshots/plan69/diff",
  actualDir: "tests/reports/screenshots/plan69/actual",
} as const;
