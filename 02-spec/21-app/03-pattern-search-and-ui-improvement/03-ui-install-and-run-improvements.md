# 03 — UI, Installation, and Run Improvements

Spec folder: `02-spec/21-app/03-pattern-search-and-ui-improvement/`
Companion files: `01-pattern-search-architecture.md` (coordinate unification, grayscale,
matcher, dispatch), `02-pattern-search-verification.md` (verification, inventories, E2E).
This file covers only the UI shell, window controls, menus, layers, ROI presentation,
installation, and run pipeline. Pattern-matching algorithm fixes live in file 01; do not
restate them here.

## 0. Status and precedence

- **Status:** spec for implementation. Open questions are marked `OPEN` and must be
  answered in writing before the affected item is built; they must never be guessed.
- **This spec does not invent a shell, a coordinate space, or a grayscale formula.**
  Where a prior document is silent, this file says so and records the question.
- **Precedence — must not contradict, in order:**
  1. `.ai-memory/plans/completed/01-pattern-search-spec.md` §0 rules and §11
     acceptance criteria (Modern UI untouched; DRY single source of truth;
     presentation-only mode branching with lossless mid-edit switching; §12
     unknowns never invented; exactly 4 fixed mask slots in Standard, index 0 on
     top, unlimited in Modern, same `masks` array, extra Modern layers never
     silently discarded).
  2. `02-spec/24-app-ui-design-system/40-menu-anti-jitter.md` (menu contract, §3).
  3. `02-spec/24-app-ui-design-system/04-rule-layers.md` and
     `.ai-memory/plans/completed/35-ui-ux-photoshop-layers-overhaul.md`
     (layer-stack semantics, §8).
  4. `02-spec/26-design-system-reverse-engineered/06-preview-mechanisms.md`
     (preview doctrine, §10–§11). Standard Mode grayscale tokens are by design;
     do not "fix" Standard grayscale as if it were a bug.
  5. `02-spec/22-app-issues/01-vision-inspection-ambiguities.md` (AI-01 shell
     runtime, AI-04 region shapes v1).
  6. Repo `AGENTS.md` house rules: Lovable-connected project — never rewrite
     pushed history; strict `is`/`has` booleans; parameter structs for more than
     2–3 parameters; 5–8 file micro-batching for refactors.
- **Collision rule:** the in-flight `02-cicd-remediation` task owns `linter-scripts/`,
  `scripts/check-magic-strings.sh`, and `BE/app/installer_path.py`. This spec's
  workers must not touch them. `app-shell` edits (§1, §3) must land before that
  task's SS-04 visual-baseline regeneration, or SS-04 baselines will churn.

## 1. Window controls

### 1.1 As-built truth (verified)

- The app is a web app, not a desktop app. There is no `src-tauri/` directory, no
  Electron code, and no `closeWindow` / `appWindow` / `getCurrentWindow` symbol
  anywhere in `src/`.
- `src/components/hmi/Titlebar.tsx` is a sticky web `<header>`. Its right cluster
  (`src/components/hmi/titlebar-parts.tsx`, `HeaderActions`) contains only
  `TopMenuBar`, `UiModeSwitch`, `FlavorToggle`, `ThemeToggle`,
  `HeaderDensityToggle`, `KeyboardModeIndicator`. There are no close / minimize /
  maximize controls in it.
- The launchers (`run.ps1`, `run.sh`) start a browser with `--app=<url>`, which
  strips normal browser chrome. The operator therefore has no window controls
  inside the app and only a minimal OS frame.
- `chromium-shell/` is a Chrome extension (MV3, `storage`/`tabs`/`windows`
  permissions; `background.js` copies the `?backend=` URL parameter into
  `chrome.storage.local`). It is **not** a desktop shell and provides no window
  controls. Any plan that calls it "the shell" is wrong and must be corrected.

### 1.2 Requirement: panel chrome (the controls that do exist)

Panel chrome is wired and must be fixed, not reinvented:

- `src/components/app-shell/PaletteFrame.tsx` renders Minus (minimize),
  Maximize2/Square (maximize/restore), and X ("Dock"/"Close to dock") per panel,
  plus double-click title-bar maximize toggle. State lives in
  `src/lib/stores/palette-store.ts` (modes `docked | floating | minimized |
  maximized | hidden`, persisted to localStorage key
  `ca-hmi:palette.layout.v1`).
- **Defect 1 — dual panel systems.** `PaletteFrame` / `palette-store` (panel ids:
  layers, preview, tools, userFunctions) coexists with
  `src/lib/workspace/layout-slice.ts` + `src/lib/workspace/panel-registry.ts`
  (workspace panels, persisted to `workspace-layout:v1`), controlled by
  `src/components/app-shell/WindowMenu.tsx` and
  `src/components/nav/WindowMenubarGroup.tsx`. A panel minimized or hidden in
  one system is invisible to the other system's restore path. The fix must
  either unify the two systems into one layout store or build an explicit,
  tested bridge (minimize/hide/restore round-trips through both stores). Two
  stores silently disagreeing is the defect; adding a third store is forbidden.
