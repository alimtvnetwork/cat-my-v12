# Spec 54 — Vision System and Error Management Instructions

**Slug:** vision-system-and-error-management-instructions
**Date:** 31-Oct-25 (planning phase)
**Repo:** cat-my-v12, branch main
**Status:** PLANNING ONLY — no code changes in this phase. Analysis first, then execution waves.

## 1. User's Problem Statement (Summary)

Issues keep returning despite repeated prompts. The vision system must be fixed
systematically: window controls, error capture, CLI-addressable UI, hover
glitches, Pin1/grayscale/pattern-search behavior, layers, simulation timing,
camera dropdown, and bug reporting via email + Supabase.

## 2. Confirmed Understanding (User's Model)

- **Window controls:** minimize, maximize, close in the vision system must work;
  close currently crashes.
- **Error discipline:** every error goes through the error wrapper + error
  model (spec 02-spec/03-error-manage/). No swallowing. All errors persist to
  an error database built on the SplitDB concept, exportable as bug reports
  in recording mode, and listable from the CLI with stack traces so AI can
  fix step by step.
- **CLI-addressable UI (first line of defense):** every button/screen element
  carries three things: an `Id`, a display name (as seen on screen), and an
  XPath. The CLI can click any button by Id or XPath. The CLI must be able to
  change anything in the UI (grayscale tolerance, ROI, patterns) and drive
  end-to-end tests from the CLI, including screenshot validation.
- **Hover glitch:** menu buttons jump on hover; the simulation next button
  glitches the same way. Root cause to be found, not guessed.
- **ROI + patterns (Photoshop model):** ROI is created first (specific color),
  then locked — it does not move unless double-clicked. Inside the ROI,
  pattern search finds numbered patterns (each with height/width/color
  evidence). Patterns are layers ON TOP of the ROI (second/top layers),
  movable/resizable/rotatable like Photoshop shapes, with a layers panel and
  right-click send-back/send-forward.
- **Pin1 vs shapes:** ROI itself is NOT rectangle/circle/square — the PATTERN
  searched inside the ROI can be rectangle, circle, etc. Pin1 configuration
  must show the tool types (rectangle, circle, ...).
- **Grayscale:** grayscale changes BITS, not just display colors — dark gets
  darker, white gets whiter, reducing toward black/white so text/shapes stand
  out. Grayscale tolerance must be drivable from the CLI.
- **Simulation:** multiple simulations addable (recording or user-added); the
  configured delay must be honored exactly (a 2s delay must not take longer).
- **Camera dropdown:** live source / live camera select + saving-camera
  dropdown bug (previously reported, not fixed).
- **Validation:** save/create/click flows must validate so the user never
  reaches the error in the first place; random testing (create/save/click)
  must surface errors through the CLI.
- **Bug reporting:** record-a-bug exports via email (sender + notifier
  defaults) and Supabase (settings section; dummy/inbuilt settings later).
  Reference: Antigravity Manager / Antigravity Tools CLI-UI packet + Supabase
  logic — study first, recreate the pattern.
- **Assets reference:** assets folder, vision system pictures 11 August
  (vision inspection grid ROI-2, feature-extraction samples) — the old
  system's red ROI + auto-numbered pattern shapes inside it, modernized.

## 3. Execution Order (User-Directed)

1. Issue analysis + code analysis FIRST (this spec + research reports).
2. CLI-UI element registry (Id/name/XPath) + CLI click/drive — first defense.
3. Window controls + error capture/SplitDB (foundation).
4. ROI lock + patterns-as-layers + layers panel + Pin1 tools + grayscale bits.
5. Hover glitch + simulation timing + camera dropdown.
6. Email + Supabase bug reporting.
7. End-to-end tests (100–200 cases) via CLI; build fix at the end of the
   tunnel; CI green by morning.

## 4. Evidence Links (Screenshots, User-Supplied)

UPDATE 31-Oct-25 ~02:10: the other agents DID extract all 12 screenshots.
They are committed in the repo at `assets/screenshots/` (filenames =
prnt.sc id + timestamp) and referenced by the parallel spec
`02-spec/21-app/04-vision-system-and-error-management-instructions/`
(11 md files, commits 1895dce7 + 6252e592). No prnt.sc download is
needed anymore; the "drop the images" note below is superseded.

- `assets/screenshots/pUuIGz0ih_ZZ_20261031_014730.png` (window controls
  visible in desktop shell while running pattern matching rules)
- `assets/screenshots/wL_7nmmUJQPh_20261031_014811.png`
- `assets/screenshots/wXoDp20hMNwJ_20261031_014811.png`
- `assets/screenshots/rzcoeqtbFB8l_20261031_014810.png`
- `assets/screenshots/9qwZWqYiKV95_20261031_014810.png`
- `assets/screenshots/Os3MgbBIMHmT_20261031_014810.png` (titlebar window
  controls inoperable in desktop application mode)
- `assets/screenshots/_lKsg1rvFRnI_20261031_014810.png`
- Glitch menu: `assets/screenshots/RJPTx3RB8gDf_20261031_014810.png`
  (MENU dropdown open over dashboard; Navigation + System & Logs +
  Exit Application)
- `assets/screenshots/j21Xbgbsy6bB_20261031_014811.png`
- Pattern search point: `assets/screenshots/JA4FdRFDSKi2_20261031_014811.png`
  (OLD ICOS Inspection System 7.7c: red ROI rectangle on a chip image,
  dozens of numbered blue pattern boxes inside it — the reference model)
