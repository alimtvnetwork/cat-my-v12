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

Recorded verbatim; image contents could NOT be extracted from this
environment (prnt.sc pages expose no image via text fetch). The user is
asked to drop the image files into the spec assets folder in the morning;
URLs are preserved here for reference.

- https://prnt.sc/pUuIGz0ih_ZZ
- https://prnt.sc/wL_7nmmUJQPh
- https://prnt.sc/wXoDp20hMNwJ
- https://prnt.sc/rzcoeqtbFB8l
- https://prnt.sc/9qwZWqYiKV95
- https://prnt.sc/Os3MgbBIMHmT
- https://prnt.sc/_lKsg1rvFRnI
- Glitch menu: https://prnt.sc/RJPTx3RB8gDf
- https://prnt.sc/j21Xbgbsy6bB
- Pattern search point: https://prnt.sc/JA4FdRFDSKi2
- https://prnt.sc/mr6_-1EdpFtG
- Dropdown: https://prnt.sc/bg2jMNWxHjkn

## 5. MBUD — Matters to Be Discussed in the Morning (Ambiguities)

1. Screenshot contents (above) — confirm each glitch visually once images
   are in the spec assets folder.
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