- **Defect 2 — hidden is a dead end.** `PaletteFrame` returns `null` when
  `mode === "hidden"`. The default for `userFunctions` is `hidden`. There is no
  in-panel affordance to un-hide; recovery depends on the Window menu (the
  other system) or Reset Layout (`ResetLayoutButton`, same file, resets both
  stores). Every hidden panel must gain a reachable restore path (Window menu
  entry, and a restore affordance that does not require knowing the panel id).
- **Defect 3 — stale persisted state.** `palette-store.ts` `mergeStates` merges
  stored JSON over defaults; a corrupted or stale `ca-hmi:palette.layout.v1`
  (for example `mode: "hidden"` or `maximized` with off-screen x/y) persists
  across restarts, so buttons appear "not to work" until layout reset. The fix
  must validate persisted layout on load (known panel ids, on-screen geometry,
  known mode values), discard invalid entries with a logged warning, and keep
  Reset Layout as a one-click recovery. Wiping a valid user layout without cause
  is a regression, not a fix.
- **Acceptance:** minimize → restore, maximize → restore, close-to-dock →
  re-open, and hidden → restore all round-trip for every panel id, in both
  panel systems, after a restart with stale persisted state present.

### 1.3 OPEN decision: the shell (AI-01)

- Ambiguity AI-01 (`02-spec/22-app-issues/01-vision-inspection-ambiguities.md`)
  is still unresolved: shell runtime is Python+CEF, Tauri, or Electron, with a
  provisional default of "shell-agnostic UI".
- Until AI-01 is resolved in writing, this spec requires **browser-chrome
  reliance to be documented as the current behaviour**, not papered over:
  - Document that close / minimize / maximize are OS/browser responsibilities
    today, and that `--app=` mode removes them from view.
  - If a real shell is chosen later, it must arrive with a real IPC contract
    (window-control messages, one owner file, one protocol version). A fake
    Tauri/Electron shim that renders dead buttons is explicitly forbidden —
    it would reproduce the reported defect with prettier chrome.
- No worker may assume a shell exists. Code that checks for a shell IPC object
  must degrade to the documented browser behaviour when the object is absent.

## 2. Blank simulation render

- Reported symptom: the simulation view renders only the top event toolbar
  (MENU, SIMULATION, event/snapshot counts) while the main content area is
  blank.
- Rule (from `02-spec/26-design-system-reverse-engineered/06-preview-mechanisms.md`):
  a preview surface is a 16:9 well (`aspect-video`), 1px `ca-border` frame,
  square corners, `bg-ca-viewport`, status badge top-left, overlays drawn ON the
  surface, never in separate panels. **Empty states use diagonal hatch + muted
  mono text, never a blank box.**
- Requirement: the simulation surface must never render blank. On load failure,
  missing frames, or an unmounted canvas, it must render the hatch empty state
  with a human-readable reason (which asset or step failed) and a retry action.
  A blank white main area is a defect under this spec, not an acceptable
  loading state. The underlying render failure must be diagnosed against the
  simulation canvas mount path; the hatch state is the floor, not the fix.

## 3. Menus

### 3.1 Contract (non-negotiable, from 40-menu-anti-jitter.md)

- The top nav and every context menu **must not resize or reposition on hover**.
  Layout shift on hover is the recorded direct cause of issue 17.
- Fixed tokens in `src/styles.css`: `--menu-item-px: 12px`,
  `--menu-item-py: 8px`, `--menu-item-h: 36px`, `--menu-item-radius: 6px`,
  `--menu-gap: 4px`, applied at rest AND hover. Overriding at component level
  is forbidden.
- Forbidden on hover / focus / active: `padding`, `margin`, `width`, `height`,
  `border-width`, `outline-width`, `font-size`, `letter-spacing`,
  `transform: scale`, `transform: translate` (except the running-pill drag).
- Allowed: `background-color`, `color`, `box-shadow`, `border-color` (equal
  border-width at rest), an absolutely-positioned underline pseudo-element
  growing 0→100%.
- `<MenuItem>` (`src/components/app-shell/MenuItem.tsx`) is the ONLY primitive
  for top-nav, breadcrumb dropdowns, running-pill dropdown, and context menus.
  Radix DropdownMenu items compose it; no second menu-item implementation may
  be introduced.
- Verification (existing): Playwright hover assertions (boundingRect identical
  pre/post hover, tolerance 0px; total header CLS on hover < 0.01) plus a CSS
  lint script failing any `.menu-item:hover` block that sets a forbidden
  property. Menu work must keep both green.

### 3.2 Open latency: unmeasured, do not claim a cause