- `assets/screenshots/mr6_-1EdpFtG_20261031_014811.png` (CURRENT Pin 1
  Orientation Config: ROI 100/59/307x279, REGION SHAPE buttons, Luminance
  Threshold 188, Position Tolerance 12px, Expected Hole Diameter 24px,
  TEST THIS RULE; error toast "Failed to save recipe: no such table:
  Recipe"; warning "Res Mismatch: 392x273 (Calibrated: 960x540)")
- Dropdown: `assets/screenshots/bg2jMNWxHjkn_20261031_014810.png`
  (SOURCE: Live Camera selected, canvas black with "CONNECTING CAMERA"
  — camera stuck connecting)

Original prnt.sc URLs (for reference): pUuIGz0ih_ZZ, wL_7nmmUJQPh,
wXoDp20hMNwJ, rzcoeqtbFB8l, 9qwZWqYiKV95, Os3MgbBIMHmT, _lKsg1rvFRnI,
RJPTx3RB8gDf, j21Xbgbsy6bB, JA4FdRFDSKi2, mr6_-1EdpFtG, bg2jMNWxHjkn
(all under https://prnt.sc/).

## 5. MBUD — Matters to Be Discussed in the Morning (Ambiguities)

1. Screenshot contents — RESOLVED 31-Oct-25 ~02:10: all 12 images
   extracted by parallel agents to `assets/screenshots/` and 4 key images
   visually confirmed (see section 12). Remaining: confirm the other 8
   images against their spec 04 descriptions in the morning.
2. ROI lock interaction: double-click to unlock — confirm the exact gesture
   (double-click vs long-press vs lock toggle).
3. Pattern numbering scheme: confirm numbering restarts per ROI or is global.
4. Supabase dummy/inbuilt settings: credentials to be supplied later; plan
   uses a settings section with placeholders, no secrets committed.
5. Email sender/notifier defaults: addresses to be supplied later; plan
   uses configurable defaults, no secrets committed.
6. Grayscale "bits" semantics: confirm whether the threshold output is a
   1-bit mask or a contrast-stretched preview (implementation will expose
   both and let the morning call decide).
7. Which simulation delay paths overshoot (timer stacking vs render block)
   — pending research report.
8. Native shell decision (spec 54 window controls): true minimize and
   true window-close are impossible from a browser --app window — JS
   cannot minimize a window and cannot close a script-unopened window.
   The implemented behavior is honest browser behavior (fullscreen
   toggle for maximize, toast guidance for minimize, /shutdown +
   launcher teardown for Exit). If the product must have real minimize
   and real close, the morning decision is whether to adopt a native
   shell (Tauri/Electron) that provides a real window.desktopApi bridge.
   That is an architecture decision, not a bug fix, and is NOT started
   in this workstream.
9. Frontend error-code registry alignment (spec 54 error work): the
   swallowing-fix wave introduced frontend codes (E_PIN1_LOAD_TARGET,
   E_PATTERN_MATCH_LOAD, E_WHITEBOX_LOAD_IMAGE, E_WHITEBOX_PRUNE_DUPLICATE,
   E_WORKBENCH_LOAD_IMAGE, E_WORKBENCH_LOAD_FILE, E_WORKPIECE_CACHE_PIXELS,
   plus JSON.parse codes) recorded as-is by buildCapturedError; they are
   not yet in any backend code registry. Morning call: align them into
   the backend registry or accept frontend-only codes.
10. Stack truncation (spec 54 error work): AC-01 caps stacks at 40
    frames, but the error SplitDB stores full stacks for step-by-step AI
    fixing. Morning call: keep full stacks, or truncate at write/read
    time per AC-01.

## 6. Guardrails

- Pull before every commit; merge on conflict (never force-push).
- Commit after every plan and after significant code; nothing pending >10 min.
- Micro-batches of 5–8 files; heatmap logging for shared files.
- Relative git paths only, everywhere including release notes.
- No repo deletion; no destructive git commands; no disabling CI/CD.
- One single commit per completed task, hyphen format, pushed immediately.
- No builds until the task is done; build fix at the end of the tunnel.

## 7. Analysis Findings (Research Wave 1 — Pin1/Grayscale/Pattern/ROI/Layers)

Verified read-only against main. All paths relative.

### Pin1 tools missing — CONFIRMED

- Pin1 UI: `src/components/vision/standard/tools/pin1-config/` — region
  edit modes are only `search | package | pin`; no shape picker anywhere.
- Shape is hardcoded: `usePin1Rule.ts:366` writes `shape: "rectangle"`.
- Domain supports shapes (`src/domain/vision/shapes.ts`: Rectangle | Circle
  | Ellipse | Polygon | None) but no UI changes them; canvas geometry
  (`SearchRegion = {x, y, width, height}`) cannot represent circle/ellipse.
- Fix targets: `Pin1SettingsCard.tsx` (picker), `Pin1Canvas.tsx` +
  `pattern-geometry.ts` (circle/ellipse draw + hit-test), `usePin1Rule.ts`
  (stop hardcoding), `white-box/types.ts` + `white-box-marking.ts`
  (extend SearchRegion with shape/radius/rotation).

### Grayscale is threshold-whiten only — CONFIRMED

- `toThresholdPreviewRgba` whitens pixels >= threshold, never darkens.
- `toTwoBitGray` is 4 levels only (0/85/170/255). No contrast stretch,
  no true 1-bit black/white mode.
- Fix targets: `white-box-marking.ts` (contrast stretch + 1-bit mode),
  `GreyscaleSliderCard.tsx` (mode control), `useWhiteBoxMarking.ts` (wire).

### ROI lock + layers absent — CONFIRMED

- Numbered patterns + remove/keep exist (`BoxReviewCard.tsx`,
  `PatternCanvas.tsx` with `excludedNumbers`).
- No lock state, no double-click-to-unlock, no rotation handle. Clicking
  outside the ROI starts a NEW region replacing the old one — this is the
  likely root cause of "click another place, it just goes from one place
  to another".
- Draw order fixed; no context menu, no send-back/bring-forward anywhere
  in `src/components/vision/`.
- Layers panel exists ONLY in the editor (`src/components/editor/layers/
  LayersPanel.tsx`), never imported by any vision marking tool.
- Fix targets: `useCanvasPointerDrag.ts` + `pattern-geometry.ts`
  (selection vs creation, lock flag, rotate), `PatternCanvas.tsx` (layer
  list + draw order + context menu), `white-box/types.ts` (isLocked,
  zOrder), new `vision/white-box/LayersPanel.tsx`.

### Aug 11 assets — PRESENT

`assets/vision-system-pictures-11Aug/` holds the cited references
(`vision-inspection-grid-roi-2.jpg`, `ui-feature-extraction-conditions.jpg`,
`ui-inspection-region-rectangle*.jpg`, etc.). Unreferenced by code; usable
as spec evidence for the ROI-then-numbered-pattern flow.

## 8. Analysis Findings (Research Wave 1 — Window Controls)

Verified read-only against main. All paths relative.

### The app is NOT Tauri/Electron — ROOT CAUSE FOUND

- The "desktop app" is a web SPA (React + TanStack Router, bun on :3000,
  Python backend on :8787) launched by `packaging/desktop/start.ps1` /
  `start.sh` inside the user's Edge/Chrome with `--app=<url>
  --start-fullscreen`. No script injects anything into the page.
- `src/components/layout/WindowControlButtons.tsx` is the only
  window-control component (Minimize / Maximize / Close + "Exit
  Application?" confirm dialog), mounted at `StandardAppShell.tsx:502`.
- All three handlers read `window.desktopApi` — which is NEVER provided
  anywhere: zero assignments, zero preload scripts, zero server injection.
  `git log -S "desktopApi"` shows one commit (d25a24a1, 2026-10-30) that
  introduced the consumers only. The provider was never written.
- Yet `src/lib/version-info.ts:21` claims "Native window controls" as
  shipped, and the spec `02-spec/21-app/03-app-bug-fixes-and-ui-
  enhancements/02-ui-shell-and-window-controls-spec.md` promises desktop
  minimize + clean exit. The promise was never wired to a real shell.

### Per-button behavior (follows exactly from the missing bridge)

1. **Minimize does nothing** — falls through to dispatching
   `cat-vision:window-minimize`, and no listener for that event exists.
2. **Maximize does nothing useful** — falls through to
   `requestFullscreen()`/`exitFullscreen()`, fighting the
   `--start-fullscreen` launch flag.
3. **Close "crashes"** — `window.close()` is a browser-security no-op for
   script-unopened windows, so it falls through to
   `window.location.href = "/"`: a hard full-page reload that tears down
   live camera streams, WebSockets, and in-flight IndexedDB writes. Then,
   closing the browser natively orphans `backend-server.exe` and bun
   (no Wait-Process, no /shutdown endpoint), so the next launch collides
   on ports 8787/3000 — a second, delayed crash after every "close".

### Fix targets

- `packaging/desktop/start.ps1` + `start.sh` — real window-control bridge
  (native shell injecting `window.desktopApi`, or replace the `--app`
  launch); browser-process wait + backend teardown.
- `WindowControlButtons.tsx` — real handlers against the bridge (or
  honest browser fallbacks + backend shutdown call).
- `StandardAppShell.tsx:431-447` — deduplicate the Exit menu item with
  the button logic.
- `BE/main.py` (or new route module) — `/shutdown` endpoint.
- `src/lib/version-info.ts` — correct the "Native window controls" claim
  until the bridge exists.

### Runtime confirmation (morning, user's machine)

Check Task Manager after an in-app "Exit" for orphaned
`backend-server.exe`/`bun.exe`, and check `<install>/startup-error.log`
on the next launch for a port-bind failure.

## 9. Analysis Findings (Research Wave 1 — Hover / Simulation / Camera)

Verified read-only against main. All paths relative.

### Menu hover glitch — ROOT CAUSE FOUND

- `src/components/ui-mode/UiModeSwitch.tsx`: the switch wrapper is
  `group flex items-center gap-1 group-hover:gap-2 transition-all`, and
  both labels are `max-w-0 opacity-0 group-hover:max-w-[70px]
  group-hover:opacity-100 transition-all duration-200`. Hovering grows
  the switch by up to ~140px plus a gap change, pushing neighboring
  header buttons sideways; if the cursor crosses into a neighbor
  mid-transition, hover flickers and the bar oscillates — exactly the
  "goes from one place to another" symptom.
- It sits at `StandardAppShell.tsx:470` beside RecorderLauncherButton,
  Simulation launcher, and ThemeToggle, in a cluster with nowhere to go
  but sideways (`overflow-hidden` can clip).
- Introduced by commit dece3598 (19-Oct-26 navbar tweaks) — AFTER the
  prior session's menu-hover verification. The prior fix is present (the
  duplicate titlebar nav is gone; `ModernMainNav.tsx` no longer exists)
  but does not cover this newer hover-expand behavior.
- Secondary: the Simulation button label swaps (Simulation / Simulation
  Running / spinner) on state change, shifting neighbors.
- Fix targets: `UiModeSwitch.tsx` (reserve fixed label width or
  opacity-only reveal, no width/gap animation); optionally
  `StandardAppShell.tsx` (fixed-width Simulation button label).

### Simulation delay overshoot + Next-button jump — ROOT CAUSE FOUND

- `src/components/guided-simulation/ProjectCreationAnalysisTour.tsx`:
  `beginStep` polls for the tour target every 150ms with a 2s safety
  fallback BEFORE the countdown starts; scroll-into-view also runs
  first. Worst case ~2s of waiting before the 2s dwell even begins.
- The countdown is `setInterval(..., 100)` adding a fixed 100ms per
  tick — when the main thread is busy or the tab throttles, real ticks
  arrive late but still count as 100ms, so wall-clock time stretches.
- `advance()` adds a further 700ms `setTimeout` transition on
  exit-phase steps; each step's `runStepAction` navigates/opens panels
  before the next timer starts. A "2s" step easily takes 3–5s.
- Next-button jump: the Joyride tooltip is floater-positioned against
  the spotlighted target; `runStepAction` moves targets, the floater
  re-calculates and flips placement (bottom→top). Prior commit 261ce5d2
  only fixed overlay clicks, not repositioning. `tour-placement.ts`
  confirms flipping stays enabled for most targets.
- Fix targets: `ProjectCreationAnalysisTour.tsx` (wall-clock countdown
  via `Date.now()` delta; start dwell immediately or fold target-wait
  into it; remove/merge the 700ms exit transition);
  `tour-placement.ts` + Joyride options (disable flipping or pin
  placement); `SimulationPlayerBar.tsx` only if the player-bar Next
  button itself is the reported one (buttons use `transition-all` +
  `active:scale-95`, bar re-renders 10x/second on elapsed ticks).

### Camera dropdown / save-camera — ROOT CAUSE FOUND

- Each `useCameraLibrary()` call creates its own facade + store
  instance with its own cached snapshot; stores never sync across
  instances. After "Save current as new", the parent dropdown's option
  list is stale: the newly saved camera is missing, the bound select
  renders blank, and the "missing from the library" warning appears.
- Evidence: `src/lib/camera/useCameraLibrary.ts` (new instance per hook
  call); `src/lib/camera/facade.ts` (per-instance store/listeners, no
  `storage` event listener anywhere); `src/lib/camera/store.ts`
  (per-instance snapshot; nothing calls `reload()` on external changes).
- `ProjectCameraSection.tsx`: parent dropdown
  (`id="project-camera-select"`) uses instance A; `onSaved` binds the
  new id, but with `all` stale, `selectedId` matches no option → blank
  select + "Bound camera setting id … is missing from the library".
- Secondary bug: `SaveCameraSetupModal.tsx` reset `useEffect` depends on
  `[open, currentSettingId, all]`, so any `all` change while the modal
  is open resets the user's source-select choice.
- Ruled out: the Live Camera toggle itself is wired
  (`WorkpieceAnalyzeWorkspace.tsx:324,330`); the pain is dropdown
  staleness, not the toggle.
- Fix targets: `useCameraLibrary.ts` (share one module-level facade) or
  `facade.ts` + `store.ts` (listen to `storage` events / call
  `reload()`); `SaveCameraSetupModal.tsx` (reset effect depends on
  `open` only).

### Cross-cutting note

Glitch 1 (Oct 19 navbar tweak) postdates the last verified menu fix,
and glitch 3 is a state-sync design flaw, not a race — both are cheap,
isolated fixes. Glitch 2's timing overshoot is structural and must be
fixed before any dwell tuning, since tuning the value cannot compensate
for the added waits.

## 10. Analysis Findings (Research Wave 1 — Error Management)

Verified read-only against main. All paths relative.

### Spec contract (02-spec/03-error-manage/)

- Zero swallowed errors (TOTAL BAN): no empty catch, no blank-identifier
  discards, no fallback defaults masking an error. Every caught error
  must be resolved with structured context logging OR wrapped and
  returned.
- Typed `AppError` (code + message + details + cause); universal
  response envelope `{ Status, Attributes, Results, Errors }`.
- Three-tier flow: delegated server → backend → frontend error store +
  Global Error Modal + toasts; HTTP status as primary indicator.
- AC-01: error responses contain numeric `Code` in registry range,
  `Message`, `Details`, `Stack` (up to 40 frames); unregistered codes
  fall back to a generic in-range code + warning log; sensitive values
  redacted.
- AC-02: modal shows backend code + triggering component + timestamp;
  "Copy All" copies frontend + backend context; codeless backend errors
  get synthetic code `GEN-1000` + parsing warning.

### What already exists (spec-aligned)

- `BE/errors/apperror.py` (`AppError` + `ErrorCode`),
  `BE/errors/handlers.py`, `BE/errors/codes.py`; CLI dispatcher
  (`BE/cli/common/dispatcher.py`) maps `AppError` → envelope + exit code.
- Envelope: `src/lib/backend/envelope.ts` (zod), `BE/envelope.py`.
- Frontend model: `src/types/errors.ts` (`CapturedError`: id, 8-char
  `correlationId`, code, level, message, `stackTrace`, `parsedFrames`,
  endpoint/method/status, trigger component/action, `invocationChain`,
  `backendLogs`, `backendStackTrace`, `sessionId`, `uiClickPath`,
  `executionLogs`, envelope fields).
- Store: `src/lib/stores/errorStore.ts` (Zustand, bounded FIFO,
  `MAX_HISTORY = 50`, every mutation logged via `ClientLogger`).
- Global capture: `src/lib/errors/globalCapture.ts` (single-mount
  `window.error` + `unhandledrejection` → store + error-bus).
- UI: `GlobalErrorModal.tsx`, `ErrorHistoryDrawer.tsx`,
  `ErrorQueueBadge.tsx`, `EnvelopeErrorBoundary.tsx`.
- Backend-failure capture: `src/lib/be-fetch.ts` (every
  `EnvelopeError` captured unless `suppressCapture`).
- Export: `src/lib/errors/export.ts` (JSON/CSV incl. stackTrace,
  correlationId) — browser-download only.

### ERROR SWALLOWING — CONFIRMED (spec violation)

Literal `catch { // Ignored }` / `.catch(() => { // Ignored })`:

- `src/components/vision/standard/tools/pin1-config/usePin1Rule.ts:344`
  — Pin 1 detection failures vanish.
- `src/components/vision/standard/tools/pattern-matching/
  usePatternMatchingRule.ts:220` — match failures vanish.
- `src/components/vision/white-box/useWhiteBoxMarking.ts:188` — image
  load + initial `processRegion` failures vanish; `:567` — duplicate
  cleanup delete failures vanish.
- `src/components/vision/standard/workbench/useStandardWorkbench.ts:89`
  — image-load failure vanishes; `:142` — FileReader upload failure
  vanishes.
- `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx:1062`
  — pixel-cache loader failures vanish.
- `src/components/layout/WindowControlButtons.tsx:50` — close fallback
  catch, then unconditional redirect to `/`; `:33`/`:36` — fullscreen
  promise catches.
- `src/lib/errors/history-facade.ts` — load/save/clear failures only
  logged, never captured into the store.
- Benign but policy-violating: `VisualToolTuningModal.tsx:41,51` and
  `workpiece-rule-analyzer.ts:291,319,339,355` — `JSON.parse` failures
  swallowed with no log line.

### Error database: DOES NOT EXIST (largest gap)

- SplitDB pattern exists (`02-spec/05-split-db-architecture/`, SQLite,
  WAL; `BE/db/migrations/root/` 4 migrations, `BE/db/migrations/task/`
  9 migrations, tables incl. `CliInvocation`, `CaptureSession`,
  `Recipe`, `Result`, `RunSession`, `RuleResult`).
- No error table in any migration, no error writer, no error DB.
  Frontend history lives only in browser storage (IndexedDB key
  `lovable:error-history:v1`, bounded 50-entry FIFO) with a comment
  that "the eventual backend swap only touches this file" — the swap
  never happened. Errors die with the browser profile.

### CLI / AI access: MISSING

- Backend CLI exists (`BE/cli/`: batch, dry_run, evaluate, status,
  verify_bundle, watch, doctor, heartbeat, log_reader). No `errors`
  command.
- No channel from frontend errors to the backend at all: no
  `POST /api/errors` (0 hits), and `log_reader.py` reads only backend
  JSONL session logs. Frontend `CapturedError`s never leave the browser.
- Email: 0 hits for smtp/sendmail/send_email/mailto in `src`/`BE`.
- Supabase: 0 hits in `src`/`BE`.
- AC-02 gap: synthetic code `GEN-1000`: 0 hits in `src` — not
  implemented. AC-01 nuance: `buildCapturedError` stores `err.stack`
  whole; no 40-frame truncation observed.

### Fix targets

- **Stop swallowing** (route to the store): the 9 files listed above.
- **Error DB (SplitDB):** new migration (e.g. `task/0029_task_errors.sql`,
  PascalCase columns: `Id`, `CorrelationId`, `Code`, `Level`, `Message`,
  `StackTrace`, `Endpoint`, `TriggerComponent`, `SessionId`, `CreatedAt`,
  `Details` JSON); writer mirroring `rule_result.py` / `run_session.py`;
  ingest route for frontend `CapturedError` payloads; backend-sync path
  in `history-facade.ts`.
- **CLI + AI access:** new `BE/cli/` command (`errors list` /
  `errors show <correlationId>`, `errors export` headless JSON/CSV).
- **Email + Supabase:** greenfield modules, not fixes.
- **Window buttons:** confirmed independently — provider missing (see
  section 8); cannot be fixed in `WindowControlButtons.tsx` alone.

## 11. Analysis Findings (Research Wave 1 — AGM CLI-UI + Supabase Reference)

Verified read-only against Antigravity-Manager main. All paths relative
to that repo.

### CLI-to-UI: the chain to copy (not the registry)

- AGM never screen-scrapes its own UI: CLI and Tauri app share one Rust
  library; the CLI drives the UI through two channels — a SQLite work
  queue the app polls, and an authenticated local HTTP API that emits
  Tauri events the React frontend listens for and executes through the
  SAME code path as a real user click.
- `agm ui open | goto <route> | ls [route] | scroll <element-id>
  [route] | click <element-id> [route]`
  (`src-tauri/src/bin/agm/ui_cmds.rs`).
- **Addressing is by element `id` ONLY — no XPath anywhere in AGM.**
  The CLI validates the id against a STATIC per-route element manifest
  (`UiRoute { path, page, components, known_ids, focusable }`); it
  refuses unknown or ambiguous ids unless the route is given.
  `agm ui ls <route>` prints the manifest; `GET /api/ui/element-tree?
  route=<route>` serves it (`src-tauri/src/proxy/server/admin_ui.rs`).
  It is explicitly a static manifest, NOT a live DOM snapshot.
- Frontend resolution fallback chain (`src/hooks/useUiRemoteControl.ts`):
  `getElementById(id)` → `[data-ui-id]` → `[data-ui-name]` →
  `[data-testid]` → `[title]` → `el.click()` / `scrollIntoView + focus`.
  Missing elements become tracked warnings, never silent failures.
- Transport: CLI → daemon over HTTP `127.0.0.1:8045`
  (`src-tauri/src/modules/cli/daemon.rs`), `Authorization: Bearer
  <token>` + `x-api-key` (token from env or app config), 5s timeout.
  Click packet: `POST /api/ui/click { "route", "element_id", "actor":
  "cli" }`. Backend validates, emits Tauri event (`agm://ui-click` /
  `agm://ui-scroll` / `agm://ui-navigate`), records an audit entry
  (`actor=cli`, `trigger`, `element_id`, `route` → `ui_audit.db`), and
  returns `{success, element_id, route, actor}`. Every failure prints
  the real message to stderr with a non-zero exit ("No Silent Errors");
  a missing bridge endpoint is reported as `performed: false`, never
  faked.
- CLI envelope (`CliEnvelope`): `{ success, status, command,
  instance_id, timestamp, data, error, meta }`; errors carry
  `{ code: "DISPATCH_FAILED", message }`.
- Second channel (prompt queue → CDP drive): `agm prompts send|enqueue`
  writes SQLite `active_prompts` (addressed by instance_id + repo_path);
  a scheduler (5s tick when queued, 30s idle backoff) dispatches to idle
  projects FIFO; delivery into the IDE uses CDP (launch with
  `--remote-debugging-port=0`, discover port from `DevToolsActivePort`,
  WebSocket: focus input → `Input.insertText` → click send via
  aria-label selector list, Enter-keydown fallback).
- **Gap vs cat-my-v12's ask:** AGM has no id + display-name + XPath
  triple and no live element-tree endpoint. Cat-my must build what AGM
  only planned: a per-screen element registry (id, visible name, XPath)
  populated from real page sources, a live-DOM endpoint, and the same
  CLI → HTTP → frontend-event → `el.click()` chain. Copy the CHAIN,
  not the registry.

### Supabase pattern (plain PostgREST, no SDK)

- Client (`src-tauri/src/modules/supabase_client/client.rs`): headers
  `apikey` + `Authorization: Bearer <key>`, 15s timeout, URL normalized
  (redundant `/rest/v1` paths and trailing slashes stripped).
  `select` / `insert` / `upsert` over `{base}/rest/v1/{table}`; stored
  functions over `{base}/rest/v1/rpc/{fn}`. Transport errors classified
  into user-facing text (timeout/connect → "project may be paused
  (free-tier)" hints, explicitly NOT blamed on the API key) and counted
  toward a circuit breaker.
- Credentials: plain JSON `supabase_config.json` in the app data dir
  (mirrored to `%APPDATA%/antigravity-manager/` on Windows; NO
  encryption). Shape: `{ endpoints: [{ id, name, url, api_key, role:
  "root|secondary", is_enabled, prune_threshold_mb, priority, notes,
  tags }], node_alias, is_sync_enabled, auto_prune_*, heartbeat_interval_secs:
  300 }`. Loading also accepts the same config wrapped in a
  `JsonEnvelope`; `agm supabase status` can auto-seed endpoints from
  repo-secrets files.
- Frontend service (`src/services/supabaseService.ts`): thin Tauri-invoke
  wrapper (get/save config, test endpoint, check tables, migrate data,
  schema-SQL copy, export/import config, account leases, fleet
  machines, sync now). Settings UI (`src/components/settings/
  SupabaseSync/`, routes `/supabase` and `settings/supabase`): URL entry
  with sanitization, endpoint test, table verification, schema-SQL
  copy, data migration between endpoints.
- Two-role schema (`supabase_schema.rs`, shipped as SQL constants the
  user runs in the dashboard, RLS anon/authenticated full-access):
  Root DB — `nodes`, `instance_profiles`, `workspace_leases` + RPC
  `acquire_workspace_lease` (atomic, 90s TTL default); Secondary DB —
  `command_queue`, `command_telemetry`, `endpoint_health` + RPC
  `claim_next_command` (atomically claims oldest pending command).
- Sync loop (`fleet.rs`, `sync.rs`): 60s startup quiet period, 300s
  loop, skipped while circuit breaker open or sync disabled; per
  enabled root endpoint sends heartbeat (upsert `nodes` row + sync
  `instance_profiles`).
- **Recreation sketch for cat-my bug reports:** one `bug_reports` table
  (id, node/machine id, title, stack trace, status, created_at) + one
  `bug_attachments` or storage-bucket reference; a
  `supabase_config.json`-style settings file (URL + key, role, enabled
  flag); a PostgREST client with the same header scheme; an upload path
  (insert report → upload attachments) and a download path (select
  pending reports → developer CLI pulls them); heartbeat/lease
  equivalent NOT needed for bug reports.
- Adjacent (not deep-dived, for the error-DB workstream): AGM's
  `src-tauri/src/modules/error_db/` (db.rs, ops.rs, diagnostics.rs,
  types.rs), `src-tauri/src/modules/audit/` (UI audit trail),
  `src/services/emailService.ts` (notifier email).

## 12. Screenshot Evidence — Visually Confirmed (31-Oct-25 ~02:10)

All 12 extracted PNGs verified: valid, non-empty, committed at
`assets/screenshots/`. Four key images opened and confirmed by eye:

### Old system = the user's model, exactly (JA4FdRFDSKi2)

ICOS Inspection System 7.7c: a RED ROI rectangle on a chip image, and
inside it dozens of numbered blue pattern boxes (01, 02, 03...) — the
ROI-then-numbered-pattern-search flow the user described. Left tree
shows Setup / Calibrate / Component / Pin 1 / Data Matrix / Mark /
Scratch / BGA / QFN. This is the reference the new system must recreate
in modern form.

### Current Pin 1 screen (mr6_-1EdpFtG) — two new findings

- The three shape buttons DO exist in the current UI — but as REGION
  SHAPE under REGION OF INTEREST (ROI): RECTANGLE / SQUARE / CIRCLE.
  This refines the user's complaint: the picker is attached to the
  WRONG object. Per the user's model the ROI stays a plain region and
  the PATTERN takes the shape. Fix = move shape selection from ROI to
  pattern search, not "add missing buttons".
- Visible error toast: "Failed to save recipe: no such table: Recipe"
  — a concrete SAVE failure (missing Recipe table bootstrap) that the
  error-SplitDB work must capture; plus a "Res Mismatch: 392x273
  (Calibrated: 960x540)" warning. Both belong in the validation/error
  workstream.

### Glitch menu (RJPTx3RB8gDf) — reconciliation note

The MENU dropdown (Navigation: Home ACTIVE, Projects, Analyzer, Setup,
Rules, Test, Run, Settings; System & Logs; Exit Application) overlays
the dashboard cards. The parallel spec 04 attributes hover shift to a
1-2px border change on menu items; spec 54 section 9 attributes header
jumps to the UiModeSwitch hover-expand (~140px). These are DIFFERENT
surfaces (dropdown items vs header bar) — both fixes are needed, not
either/or.

### Camera dropdown (bg2jMNWxHjkn) — reconciliation note

SOURCE shows "Live Camera" selected, but the canvas is black with
"CONNECTING CAMERA" — the camera is stuck connecting. Three distinct
dropdown-area defects now stand side by side: (a) camera never
connects (this screenshot), (b) Radix Portal clipping claimed in spec
04, (c) stale camera-facade instances / blank save-camera select
(spec 54 section 9). All three go into the camera workstream; they are
not competing explanations.

## 13. Wave 1 Completion — Window Controls (31-Oct-25 ~02:10)

Workstream COMPLETE, all changes on origin/main, spot-verified by the
coordinator (shutdown route present, old reload crash path gone, MBUD
item 8 present). Subtask 08 marked COMPLETE by the agent.

- `BE/routes/shutdown.py` (new) — `POST /shutdown`, loopback-only
  (403 otherwise), replies with the success envelope first, then
  SIGTERM-exits the backend on a 0.5s timer (graceful path via the
  existing SIGTERM handler, `os._exit(0)` fallback). Frontend bun
  server deliberately NOT stopped here — the launcher owns that.
- `BE/main.py` — shutdown router registered (2 lines).
- `WindowControlButtons.tsx` (rewritten) — honest browser behavior:
  minimize uses `desktopApi` if a future shell provides it, else a toast
  saying minimize is unavailable in browser mode; maximize =
  `desktopApi` or fullscreen toggle, rejections to the error store;
  close = confirm dialog → `POST /shutdown` (3s abort timeout) →
  `window.close()` attempt → guidance state ("close this browser
  window now, Alt+F4 — the launcher stops the remaining services").
  The old `window.location.href = "/"` reload crash path is GONE. Zero
  swallowed catches remain in this file.
- `StandardAppShell.tsx` — Exit menu item dispatches
  `cat-vision:request-exit`, opening the same confirm dialog; no
  duplicate exit logic. UiModeSwitch and Simulation button code
  untouched.
- `packaging/desktop/start.ps1` + `start.sh` — launcher supervises the
  stack: keeps the browser PID, waits on it, then POSTs `/shutdown`
  and stops backend + frontend. A 5s delegation guard skips teardown
  when the browser exits immediately (handed off to an already-running
  instance). Failed-start cleanup stops servers when the browser never
  launches. macOS `open` path unchanged (no PID; teardown via in-app
  Exit only).
- `src/lib/version-info.ts` — claim corrected to "Browser window
  controls (fullscreen toggle, guided app exit with backend shutdown)
  in titlebar".
- Commits: f293edea (shutdown endpoint), 65d248c0 (honest controls +
  single Exit path), acd654b4 (merge syncing parallel agents, clean),
  a74ec564 (launcher supervision), 63faee20 (claim + MBUD + subtask).
- NOT verified at runtime (per program order: no builds/tests until
  end of tunnel). Morning checklist: click each button in the installed
  app, confirm Exit stops the backend, ports 8787/3000 free, no
  orphaned `backend-server.exe`/`bun.exe` in Task Manager.
- Shared-checkout note: one push was initially rejected
  non-fast-forward (parallel agents landing between batches), resolved
  with a clean merge; the agent verified its version-info + MBUD edits
  landed intact via another agent's commit 8e86343b, and never staged
  anyone else's files.

## 14. Wave 1 Completion — Error Swallowing Fixes (31-Oct-25 ~02:11)

Workstream COMPLETE, both batches on origin/main, spot-verified by the
coordinator (0 "Ignored" hits across all 179 files in
src/components/vision/ and 0 in workpiece-rule-analyzer.ts).

- Batch 1 (e540d552, via merge acd654b4): direct
  `useErrorStore.captureError` in non-render paths, guarded by the
  existing `isCancelled` flag so unmount noise stays silent:
  usePin1Rule.ts loadTarget → E_PIN1_LOAD_TARGET; usePatternMatchingRule.ts
  match → E_PATTERN_MATCH_LOAD; useWhiteBoxMarking.ts image-load →
  E_WHITEBOX_LOAD_IMAGE and duplicate-prune → E_WHITEBOX_PRUNE_DUPLICATE
  (loop continues after capture); useStandardWorkbench.ts image-load →
  E_WORKBENCH_LOAD_IMAGE and file-load → E_WORKBENCH_LOAD_FILE (file name
  + size as context); VisualToolWorkpieceCanvas.tsx pixel-cache →
  E_WORKPIECE_CACHE_PIXELS. Every capture carries triggerComponent,
  triggerAction, and structured context per the spec 03-error-manage
  contract.
- Batch 2 (382067a2, HEAD at the time): JSON.parse catches, render-path
  safe — VisualToolTuningModal.tsx collects failures via an out-param
  from buildSettingsFromRule (runs inside useMemo) and captures in a
  useEffect (no store mutation mid-render; context = field + ruleId +
  payload length only, never raw content); workpiece-rule-analyzer.ts
  parseBoxesFromParams 4 fields captured via a queueMicrotask-deferred
  helper with a once-per-payload dedup Set (canvas must not flood the
  bounded 50-entry history). Fallback behavior preserved everywhere
  (box-list fallthrough order unchanged, no rethrows added).
- Not touched, as ordered: history-facade.ts and WindowControlButtons.tsx
  (other agents' files). No files deleted. Relative paths only.
- Flagged follow-ups (not silently skipped): VisualToolTuningModal.tsx
  `readSavedRegion` and workpiece-rule-analyzer.ts `parseStoredRegion`
  still return null on corrupt JSON without capture — out of assigned
  lines, left for a follow-up wave; new frontend error codes not yet in
  any backend registry — recorded as MBUD item 9.
- Parallel-work note: first pull --ff-only failed on divergence, merged
  cleanly (no force-push, no rebase/amend); sibling untracked files and
  uncommitted edits left alone.

## 15. Wave 1 Completion — Error SplitDB + CLI Readout (31-Oct-25 ~02:12)

Workstream COMPLETE, all 4 batches on origin/main, spot-verified by the
coordinator (all 4 files present, migration header matches spec).

- Batch 1 (9818a2b0): migration **0029** (next after 0028, as the spec
  suggested) — `BE/db/migrations/task/0029_task_errors.sql`, `Error`
  table, PascalCase columns (`ErrorId`, `CorrelationId`, `Code`,
  `Level`, `Message`, `StackTrace`, `Endpoint`, `TriggerComponent`,
  `SessionId`, `Details`, `CreatedAt`, `PersistedAt`), UNIQUE
  `CorrelationId` (retried ingests are idempotent skips, not
  duplicates), indexes on `CreatedAt`/`Code`, terminal `SchemaVersion`
  row. Follows the `BE/tests/db/test_conventions.py` scanner rules
  (BEGIN/COMMIT, `*At` INTEGER epoch, no cross-tier REFERENCES).
  Writer `BE/app/db/writers/error.py`: batch insert, idempotent by
  `CorrelationId`, validation → `E_BE_BAD_REQUEST`, DB failure →
  `E_BE_INTERNAL` with the `bin/db-bootstrap.py` hint; AC-01 Details
  redaction (password/token/secret/api-key/auth/bearer/credit/ssn/
  private-key, recursive); full stacks kept, no 40-frame truncation
  (MBUD item 10); `list_errors`/`get_error_by_correlation` readers
  shared by route + CLI so they cannot drift.
- Batch 2 (8e86343b): ingest route `BE/routes/errors.py` + router mount
  in `BE/main.py` — `POST /errors` (single object, array, or `{items:
  [...]}`; frontend `id` uuid not stored, `CorrelationId` is the
  identity), `GET /errors` (limit 1-200 default 50, code/level/session/
  correlation filters, newest first), `GET /errors/{correlationId}`
  (full stack trace, 404 otherwise). Diagnostic fields fold into
  `Details`; interaction traces stay in browser history.
- Batch 3 (cf2e99a0): CLI `BE/cli/processing/commands/errors.py` +
  registration + helptext — `processing-cli errors list` (filters, full
  stacks), `errors show <correlationId>`, `errors export --format
  json|csv` (shapes mirror the frontend serializers in
  `src/lib/errors/export.ts`; browser-only `id` column empty
  server-side). Two review catches fixed before commit: a
  query-param/request-correlation shadowing bug in `GET /errors`, and
  CSV export rewritten to the frontend column shape.
- Batch 4 (bb8ad615): facade `src/lib/errors/history-facade.ts` —
  `saveErrorHistory` now also syncs new entries to `POST /errors`,
  Backend mode only (resolved from the persisted backend-mode store;
  Seed mode skips by design, not by swallow). Load/save/clear/backend
  failures are reported into the error store as synthetic errors with a
  30s cooldown breaking the report loop; failures still logged every
  time. The import cycle with `errorStore` is documented in the file
  header.
- NOT verified at runtime (per program order: no builds/tests until end
  of tunnel; Python files syntax-checked only via `ast.parse`).
  End-of-tunnel wave must exercise: `bin/db-bootstrap.py` applying
  0029, `POST /errors` round-trip, `processing-cli errors list/show/
  export`, and facade sync in Backend mode (recorded in subtask 09).
- Email/Supabase bug-report path NOT built here — out of this
  workstream's file ownership (greenfield modules for a later wave).
- Shared-checkout note: sibling waves landed alongside without file
  collisions; pull-before-commit caught two stale reads (sibling's
  `shutdown_route` in `BE/main.py`, sibling's `ui` command in
  processing `main.py`) — re-read and merged rather than overwritten.

## 16. Wave 1 Completion — CLI-UI Element System (31-Oct-25 ~02:12)

Workstream COMPLETE, 3 commits on origin/main, spot-verified by the
coordinator (registry, CLI command, hook, TS mirror all present).

- Backend — the AGM chain adapted to this stack (browser --app SPA +
  Python backend on :8787, no Tauri bus, so the backend holds an
  in-memory packet queue the browser polls):
  `BE/ui_remote/registry.py` (single source of truth: 14 verified
  entries, each with Id + visible name + XPath — window controls, exit
  dialog, simulation player bar + dwell slider, greyscale slider,
  camera select, workpiece canvas + results regions; no ids invented);
  `BE/ui_remote/queue.py` (packet queue + JSONL audit trail outside the
  repo tree); `BE/routes/ui_remote.py` (`GET /elements`, `POST
  /packets`, `GET /pending`, `POST /results`, `GET /results/{id}`, `GET
  /audit`, all in the Universal Envelope with registered `E_*` codes);
  `BE/cli/processing/commands/ui_remote.py` (`processing-cli ui`).
- Frontend: `src/lib/ui-remote/registry.ts` (generated mirror, never
  hand-edited); `src/hooks/useUiRemoteControl.ts` (1-second poll; AGM
  fallback chain getElementById → [data-ui-id] → [data-ui-name] →
  [data-testid] → [title] → XPath; performs the action through the
  same code path as a user click — real `el.click()`, native value
  setter + input/change events for `set`; missing elements captured
  into the error store as tracked warnings, never silent; navigation
  via history `pushState` + `popstate`); `src/lib/ui-remote/README.md`
  (usage doc); `03-ai-scripts/generate-ui-remote-registry.py`
  (regenerates the TS mirror from Python).
- Wiring (minimal): `BE/main.py` (router mount),
  `BE/cli/processing/main.py` (`ui` registration),
  `StandardAppShell.tsx` (one import + one hook call).
- Commits: bddfd01d (backend), d9642ae7 (frontend), 354b1b30 (wiring);
  one push rejected mid-flight (sibling landed first), merged and
  re-pushed; sibling merge acd654b4 carried the backend batch.
- Usage: `processing-cli ui ls` (local manifest read, no backend
  needed); `processing-cli ui click ui-sim-next` (exit 0 = queued, NOT
  performed); `processing-cli ui click ui-sim-next --wait` (non-zero on
  failure/timeout); XPath clicks (targets starting with `/` or `(`);
  `processing-cli ui set ui-greyscale-level 170 --wait`;
  `processing-cli ui set ui-sim-dwell 2 --wait`;
  `processing-cli ui audit --limit 20`.
- NOT built (with reason): vision marking screen buttons
  (WhiteBoxMarkingTool, Pin1Canvas, Pin1SettingsCard, PatternCanvas)
  carry zero `data-testid` / `aria-label` / `id` attributes, so there
  is nothing real to register — ids refused to be invented. The vision
  workstream (wave 2) must add `data-ui-id` attributes; the registry is
  extendable (one entry in `BE/ui_remote/registry.py` + rerun the
  generator). Route scoping is `["*"]` for v1 (ids unique app-wide);
  tighten per-screen once vision screens gain ids. Greyscale slider
  XPath is structural (input has no id); a `data-ui-id` on
  `GreyscaleSliderCard` would make it robust. No end-to-end click was
  executed against a running app — first live `ui click --wait` run is
  owed to the end-of-tunnel window.
- Wave 1 is now fully complete: window controls + swallowing fixes +
  error SplitDB/CLI + CLI-UI registry, all on origin/main.

## 17. Wave 2 Completion — Email + Supabase Bug Reporting (31-Oct-25 ~02:19)

Workstream COMPLETE, 3 batches on origin/main. Greenfield: email and
Supabase had 0 hits in src/BE before this work.

- Batch 1: `BE/bug_reports/` core — `config.py` (resolution: explicit
  > env > repo-secrets non-secret fields; Supabase settings file 0600
  in app-data), `supabase_client.py` (stdlib PostgREST, AGM header
  scheme, 15s timeout, URL normalization, classified errors, circuit
  breaker), `schema.sql` (bug_reports + bug_attachments),
  `email_sender.py` (delegates to the go-email-reader binary; never
  touches passwords).
- Batch 2: `BE/bug_reports/reports.py` (compose from Task-DB Error row
  + email/Supabase delivery + tempdir JSONL audit),
  `BE/routes/bug_reports.py` (loopback-only: POST /bug-reports,
  GET /pending, GET/POST /config sanitized with blank-key-keeps-stored,
  POST /test reachability + table verification),
  `BE/cli/processing/commands/bug_reports.py` (`processing-cli
  bug-reports pending/download/send`), wiring in `BE/main.py`,
  `BE/cli/processing/main.py`, `BE/errors/codes.py`
  (E_BUG_EMAIL_FAILED, E_BUG_SUPABASE_FAILED).
- Batch 3: frontend `src/components/settings/BugReportingSettings.tsx`
  (Supabase URL/key/role/enabled + test + email readiness + send-test),
  `src/routes/settings/bug-reporting.tsx` (new route),
  `src/components/settings/SettingsSidenav.tsx` (one nav entry),
  `BE/bug_reports/README.md` (flow + setup + honest caveats),
  subtask 14 marked COMPLETE.
- Deliberate limits (not silently skipped): HTTP route never accepts
  local attachment paths (bytes via CLI --attach + best-effort Storage
  upload, else reference rows); Supabase key stored reversibly (0600),
  same as AGM, stated in UI + README, never in git, never returned by
  GET /config; RLS permissive policies commented out on purpose;
  `openapi.snapshot.json` not regenerated (needs a running app);
  RECORD BUG button wiring to POST /bug-reports NOT done (recorder
  components outside this workstream's ownership — route + CLI ready
  for that follow-up).
- NOT verified at runtime (per program order: no builds/tests until
  end of tunnel; Python files syntax-checked only via `ast.parse`).
  End-of-tunnel wave must exercise: POST /bug-reports round-trip
  (email + Supabase), pending/download/send CLI runs, settings UI
  save/test/send-test flow, schema.sql applied + tables verified,
  snapshot regen.

## 18. Wave 2 Completion — Recipe SAVE Self-Healing DDL (31-Oct-25 ~02:17)

Workstream COMPLETE, commit on origin/main, spot-verified by the
coordinator (commit stat shows only the agent's 2 files;
`_ensure_recipe_table` present in the repo file).

- Screenshot confirmed by eye: `assets/screenshots/
  mr6_-1EdpFtG_20261031_014811.png` — SAVE clicked, red toast
  "Failed to save recipe: no such table: Recipe".
- Root cause: `BE/db/connections.py` opens connections only and never
  runs DDL (its own docstring says migration is `bin/db-bootstrap.py`'s
  job); `sqlite3.connect()` silently creates an empty `root.db` on
  first open. `SqliteRulesRepo` (PUT /rules/{RuleSetId} SAVE path)
  trusted the schema; its first statement (`SELECT Version FROM Recipe
  WHERE RuleSetId = ?`) raised `sqlite3.OperationalError: no such
  table: Recipe` on any unmigrated data dir (fresh install, skipped/
  failed bootstrap, backend run directly, test env). The generic
  `except Exception` wrapped it as `AppError(E_BE_INTERNAL, "Failed to
  save recipe: ...")` → frontend toast. The migration itself exists
  (`BE/db/migrations/root/0020_recipes.sql`) — nothing on the repo
  path ensured it was applied. Matches parallel spec 04 §3 exactly.
- Fix (commit b066e6ad, `BE/repos/sqlite_rules_repo.py` +146/-6, spec
  04 §3.2 "Recipe self-healing DDL"): `_ensure_recipe_table(conn)`
  probes `sqlite_master` for `Recipe` (one cheap query when it
  exists); if missing, runs DDL mirroring `0020_recipes.sql` exactly
  (table + `IdxRecipe_RuleSetId`, no `SchemaVersion` write — bootstrap
  still owns that bookkeeping, and a later bootstrap re-applying 0020
  is a no-op). Called in `__init__` (guarded: the repo is a
  module-level singleton, so an import-time raise would take down the
  whole backend — failure is logged and the per-call ensure retries)
  and at the start of `save_rule_set` + `get_rule_set`, so SAVE can
  never hit "no such table" again even if the DB file is replaced
  mid-process.
- Failure persistence (wave-1 readout, no swallow): every failure on
  both paths is best-effort persisted via
  `BE/app/db/writers/error.py:write_errors` (task conn, uuid
  `CorrelationId`, `SqliteRulesRepo.<operation>` endpoint) before the
  `AppError` is re-raised — readable via `processing-cli errors list /
  show`. The persistence helper never raises: an unmigrated `task.db`
  (no Error table yet) only logs, never masks the original error.
  `get_rule_set` skips recording for routine `E_BE_NOT_FOUND` lookup
  misses. The envelope → frontend capture → `POST /errors` sync path
  still fires as well.
- SAVE behavior now with a missing table: fresh empty `root.db` + SAVE
  → repo creates the table + index on the spot, save proceeds normally
  (insert or version-checked update, unchanged logic). If the DDL
  itself fails (e.g. unwritable DB dir), SAVE raises a clear `AppError`
  ("Recipe table bootstrap failed: …; run python
  bin/db-bootstrap.py"), recorded in the Error table when available
  and surfaced through the envelope — never a bare toast, never a
  swallowed catch.
- NOT verified at runtime (per program order; `ast.parse` only).
  End-of-tunnel wave must exercise: fresh empty `root.db` +
  `save_rule_set` without `bin/db-bootstrap.py`, `processing-cli
  errors list` showing a forced failure, and `bin/db-bootstrap.py` on
  top of a self-healed DB (0020 must apply cleanly as a no-op).
- Flagged for the validation wave (out of this workstream): the "Res
  Mismatch: 392x273 (Calibrated: 960x540)" warning in the same
  screenshot.
- Shared-checkout note: a sibling's uncommitted edit to
  `src/lib/vision/white-box-marking.ts` was left unstaged and untouched.
