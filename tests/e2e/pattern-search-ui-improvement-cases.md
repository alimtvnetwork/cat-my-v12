# E2E test cases: Pattern Search and UI Improvement

Run everything from the CLI with one command (this is the CLI function
for this suite):

```sh
bun run e2e:pattern-search
```

That runs `tests/e2e/run-pattern-search-e2e.sh`, which executes every
automated case below in order and prints one PASS / FAIL / UNVERIFIED
line per case, then a summary. It exits non-zero when any case FAILs.
UNVERIFIED is not a pass: it means the surface could not be reached or
the environment cannot prove the case, and the reason is printed.

Version under test: whatever `version.json` holds at run time. The UI
probe reads `version.json` and compares the VER chip against it, so the
expected value is never hardcoded here.

Grading rules (no invented thresholds):

- PASS: the asserted behaviour was observed.
- FAIL: the surface was reached and the behaviour was wrong.
- UNVERIFIED: the surface could not be reached, or the environment
  cannot prove the case. The reason is part of the result.
- KNOWN GAP: a deliberate decision or an environment limit, listed in
  section F. A KNOWN GAP is never reported as PASS.

## A. Build and unit suites (runner steps 1-2)

- A1 Build: `bun run build` exits 0 and the bundle contains the
  `version.json` value (no literal `VITE_APP_VERSION` left behind).
  Covers: the F1 duplicate-`asFiniteNumber` build break regression.
- A2 Unit quartet: the four suites pass together, 47/47:
  conveyor 14, carrier-tape 16, pattern-matcher 6, layout-slice 11.
  Covers: 382-vs-380 (test-only fix), matcher translation search,
  layout slices, conveyor/carrier-tape behaviour.

## B. Backend API probes (runner step 3, `pattern-search-backend-probes.py`)

All probes hit the live backend on `E2E_BE_URL` (default
`http://127.0.0.1:8787`). Images are generated in the probe itself
(pure-Python PNG writer, no fixtures), sent as data URLs. The
reference and the sample receive the same treatment on both sides.

- B1 Health: `GET /healthz` returns 200.
- B2 Same-image score: POST `/score` with identical reference and
  sample (gradient image, grayscale_tolerance) and a full-image ROI
  returns `is_pass` true and `confidence` 100.0. Covers: the F4
  decode asymmetry (COLOR + cvtColor on both sides).
- B3 Out-of-bounds ROI: POST `/score` with an ROI far outside the
  image returns verdict FAIL with reason `roi_out_of_bounds`, for all
  six branches: grayscale_tolerance, pattern_match, shape_track,
  color_area, blob_area, edge_width. Covers: `_clip_to_roi` clamping
  and ValueError-to-FAIL mapping.
- B4 Flat ROI with stamps: POST `/score` with a flat payload
  carrying `ImageWidth` / `ImageHeight` stamp keys returns a real
  verdict, never `missing_roi`. Covers: the F5 stamp-key regression.
- B5 Envelope ROI: POST `/score` with the `geometryJson` envelope
  (per-image conversion) and identical images returns `confidence`
  100.0. Covers: per-image conversion and the envelope regression.
- B6 Pin-one angle datum: POST `/vision/pin1-detection` with
  `AngleDatum` "package" is accepted (200, no 422), and an unknown
  datum falls back gracefully (200, no 422); a detected pin angle is
  reported when present. Covers: the pin-one datum end-to-end fix.
- B7 No ROI: POST `/score` with no ROI returns verdict FAIL with
  label `missing_roi`. This is designed behaviour (a rule without a
  saved search ROI cannot score), not a scoring failure.

## C. Run and install (runner steps 4-5)

- C1 No-browser run: `bash run.sh --no-shell` starts the backend and
  the frontend without launching a browser. Covers: "fix why it opens
  the browser" (`--no-shell` / `openBrowser:false`).
- C2 Warm start: with `BE/.venv` present, the run skips the DB
  bootstrap (skip line in the log) and reaches healthy faster than a
  cold start. Covers: run-method efficiency.
- C3 Health endpoints: backend `/healthz` 200 and frontend `/` 200
  on the configured ports, and the frontend serves the app shell.
- C4 Clean shutdown: SIGTERM to a run.sh instance on alternate ports
  stops it and frees both ports. Covers: run cleanup.
- C5 Installer: the bats clean-machine suite passes (install, doctor,
  launch, uninstall) with the venv bootstrap, version.json
  resolution, and fail-loud behaviour for a missing nix zip. Covers:
  installation improvement.
- C6 PS1 installer: KNOWN GAP, see F4 (no PowerShell on this VM).

## D. UI probe (runner step 6, `pattern-search-ui-probe.mjs`)

The probe drives the live frontend on `E2E_BASE_URL` (default
`http://127.0.0.1:8080`) with the repo's installed Playwright
Chromium. It waits for the boot-time auto-seed summary before
asserting, so a cold Vite compile cannot fake a failure. Anchors,
verified by diagnostics before the probe was written: rule detail
pages are unreachable in this build (every link on /setup/rules
renders "Rule was deleted or the link is stale": 13/13, then 3/3,
across fresh sessions), so editor cases do NOT chase rule links;
they use /setup/white-boxes (pattern surface) and /analyze
(pin-one and panel surfaces). Window controls, top menus and the
status bar mount only on HmiShell routes, so D10/D4/D5 run on
/trial-run, not on station pages.