- The recorded menu root cause is **jitter (layout shift on hover), not open
  latency**. No spec or plan records a root cause for a menu that "takes a long
  time to open". That is an open measurement question.
- Requirement before any latency fix: capture timing evidence — time from
  trigger (click / Alt-mnemonic) to first painted menu content, on the
  simulation screen and on a light screen, with the browser performance panel.
  A fix landed without a before/after timing pair will be reverted as
  unverified.
- Verification items to measure, in order (these are suspects, not causes):
  1. **Titlebar re-render storm.** `TopMenuBar`
     (`src/components/nav/TopMenuBar.tsx`, Radix `Menubar`) subscribes to
     `useRouterState` (pathname), `useRunStore` (running), `useHydrated`,
     `usePanelHostMounted`, plus `useMenuShortcuts` (global keydown listener)
     and `useAltMnemonicOpen` (one shortcut per menu group via
     `src/lib/shortcuts/registry.ts`). Every navigation or run-state change
     re-renders the whole menubar and its 8 groups plus the Window group.
     Measure whether render count, not paint, dominates.
  2. **Compositing cost.** The menubar lives in a `sticky top-0 z-40` header
     with `backdrop-blur-2xl` over pages that render heavy canvases
     (simulation / camera preview). Backdrop blur over a repainting canvas
     makes the dropdown *paint* late even if it opens on time — consistent
     with the complaint appearing after simulation was added.
  3. **Portal + animation.** `MenubarContent` renders through a Radix Portal
     with enter animation (`tw-animate-css`: `animate-in`, `fade-in-0`,
     `zoom-in-95`). On a janky main thread the animation frames stretch and
     read as "slow to open". Note: no `delayDuration` is set on any
     menubar/dropdown (only `TooltipProvider` delays exist, 140–200ms) — the
     delay is not a configured menu delay.
  4. **Window group pop-in.** `WindowMenubarGroup` is gated on
     `panelHostMounted`; until a `DockableFrame` mounts, the Window group is
     absent, then pops in — a visible menu-content shift.
- Fix direction (only after measurement): memoize or split the menubar render
  path, reduce blur cost over canvas pages, or shorten the enter animation —
  whichever the timing evidence indicts. Changing all three at once is
  forbidden: one variable, one measurement.

## 4. Browser auto-open on run

### 4.1 As-built truth

- `run.ps1` and `run.sh` always launch Chromium/Chrome/Edge with
  `--app=<frontend>?backend=<backend>` unless `-NoShell` / `--no-shell` is
  passed. There is no "don't open browser" default; the flag is opt-out.
- `run.config.json` declares `"openBrowser": true`, but **neither script reads
  `run.config.json`**. That file is consumed only by agent skills
  (`.agents/skills/run/skill.md`, `.agents/skills/create-run-ps1-file/skill.md`).
  Editing `openBrowser` in the config changes nothing. This config drift is the
  root cause of the "why does it still open the browser" confusion.

### 4.2 Requirement: one source of truth

- The launchers must read one configuration source for the browser decision,
  and that source must be the same one the operator edits. Two acceptable
  shapes; pick one and delete the other:
  - (a) `run.ps1` / `run.sh` read `run.config.json` (`openBrowser`) and the
    CLI flags override it; or
  - (b) `run.config.json`'s `openBrowser` key is removed as dead, and the
    flags are documented as the only control.
- In either shape: `-NoShell` / `--no-shell` must be honored on both scripts;
  when the browser is suppressed, the scripts must print the frontend URL and
  continue (current behaviour when no browser is found — keep it).
- Document the new default behaviour in the run skill and in the launchers'
  help text. An operator must be able to answer "will this run open a browser?"
  from one file.
- Out of scope for this item (user-initiated, not run-time): `TopMenuUtils`
  `openHelpDocs()` → `window.open("https://docs.ai-memory.dev/")`, and the
  `GlobalErrorModal` "Debug guide" button → `window.open(...)` to a
  `02-spec/03-error-manage/.../00-overview.md` path that is not a served route
  and whose filename class is banned by spec rules. That button must be
  re-pointed at a real route or removed; opening a broken tab is a defect, but
  it is a help-link defect, not a run-launcher defect. Do not conflate them.

## 5. Version display during run

### 5.1 As-built truth

- Canonical version: `version.json` = `4.112.17`, in sync with `package.json` =
  `4.112.17` on this branch — but behind the release line (branch reports
  release `v4.112.20`; remote releases reach `v4.113.7`). Version drift is real
  and must be reconciled by the release process, not by hand-editing one file.
- **No version is rendered anywhere in the chrome.** Zero `version` hits in
  `src/components/layout/`; `src/components/hmi/StatusBar.tsx` shows program
  name + RUNNING/IDLE + TOTAL/OK/NG only; `HeaderBrand`
  (`src/components/hmi/titlebar-parts.tsx`) shows "Control Automation"/"CA"
  with no version; `StandardAppShell` brand likewise has no version.
- Dead slots exist: `src/components/hmi/HmiShell.tsx` accepts
  `statusBarLeft` / `statusBarRight` props but never passes them to
  `<StatusBar />`. They are dead props today.
- No build-time version injection exists: `vite.config.ts` defines no
  `VITE_APP_VERSION`.
- Installer-side version is separate: `packaging/installers/install.ps1`
  (`$AppVersion` from `$env:APP_VERSION`, default `'unknown'`) and
  `packaging/installers/install.sh` (`APP_VERSION_STR`, default `unknown`)
  both record `unknown` when the env var is unset.

### 5.2 Requirement

- Render the app version in exactly one chrome location (StatusBar or
  HeaderActions — pick one, not both) via build-time injection from
  `version.json` (add the `VITE_APP_VERSION` define or equivalent; the
  injected value must equal `version.json` at build time).
- The version chip must be visible during run (not only on a settings page),
  must not be hidden by compact-screen conditionals, and must read the same
  value the release workflow stamps.
- Installer plumbing: the release workflow must export `APP_VERSION` so
  installs never record `unknown`; an install whose `install.json` says
  `unknown` must be treated as a release-process defect.
- Constraint: the version-sync checker (`.agents/scripts/14-version-sync-checker.py`)
  enforces `version.json` / `package.json` / changelog parity. Version-display
  work must not break that parity and must not hand-edit a version field
  outside the release process.

## 6. Run efficiency

Run pipeline (current, both scripts): clean `BE/be.egg-info`; optional DB
bootstrap; start backend (`uvicorn BE.main:app`, port 8787); poll health;
start frontend (`bun run dev`, port 5173); poll readiness; launch browser
shell; sleep loop until Ctrl+C; stop tracked jobs.

### 6.1 Bottlenecks (measured claims to verify, then fix)

1. **Synchronous DB bootstrap on every run (ps1 only).** `uv run --project BE
   python bin/db-bootstrap.py` runs before the backend starts, with no
   skip-if-unchanged check. Requirement: skip when the schema state is already
   current (checksum or migration watermark); a no-op bootstrap must cost
   ~nothing, not a full run.
2. **Sequential health waits with 1s polling.** `scripts/dev/wait-for-http.ps1`
   / `scripts/dev/wait-for-http.sh` poll every 1s. `run.ps1` waits backend
   `/healthz` (60s cap) then frontend `/setup` (180s cap); `run.sh` waits
   `/health` (30s) then `/` (30s). Worst case the launcher sits up to 4 minutes
   before launching the shell. Requirement: shorten the poll interval where
   safe, parallelize independent waits, and cap total wait with a clear
   timeout message naming which service failed.
3. **Frontend readiness gate is a heavy route.** `run.ps1` waits on `/setup`
   (SSR render of the setup route) rather than a cheap health endpoint; cold
   Vite startup + TanStack Start SSR makes this the long pole. Requirement: gate
   on a cheap endpoint (a dedicated health route, or `/` once it is proven
   cheap); the `/setup` gate must go unless a measurement shows it is cheaper.
4. **Port / path drift between the two scripts.** `run.config.json` says
   `fePort: 8080`; both scripts default to 5173. Health path is `/healthz`
   (ps1, config) vs `/health` (sh). `run.sh` starts the frontend without
   `--host` while `run.ps1` binds `127.0.0.1`. The Vite proxy targets
   `127.0.0.1:8787` for `/camera`, `/score`, `/images`, `/rules`, `/samples`,
   `/telemetry` (`vite.config.ts`) — if the backend binds elsewhere, proxy calls
   fail. Requirement: one port table and one health-path table, shared by both
   scripts and the config; any change lands in all three places in the same
   commit.
5. **No dependency preflight in the scripts themselves.** Missing `uv` / `bun` /
   `.venv` fails late (backend start or `uv run` error) instead of failing
   fast. The documented fallback (`gitmap aum install` or
   `local-install.ps1` / `local-install.sh`) lives only in the run skill — and
   **`local-install.ps1` / `local-install.sh` do not exist in this repo**
   (zero hits). Requirement: preflight at script start (uv, bun, venv present)
   with a fail-fast message naming the missing piece and the real install
   command; either create the local-install scripts or remove the reference
   to them from the skill.
6. **Cleanup gaps.** `run.ps1` tracks only the `Start-Process` PIDs; `uv run` /
   `bun` child processes can outlive the launcher. `run.sh` traps EXIT/INT/TERM
   and kills recorded PIDs only. Requirement: kill the whole process tree on
   exit on both scripts; a second run must never collide with an orphaned
   first run's ports.