- D1 App loads: the home page renders the workflow picker heading
  (not a blank page, not an error).
- D2 Navigation: /setup renders its Setup heading; /run renders its
  live dashboard (marker text "Run screen ready"; it has no Run
  heading). The /run check retries once (the marker is occasionally
  slow on cold Vite).
- D3 Simulation: UNVERIFIED in this build. The sim tool mounts via
  the rule-detail dispatcher (all rule links stale) and the analyze
  tune modal opens pin-one only; Start Simulation opens no distinct
  sim view. Recorded, not faked. Covers: the blank simulation render
  from the screenshots.
- D4 Version chip: /trial-run (a shell page) shows the status bar
  and VER pill when the status bar is shown. It is hidden by
  default, so UNVERIFIED on a fresh profile is the expected result,
  not a failure. Covers: "run does not show the application
  version in the UI".
- D5 Menu timings: a TopMenuBar group on /trial-run (Setup,
  Project, Home, Rules, Test in turn; triggers are Radix menuitems
  with aria-label "<Label> menu") opens, and the app's
  `[top-menu timing]` console lines report trigger-to-mount and
  trigger-to-paint in ms. The probe takes the first line with
  non-null values (React StrictMode can double-mount the menu
  content in dev, logging a second line with nulls). The numbers
  are the result; a cause is claimed only from the numbers, never
  from a guess. Covers: menu drop-down delay.
- D6 Toolbar: /setup/white-boxes (the pattern surface) shows the
  region-shape group (RECT / SQUA / CIRC / POLY), one canvas, and
  greyscale level 170. Zoom titles are absent on the empty view
  (no image loaded). Covers: "pattern search toolbars and icons
  are missing".
- D7 Matcher Tuning: UNVERIFIED on the empty white-boxes view. The
  Matcher Tuning card (Luma Tolerance, Search Margin, Search Step)
  appears only after boxes are detected; the view shows BOXES (0)
  with no pattern registered.
- D8 Canvas: /setup/white-boxes renders one canvas (empty until an
  image is loaded). Covers: pattern boxes spilling past image
  edges (the canvas and its toolbar are the surface that fix
  addresses).
- D9 Panel round-trip: on /analyze, a Collapse control hides a
  panel and an Expand/Show control restores it. Covers: panel
  restore.
- D10 Window controls: /trial-run (a shell page) exposes the
  window-controls group with fullscreen toggle and close. The probe
  also clicks the fullscreen toggle and reports fullscreen/viewport
  before and after (headless may not honor fullscreen; presence is
  the assertion). The close fallback chip counts as PASS when the
  browser ignores `window.close` (that is the designed fallback, not
  a failure). Minimize is a KNOWN GAP, see F2.
- D11 Pin-one datum UI: /analyze plus the first Visual Tune button
  opens the pin-one panel (PIN 1 CONFIGURATION, GREYSCALE LEVEL,
  ANGLE DATUM, threshold 35). If no pin-one surface is reachable,
  UNVERIFIED.
- D12 Route sweep: every top-level route (/, /setup, /run,
  /setup/rules, /setup/roi, /analyze, /results, /projects,
  /ai-testing, /trial-run, /settings/camera, /settings/trigger)
  renders real content: no blank page, no redirect back home, no 404
  heading. The sweep runs in a fresh browser context with one retry
  per route, so a long session cannot exhaust the renderer.
- D13 Minimize: the probe checks for a minimize control
  (`window-minimize` testid or a Minimize button). There is none in
  this codebase by design (F2), so the expected result is
  UNVERIFIED with that reason, not a pass and not a failure.

## E. Fluidness (reported by the runner and the UI probe)

- E1 Page load: home first-load ms (cold Vite compile allowed) and
  subsequent navigation ms. Reported, not thresholded: no spec
  threshold exists for this app.
- E2 Menu open: D5 numbers, idle vs running. A running value more
  than 2x the idle value is flagged SLOW in the report (an
  observation flag, not a spec threshold).
- E3 Run warm start: C2 timing. Reported.
- E4 Build time: A1 duration. Reported.

## F. Known gaps (never green, each with what closes it)

- F1 Square ROI enforcement: SQUA is a display-only shape today.
  Enforcing a square ROI is a scope decision the user has not made
  (which regions: search, pattern, masks, all; enforced at draw,
  resize, or validation). Closes on the user's scope answer.
- F2 Minimize button: deliberately not rendered (no web API for it;
  the spec forbids fake shims). Closes on the AI-01 shell decision.
- F3 Golden sample: no real golden photo fixture exists in the repo,
  so pattern-match accuracy on a real photo is UNVERIFIED.
  Closes when a golden photo plus its region is supplied.
- F4 PS1 installer: no PowerShell on this VM, so the .ps1 mirrors
  are untested. Closes on a Windows run.
- F5 Menu-delay root cause: unproven until D5 numbers exist. Closes
  when the probe measures idle vs running timings.
- F6 Backend mirror divergence: quantization-vs-binary differences
  between the backend mirror and the frontend matcher are
  report-only (no agreed tolerance). Closes on a tolerance decision.
- F7 Envelope lazy-import refactor: the CLI path currently needs
  fastapi installed because the envelope imports it eagerly. A
  follow-up refactor, not a behaviour failure.