7. **Vite cold-start cost.** `vite.config.ts` pre-bundles (`optimizeDeps.include`)
   react, lucide, recharts, radix dialog/popover/tooltip/slot/dropdown-menu/select
   — but **not `@radix-ui/react-menubar`**, so the menu chunk is optimized on
   first use. Requirement: add the menubar package to `optimizeDeps.include`
   (and audit for other first-use-only chunks while there).

### 6.2 Acceptance

- A warm re-run (nothing changed since the last run) reaches the browser shell
  measurably faster than a cold run, with the DB-bootstrap skip and the cheap
  readiness gate both demonstrably active (log lines proving the skip and the
  gate used).
- Both scripts agree on ports, host binding, and health paths; the config file
  agrees with them (§4.2).
- A run with a missing dependency fails in seconds with a named remedy, not
  minutes into backend startup.

## 7. Installation

Installer surface: `packaging/installers/install.ps1` +
`packaging/installers/install.sh` (Plan 90 Step 106 orchestrators, driven by
`BE/app/installer_plan.py`), tests in `packaging/installers/tests/Install.Tests.ps1`
and `packaging/installers/tests/install.sh.bats`.

### 7.1 As-built gates (documented here so fixes preserve them)

- **Hard prerequisites, no bootstrap.** `install.sh` defaults `PYTHON_EXE` to
  `.venv/bin/python` and `install.ps1` uses a venv python; neither creates the
  venv. Missing venv → renderer/doctor failure (exit 3 / 9530).
- **`APP_BINARIES_DIR` is mandatory for `--install`** (Step 125 removed the
  skip fallback); missing → exit 2. The SHA256SUMS cross-check then gates
  everything (failure → exit 6 / 9533).
- **Doctor gate.** `bin/install-doctor.py` blocks on errors (exit 5 / 9532);
  `--force-warn` overrides warnings only, never errors.
- **Upgrade planner ordering.** `bin/install-upgrade-plan.py` runs after the
  doctor, before the plan renderer; downgrade blocked → exit 7 / 9534 unless
  `--allow-downgrade`; same-version reinstall blocked unless
  `--force-reinstall`.
- **Install order.** db-bootstrap first, retention-timer last (install);
  reversed on uninstall. Retention timer is a systemd unit
  (`packaging/systemd/vision-app-retention.service.tmpl`) / Windows scheduled
  task (`packaging/windows/vision-app-retention-task.xml.tmpl`).
- **Installer exit-code contract (2–9 / 9530–9536) is test-locked.** Flag
  changes must update both wrappers + tests in the same commit.

### 7.2 Required improvements

1. **Venv bootstrap.** The installers must create the venv when it is missing
   (or fail with a single command that creates it), instead of failing deep in
   the renderer/doctor. "Prerequisite missing" must be a preflight finding,
   not a mid-install crash.
2. **`APP_BINARIES_DIR` handling.** Keep the mandatory gate, but the error
   message must name the expected directory layout and the command that
   produces it. A bare exit 2 with no remedy is a defect.
3. **Fail loud, never silently skip.** `run.sh`'s packaging step uses
   `nix run nixpkgs#zip`; without nix it prints a warning and silently skips —
   `public/app-shell.zip` goes stale with no error. Requirement: the zip step
   must either succeed, or fail the packaging step with a non-zero exit and a
   message naming the missing tool. A stale artifact shipped silently is
   forbidden.
4. **Clean-machine end-to-end install test.** `packaging/installers/tests/`
   cover the wrappers, but there is no end-to-end install test on a clean
   machine in-repo. Requirement: add one (container or fresh-directory
   harness) that runs install → doctor → launch → uninstall and asserts the
   exit-code contract and the `install.json` audit trail. This is the
   acceptance test for this section; wrapper unit tests alone do not pass it.
5. **Version plumbing.** See §5.2: installs must never record `unknown`.

## 8. Layers

### 8.1 Two ordering conventions — scope them, do not merge them

- **Editor layer stack** (`02-spec/24-app-ui-design-system/04-rule-layers.md`,
  plan 35): store `src/lib/editor/store.ts` (Zustand), slice
  `rulesByProgram[activeProgramId]: Rule[]` in stack order, **index 0 = bottom**.
  Row anatomy 36px: drag handle (grip icon), 16×16 thumbnail from shape bbox,
  rule name (inline-editable, double-click), kind pill, visibility toggle, lock
  toggle. Locked rules: dim body to 60% alpha; visibility off: overlay + row
  body drop to 40% alpha. Rules: **hidden rules do not render overlay; locked
  rules cannot be transformed** (log `layers.locked_transform_blocked` on
  attempt). Error codes pinned: `E_LAYER_REORDER_FAILED`,
  `E_LAYER_MERGE_INCOMPATIBLE`, `W_LAYER_GROUP_EMPTY`. Group data additive, no
  schema-breaking change.
- **Pattern-search mask slots** (01-pattern-search-spec §8.2): exactly 4 fixed
  slots in Standard, **index 0 on top**; empty slots still render showing
  `None`; no add/remove button. Modern: unlimited layers with add/remove/
  reorder. Both read/write the same `masks: MaskLayer[]`.
- **Requirement:** every "move layers" fix must state which surface it touches
  and which convention governs that surface. A fix that applies the editor
  convention to mask slots (or vice versa) will reintroduce the reported
  confusion. The spec does not resolve the contradiction by picking one global
  order; it scopes each order to its surface.

### 8.2 Diagnosis, not blind rewiring

- `src/components/editor/layers/LayersPanel.tsx` (Photoshop-style list;
  `onReorder` / `onMoveUp` / `onMoveDown` are OPTIONAL — when omitted, DnD and
  keyboard reorder are inert) **is fully wired at its only production usage**:
  `src/components/editor/InspectorSurface.tsx:296` wires all three
  (`reorderRule`, `reorderRules`). "Cannot move layers" is therefore not a
  missing-wiring defect at that usage.
- Requirement: the layer-reorder fix must start from a reproduction, then
  adjudicate among the verified suspects:
  1. `useLayerDnd` (`src/hooks/editor/useLayerDnd.ts`) / keyboard controller
     (`src/lib/editor/dnd/keyboard-controller.ts`) behaviour — DnD mechanics,
     not wiring.
  2. The simulation's local `treeRules` (add/delete only, no reorder) in
     `StandardGreyscaleSimulationTool` — a separate tree that never had
     reorder; either add reorder or document no-reorder explicitly.
  3. Pattern mask regions (add/delete/select only, no reorder) in the
     white-box tool — same treatment: add reorder or document no-reorder.
  4. Locked / hidden rule semantics (§8.1): a locked rule refusing transform
     and a hidden rule not rendering are correct behaviour, not bugs — the
     fix must distinguish them from a genuine reorder failure in its error
     reporting.
- No `moveLayer` symbol exists anywhere in `src/components/editor`. If a
  worker introduces one, it must be the single reorder entry point, not a
  second path alongside `reorderRule` / `reorderRules`.

## 9. Square ROI — a new requirement, not an existing invariant

- **Fact:** searches for "square ROI" in plans and "square" in the rule-setup /
  shape-model / preview specs return zero hits. The pattern-search spec §5
  requires clamping + minimum size, not squareness. The shape model allows
  independent Width/Height. Folder 26 previews are 16:9 wells and 640×480
  canvases. **No prior document requires a square ROI.**
- **OPEN scope questions — answer in writing before building:**
  1. Which regions must be square: search region, pattern region, masks, or
     all three?
  2. Enforced at draw time (drag creates a square), at resize time (handles
     preserve aspect), at validation time (non-square rejected with a message),
     or some combination?
  3. What happens to existing non-square regions (migrated, grandfathered,
     flagged)?
  4. Does squareness apply in both UIs or Standard only? (Per 01-pattern-search-spec
     §0 rule 2, a rule that exists in one UI's shared domain must exist in both
     unless explicitly scoped — do not silently scope it to one UI.)
- Until these are answered, no worker may cite an existing invariant for
  squareness, and no "square ROI" behaviour may be presented as restoring a
  regression. It is a new rule to be specified, then built.
- Related verified fact: region creation in the white-box canvas works today
  (click outside → `"new"` → drag, `pattern-geometry.ts` `hitRegionHandle`;
  `canvasPointFromEvent` CSS→backing-store scaling is correct). The square-ROI
  work must not break that path.

## 10. Toolbars and icons inside the ROI

### 10.1 The gap

- `StandardImageToolbar` is used only by `StandardPatternSearch.tsx:201` and
  `StandardToolShell.tsx:132`. It is **never** rendered by the greyscale pattern
  tool (`WhiteBoxMarkingTool`: `PatternCanvas` + `BoxReviewPanel` + bottom
  action bar, no image toolbar) or the simulation tool. That is the verified
  mechanism behind "pattern-search toolbars/icons missing inside ROI".
- `RegionOverlay` is border + 8 magenta handles only — no toolbar, no icons,
  no square lock.
- Requirement: the image toolbar (source dropdown, rendering dropdown,
  refresh, zoom in/out, fit/actual-size, zoom readout with presets, view-mode
  toggles — per 01-pattern-search-spec §4) must be present on the greyscale
  pattern tool surface and the simulation surface, wired to the same shared
  view state, not a second toolbar implementation. Toolbar actions must operate
  on the same image the canvas shows; a toolbar that zooms a different surface
  is worse than no toolbar.

### 10.2 ROI colour mapping — adjudicated (one mapping for the pattern-search screen)

Four sources disagree. This spec picks one mapping for the pattern-search
screen and states what it supersedes:

| Element | This spec (pattern-search screen) | Supersedes |
|---|---|---|
| Image region / full field-of-view frame (outermost) | Yellow | Folder 26 idiom C's yellow = PatternEdge |
| Search region | Blue | Folder 26 idiom A emerald = ROI; 21-app/32 green = active Search Region |
| Pattern region (template) | Green | Folder 26 idiom C blue = ROI; 21-app/32 red/pink = Pattern Region |
| Mask regions | Rose/red | Folder 26 idiom A rose = masks (kept) |
| Selected-region handles | Magenta/pink, 8 handles (corners + edge midpoints) | 21-app/53 rotation handle is NOT adopted for pattern-search regions (see below) |
| Match origin / orientation marker | Green arrow/marker at centre | — (from 01-pattern-search-spec §5) |

- Rationale: the pattern-search screen's own spec (§5) is the controlling
  document for that screen; the other sources describe different screens
  (setup ROI, editor canvas, ground-truth captures). Where they conflict on the
  pattern-search screen, §5 wins.
- **Handle set:** 8 handles, no rotation handle, for pattern-search regions
  (01-pattern-search-spec §5). 21-app/53 and folder 26 idiom D add a rotation
  handle (20px offset, `alias` cursor, 15° snap in idiom D). That handle is a
  documented divergence, not an oversight: if rotation is later required for
  pattern regions, it must be specified as an addition (which regions rotate,
  snap behaviour, persistence in geometry) — not silently copied from the
  editor canvas.
- Outside this screen, the source mappings stand: idiom A (emerald ROI, rose
  masks) remains the setup-flow mapping; idiom D (editor canvas, blur-spotlight)
  remains the editor mapping. Workers must not "fix" those screens to the
  pattern-search mapping.

## 11. Preview idioms — which one to copy

From `02-spec/26-design-system-reverse-engineered/06-preview-mechanisms.md`:

- **Idiom A for setup flows** (`setup/StandardRoiSetup.tsx`, "Yeasin's
  industrial style — the current direction"): canvas `w-[640px] h-[480px]`
  border `border-ca-border` shadow on a pinstripe surround; ROI `border-2
  border-emerald-400 bg-emerald-500/15` (solid 2px emerald, 15% fill),
  `transition-all duration-75`; baked label chip top-left
  (`text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 px-1
  py-0.5 rounded border border-emerald-400/40`) reading `ROI 01 [WxH]`;
  bottom-right coordinate chip at 9px; circle variant adds `rounded-full` +
  centre dot, ring inner edge dashed `border-emerald-300`; masks
  `border-2 border-rose-500 bg-rose-600/30` with `MASK 0 (EXCLUDED)` chip; **no
  dimming outside the ROI**.
- **Idiom D for editor canvases** (blur-spotlight, "the most advanced"):
  selection ring 2px, `borderColor: ruleColor ?? "var(--ca-select, #8b5cf6)"`,
  opacity 0.85; 8 handles with 24px hit areas; rotation handle 20px above the
  box, 15° snap; `animate-[editor-ripple_650ms_ease-out_forwards]` pulse on
  selection; spotlight: area OUTSIDE the ROI dimmed/blurred via SVG mask
  (`SelectionOverlayBlurBackdrop.tsx`: `OUTER_BLUR_PX = 6`,
  `INNER_BAND_BLUR_PX = 2`; skipped when "Sharpen preview" is on); preview
  modes Off / Selection / All (hotkey `P`); `RoiBadge` label tab at `-top-6`,
  13px tabular-nums; `SafeZoneOverlay` dashed 4/4 rect at 10% insets + solid L
  corner brackets (strokeWidth 3).
  - **Reskin-leak trap (recorded):** the `#8b5cf6` fallback is hardcoded purple
    and will NOT follow a `--ca-primary` reskin — replace the fallback when
    reskinning.
- **Idioms B and C are legacy — do not extend them.** B (`vision/RoiSelector.tsx`:
  tolerance zone dashed `border-primary/50 bg-primary/5`, ROI `border-2
  border-primary bg-primary/20`, four 8px corner handles). C
  (`vision/RuleDrawingOverlay.tsx`: rubber-band drawing, PatternEdge
  `border-2 border-yellow-400 bg-yellow-400/20`, ROI `border-2 border-blue-400
  bg-blue-400/20`, hint pill). New work copies A or D only.
- Other preview rules that bind this spec: verdict overlays are canvas-drawn
  with hex/rgba — an explicit exception to the oklch rule. No dedicated
  lightbox/zoom modal exists; enlarged images live inside modal dialogs. Zoom
  is inline (`ZoomableCanvas`). Conveyor/simulation preview assets
  (`conveyor_inspection_preview.png`, `conveyor_inspection_30s.mp4`) are
  unreferenced loose demo assets — zero imports; there is no inspection video
  player, and the functional analog is the simulated canvas.

## 12. Acceptance criteria (this file)

1. Panel chrome: minimize/restore, maximize/restore, close-to-dock/re-open,
   hidden/restore round-trip for every panel id, across both panel systems,
   after restart with stale persisted state. No third layout store introduced.
2. Shell: AI-01 recorded as open or resolved in writing; no dead-button shim
   shipped; browser-chrome reliance documented if no shell is chosen.
3. Simulation surface never renders blank; failure renders the hatch empty
   state with reason + retry.
4. Menu anti-jitter contract green (hover assertions + CSS lint). Menu open
   latency measured before/after any latency fix; no latency fix without a
   timing pair.
5. Browser-open decision has exactly one source of truth; `-NoShell` /
   `--no-shell` honored on both scripts; new default documented.
6. App version visible during run from build-time injection, equal to
   `version.json`; installs never record `unknown`.
7. Warm re-run measurably faster (DB-bootstrap skip + cheap readiness gate
   logged); both scripts and config agree on ports, host, health paths;
   missing dependency fails fast with a named remedy; menubar chunk
   pre-bundled.
8. Installer exit-code contract preserved (both wrappers + tests updated
   together); nix zip step fails loud; clean-machine E2E install test passes
   (install → doctor → launch → uninstall).
9. Layer fixes state their surface and its ordering convention (editor:
   index 0 = bottom; mask slots: index 0 = top); reproduction precedes any
   reorder change; locked/hidden semantics distinguished from reorder failure.
10. Square ROI: scope questions (§9) answered in writing before building; no
    worker cites a prior invariant for squareness.
11. Image toolbar present and functional on the greyscale pattern tool and the
    simulation surface, on shared view state; pattern-search screen uses the
    §10.2 colour mapping; setup flows keep idiom A, editor canvases keep idiom
    D; idioms B and C not extended.
12. Sequencing: `app-shell` edits land before 02-cicd-remediation SS-04
    baseline regeneration; no 02-cicd-remediation-owned file touched.

## 13. File ownership for implementation workers (disjoint boxes)

- **Window-controls worker:** `src/components/hmi/Titlebar.tsx`,
  `src/components/hmi/titlebar-parts.tsx` (new controls only), new shell-IPC
  module if created. Must not touch `src/components/app-shell/*`, `run.*`,
  `packaging/*`.
- **Panel-chrome worker:** `src/components/app-shell/PaletteFrame.tsx`,
  `src/lib/stores/palette-store.ts`,
  `src/components/app-shell/panels/MinimizedRail.tsx`. Must not touch
  `src/lib/workspace/*` (coordinate with the window-menu worker).
- **Window-menu worker:** `src/components/app-shell/WindowMenu.tsx`,
  `src/components/nav/WindowMenubarGroup.tsx`,
  `src/lib/workspace/layout-slice.ts`, `src/lib/workspace/panel-registry.ts`.
  Must not touch `src/lib/stores/palette-store.ts`.
- **Menu-performance worker:** `src/components/nav/TopMenuBar.tsx`,
  `src/components/nav/TopMenuGroup.tsx`, `src/components/nav/TopMenuRows.tsx`,
  `src/components/nav/TopMenuMnemonics.tsx`, `src/components/ui/menubar.tsx`.
  Must not restructure `src/components/hmi/Titlebar.tsx` (single-header
  invariant locked by `tests/e2e/playwright_single_header.py`). Owns any
  `src/styles.css` change for menus; other workers request via spec.
- **Launcher worker:** `run.ps1`, `run.sh`, `run.config.json`,
  `scripts/dev/wait-for-http.ps1`, `scripts/dev/wait-for-http.sh`. Must not
  touch `packaging/installers/*` or `src/*`.
- **Version-display worker:** `src/components/hmi/StatusBar.tsx`,
  `vite.config.ts` (version injection only), `version.json` (read-only unless
  release). Must not touch the `package.json` version field (release process
  owns it).
- **Installer worker:** `packaging/installers/install.ps1`,
  `packaging/installers/install.sh`, `bin/install-*.py`,
  `BE/app/installer_plan.py`, `packaging/installers/tests/*`. Must not touch
  `run.ps1`, `run.sh`, or `BE/app/installer_path.py` (02-cicd-remediation).
- **Layers / ROI-UX worker:** `src/components/editor/layers/*`,
  `src/hooks/editor/useLayerDnd.ts`, `src/components/vision/standard/RegionOverlay.tsx`
  (square lock only, after §9 is answered),
  `src/components/vision/WhiteBoxMarkingTool.tsx` +
  `src/components/vision/standard/tools/StandardGreyscaleSimulationTool.tsx`
  (toolbar gap only), `src/components/vision/white-box/BoxReviewPanel.tsx`
  (mask-region reorder). Must not touch evaluator math.
- Shared read-only for all: `src/styles.css` (tokens/animations) — edits need
  a single owner (menu-performance worker for menu changes).
