# Spec 55 — Pattern Search and UI Improvement

Owner order (2026-10-31, high priority, non-negotiable): the installation
needs improvement; layer issues, selection, and validation from the
previous night are mostly not working when the simulation creates
patterns; pattern search itself — the priority — is not working.

## 1. Problem statement (owner's words, condensed)

- Simulation-created patterns land in the wrong place. The region of
  interest (ROI) should be square.
- Inside the ROI, the pattern search toolbars and icons are missing.
- Layers cannot be moved; new rectangles/regions cannot be created
  properly. Selection and validation fail in simulation.
- Close, minimize, and maximize buttons do not work properly.
- The run method on the cat is inefficient; the run must be faster.
- The PS1 file and the run shell file must work properly. Installation
  needs improvement.
- UI glitches, including the menu drop-down, which takes a long time to
  open. Speed the process up. Fix why it opens the browser next
  (the browser must not open unnecessarily).
- The run does not show the application version in the UI.
- Pattern search does not find the right pattern; it goes in different
  ways. Pattern search grayscale does not work. Grayscale does not
  convert colors properly. Luminance features do not work.
- Root cause: initially it worked, but after adding the simulation it
  does not. The root cause has been mentioned several times but not
  respected. Find the root cause for pattern search and creation issues.
- Review past implementations by Yasin. Compare with the George release.

## 2. Relationship to spec 54 (do not redo, verify and extend)

Spec 54 shipped window controls (loopback `/shutdown`, launcher
supervision), ROI lock + layers, hover fixes, simulation wall-clock
dwell, camera watchdog, and grayscale modes. This program VERIFIES those
fixes in the installed app and fixes what remains: minimize/maximize in
`--app` mode, menu drop-down open delay, browser auto-open on run,
missing version display in the run UI, and the simulation-time layer /
selection / validation regressions that spec 54 did not cover. Where
spec 54's fix is confirmed working, say so and move on.

## 3. Scope

- Pattern search: placement, matching, layering, ROI squareness,
  toolbars/icons inside the ROI, selection, validation, simulation-time
  behavior.
- Grayscale + luminance: color-to-gray conversion, luminance features,
  Pin 1 configuration paths that depend on them.
- Window controls, menu performance, browser auto-open, version display.
- Installation: PS1 + run shell correctness, run-method efficiency,
  faster startup.
- Deliverables: 100 improvement possibilities (enumerated, prioritized)
  and 200 pattern-search layering possibilities (enumerated,
  prioritized) — analysis lists in this spec, not 300 separate fixes.
  Implementation covers the top-priority items from both lists; the
  rest are recorded for follow-up ordering.

## 4. Screenshots (owner-supplied, to extract to assets/screenshots/)

- Test Rule Fails: https://prnt.sc/73ZlAL4m8xuv
- (unlabelled): https://prnt.sc/dk5te8WiGgP6
- (unlabelled): https://prnt.sc/o8WD6e5hEeXV
- (unlabelled): https://prnt.sc/pIwgGiDJeNgB
- Test Rule Fails: https://prnt.sc/TvS6NS8cnebo
- (unlabelled): https://prnt.sc/TustaDh6yYPl
- Selection, and Pocket Issues: https://prnt.sc/NTvwm5-V03gZ
- (unlabelled): https://prnt.sc/9XRhmb31cI_S
- Menu glitch: https://prnt.sc/TYziH2M8bS0v
- Exit: https://prnt.sc/TYziH2M8bS0v (same link as menu glitch)

## 5. MBUD — May Be Unclear, Decide (owner calls)

1. ROI squareness: force square on creation, on resize, or both?
2. Simulation vs live pattern placement: is the simulation allowed to
   move a pattern the user placed, or must simulation be read-only
   against user geometry?
3. Pattern search "different ways": which search directions/modes are
   legitimate (rotation/scale tolerance) and which are bugs?
4. Grayscale conversion: which luminance formula is canonical
   (Rec.601 / Rec.709 / simple average) for matching?
5. Window controls: is a native shell (Tauri/Electron) now in scope,
   or must `--app` mode keep working with launcher supervision only?
   (Spec 54 MBUD 8, still open.)
6. Browser auto-open: is the browser launch ever wanted on run, or
   must run stay inside the installed app shell always?
7. Version display: where in the run UI (title bar, status bar, about
   panel)?
8. PS1 vs shell: which platforms must the installer cover (Windows
   PowerShell + Linux/macOS shell, or Windows only)?
9. The 100 + 200 lists: implement top N now, or analyze all and
   implement after owner review? (Default: analyze all, implement top
   priority, record the rest.)
10. Yasin vs George: which release is the known-good baseline for
    pattern search behavior?

## 6. Process notes (standing program rules)

- Pull before every commit; merge on conflict, never force-push or
  rewrite pushed history. Targeted `git add <exact paths>` + commit +
  push after every plan and significant code batch; nothing pending
  >10 minutes.
- GitMap-only search (`gitmap aum search` / `find` / `cat` / `ps` /
  `py`); total ban on rg/ripgrep/grep/git grep/Select-String.
- Relative Git paths only, everywhere (files, commits, release pages
  and notes). Never add `.gitmap/data/`.
- Strict boolean standard (`is`/`has` prefixes only); ~300-line max
  per file grouped by concern; 5–8 file micro-batches.
- No builds until tasks are done (build-fix at end of tunnel), except
  the targeted checks each wave names.
- No deletions of any file unless the owner explicitly asks.
- Verify builds and CI personally; never trust a coordinator's
  self-report.

## 7. Section map (filled as waves complete)

- 7. Screenshot confirmations (what each image actually shows).
- 8. Pattern search root-cause analysis (placement, matching,
  layering; simulation regression vs Yasin baseline vs George release).
- 9. Grayscale + luminance analysis (conversion path, dead features).
- 10. UI / window / install / run analysis (menu delay, browser
    auto-open, version display, PS1/shell, run efficiency).
- 11. 100 improvement possibilities (enumerated, prioritized).
- 12. 200 pattern-search layering possibilities (enumerated,
    prioritized).
- 13+. Implementation wave completions (one section per wave).
- End. End-of-tunnel report (build, tests, E2E, CI, remaining gaps).

## 7. Screenshot confirmations (31-Oct-25, commit 33c93544)

9 unique images extracted from the 10 owner links (TYziH2M8bS0v
supplied twice: menu glitch + exit). All verified PNGs.

- 73ZlAL4m8xuv (1148x628): analysis stuck on "SCANNING 0/2" with an
  "ANALYZING IMAGE..." spinner; Rule 2 Grayscale Pattern (T102)
  PENDING; ROI 49/158, 930x174, RECT — a non-square ROI, confirming
  the squareness complaint with a concrete example.
- dk5te8WiGgP6 (1256x539): wide teal pattern-search region spanning
  multiple carrier pockets instead of one target area — the
  misplaced-pattern evidence in one frame.
- o8WD6e5hEeXV (1610x873): full analysis view, REJECT 0/2, FAIL 0.0%,
  "2/2 rules FAILED, Workpiece REJECTED" toast, plus Res Mismatch
  1042x403 vs calibrated 960x540.
- pIwgGiDJeNgB (1580x766): same reject view, toast reading "Rule 2:
  Greyscale Pattern Matching FAILED: Pattern inspection is not
  configured: missing saved pattern boxes" — the search fails for
  lack of saved boxes, not for lack of a match.
- TvS6NS8cnebo (602x198): close crop of that failure toast, including
  "Camera: 20.0ms, 0.0dB | Light: CH1 @ 80%: FAIL".
- TustaDh6yYPl (1630x853): Pocket 2 [Empty Defect] at Res Mismatch
  392x373 vs 960x540, with numbered pattern boxes #1–#59 overflowing
  a single pocket image; ROI marked LOCKED.
- NTvwm5-V03gZ (1599x865): owner-annotated (red boxes) Pocket 5
  [Strip] view: source dropdown, pocket buttons, full strip image
  flagged; pattern boxes overlaid across pockets.
- 9XRhmb31cI_S (1363x546): grayscale tool parameters panel:
  Threshold 151, Tolerance +/-8 px, Search Margin 8 px, Active Target
  Count 1, with the dashed pattern region over the strip.
- TYziH2M8bS0v (1378x711): owner-annotated (red boxes) open source
  dropdown: "Live Camera Feed" presets (Pocket 1 Golden, Pocket 2
  Defect, Pocket 5 Carrier Tape) plus "Upload New Image with Alias";
  top bar shows SIMULATION, 04:31, 84 evts / 83 snaps.

Early pattern (for the root-cause wave to prove or refute): res
mismatch (1042x403, 392x373 vs calibrated 960x540) + boxes spanning
pockets + "missing saved pattern boxes" together suggest placement
and search run in an uncalibrated coordinate space and against
unsaved geometry — not a matcher quality problem.

## 8. Pattern search root-cause analysis (31-Oct-25, verified by
coordinator)

Headline: THERE IS NO SINGLE SHARED LAYER, COORDINATE, OR SEARCH
MODEL. Four canvases implement four different models, three "pattern
search" engines disagree, and teach geometry, runtime geometry, and
simulation geometry live in different coordinate spaces that are
never unified. Simulation did not break a working editor — it added
display-only canvases alongside a teach canvas that spec 54 then
locked, while the known display-vs-evaluation geometry mismatch was
deliberately deferred. Every reported symptom is a different face of
that split.

History chain (verified: commit bcaa5f81 "Ui redesigend and
simulation", 2026-10-14, PR #8; parent 9fa1cc62 "UI fixed v1",
2026-10-10, is the last pre-simulation state and the semantics
baseline — derived region wins, simulation geometry never persists
as a user rule; do NOT revert to it). In bcaa5f81 the pattern region
stopped being derived from detected boxes and became an input
override (`patternRegion: params.patternRegion ??
computedPatternRegion`, pattern-geometry.ts:84, confirmed by
coordinator); detection is now filtered by it (center containment);
the fallback is a hardcoded centered box; the guided-simulation tour
(DEVICE_LAYOUTS, confirmed at ProjectCreationAnalysisTour.tsx:132)
scripts geometry for one 1042x403 analyzer image and persists demo
rules into the real project store with fabricated Pass results.
Later "precise positions" commits re-tuned constants instead of
restoring derivation or adding a frame mapping.

Root-cause chain (each link evidenced by the analysis wave):
1. Simulation replaces search with fixed geometry. The conveyor
   simulation draws a chip on 960x540, then "captures" it by drawing
   the chip asset ALONE into a fresh 140-wide canvas
   (PatternMatchCanvas.tsx:94+, confirmed by coordinator) —
   discarding the drawn position entirely. The carrier-tape
   simulation draws with jitter, then crops an already-shifted
   bitmap with a second jitter offset (double jitter, up to 8px x /
   7px y; only frame 1, jitter 0,0, is correct).
2. The taught search is dropped at the simulation boundary.
   `usePatternMatchingRule.ts:474` creates the simulation with taught
   referenceBoxes, but `useConveyorSimulation.ts:41-48` declares the
   options (referenceBoxes, greyscaleLevel, tolerancePx,
   minMatchPercent — declaration confirmed by coordinator) and never
   reads them. The conveyor evaluator uses hardcoded toleranceLuma
   22 and no searchRegion.
3. Three engines, three verdicts: workbench analyzer = constellation
   matching; standard tool = fixed golden-template luma only (never
   calls the matcher); simulations = yet another luma rule plus
   scripted fallbacks. "Search goes in different ways" is
   structural.
4. The analyzer discards its own positional verdict and recomputes
   pass/fail purely from luma — a geometrically perfect constellation
   can fail and a wrong one can pass on luma alone.
5. Preview and match see different images (see §9): mode-aware
   preview vs continuous Rec.601 + threshold matching; teach luma
   from raw RGBA while the user views the transformed preview; the
   UI slider is explicitly not read by the analyzer, which computes
   its own invisible adaptive threshold (localMean + 10) and never
   reports it.
6. The pattern path has NO polarity handling — the only vision path
   without it. `findWhiteBoxes` is strictly whiten-only; dark-on-light
   markings are invisible, so the constellation matches whatever
   bright blobs exist (tape, glare, background).
7. The layer model was never ported to simulation. The carrier-tape
   simulation canvas has ZERO pointer handlers (confirmed by
   coordinator: 0 onPointer hits) and its onSelectPocket prop is
   never passed by its only parent. The conveyor canvas disables all
   pointer handlers while simulating, and simulation defaults ON.
   Meanwhile the teach canvas locks its ROI by default with a silent
   no-op drag — so "cannot move / cannot create" is true in
   simulation (no editor exists) and confusingly silent in teach.
8. Coordinate spaces were never unified, and unification was
   DELIBERATELY DEFERRED. Regions are stored in source-image pixels
   but painted on stretched 960x540 frames; the loader stretches
   portrait images to 960x540; the standard tool stretches every
   upload to 960x540; the carrier photo is forced to 512x288.
   Commit 27262b06 (2026-10-17, "revert workpiece letterbox - rules
   calibrated to stretched pixels", confirmed by coordinator)
   records that rules are calibrated to stretched pixels and
   unification "needs a rule re-tuning pass" — recorded as a known
   issue and never done. The Res Mismatch warning is display-only;
   neither simulation path checks or compensates for it.
9. "Mentioned but not respected", quoted: spec 54 §7 (outside-click
   replaces ROI — fixed only for the locked ROI, pattern/mask
   replacement and both simulation canvases untouched); spec 55 §7
   early pattern (uncalibrated space + unsaved geometry — the
   matcher was tuned while plumbing stayed split); commit 27262b06
   + CI spec ("unifying display/eval geometry needs a rule re-tuning
   pass", marked NOT CHANGED deliberately).
10. George release: NOT FOUND in any repo record (branches, tags,
    PRs, full history — the only "George" hits are spec 55 itself,
    confirmed by coordinator). Must not be assumed. Nearest
    candidates the owner may mean: Mohana Selvan SV's v4.113.x line
    (v4.113.9, 2026-10-30, workpiece canvas restoration) — but the
    repo never calls Mohana "George". MBUD 10 stays open on the
    George side; the verified baseline is 9fa1cc62 semantics.
11. Spec 54 interaction: ROI lock converts jumps into silent
    cannot-create/cannot-move for users who don't know double-click;
    LayersPanel exists only in teach, so users expect it where it is
    absent; panel/draw/hit-test orders are three different truths
    (panel static kind zOrder, draw layerOrder with boxes always on
    top, hit-test hardcoded boxes→masks→pattern→ROI ignoring
    layerOrder); box reorder silently no-ops and box hide = exclude
    (changing validation counts); pattern/mask replacement survives
    spec 54; first-run full-frame ROI is immediately locked; Pin1
    dispatcher tool has lock enforcement with no panel (panel wiring
    landed only in Pin1MarkingTool); NO square enforcement anywhere
    (`regionFromPoints` is a free rectangle); workbench canvas
    bypasses the lock model entirely (no lock parameter).
12. P0 fix list (in order): (1) capture the canvas, not the asset
    (crop the live canvas at trigger time, carry the crop origin);
    (2) fix carrier double jitter (analyse un-translated draw, draw
    overlays outside the translate block; verify frame 2, not just
    frame 1); (3) add polarity to the pattern path (both threshold
    directions, or a polarity param mirroring Pin1); (4) make the
    slider real (feed greyscaleLevel/threshold into the analyzer and
    report the effective threshold) or remove it; (5) stop the
    analyzer discarding positional evidence (one coherent verdict:
    positional AND luma, both reported); (6) simulation must not
    shadow live results (default isSimulating false in the live
    tool; never synthesize results when no frame exists — report "no
    frame captured"); (7) give simulation canvases an input path or
    stop implying editability; (8) make the white-box lock
    discoverable and non-silent (toast/hint + on-canvas Unlock).
    P1/P2 (25 items total in the analysis report): one explicit
    coordinate space (stretched 960x540 recommended since rules are
    already calibrated to it), unified marking geometry, routing
    simulation evaluation through constellation matching, size/shape
    gating + non-max suppression, image-pipeline fixes (cache
    aliasing, letterboxing vs stretch), teach/analyse on the same
    image, panel order deriving from layerOrder, hide vs exclude
    separation, unified validation gates, dispatcher Pin1 lock state,
    carrier rotation handling, robust capture, clock/calibration
    honesty, dead-code deletion, square ROI enforcement once the
    canonical space is fixed.
13. Open questions needing runtime/owner answers (do not block the
    fix waves, but they set priority): which surface the owner
    actually uses when patterns land wrong (dispatcher carrier-tape
    sim vs orphaned conveyor canvas with no importer vs guided tour);
    whether George = Mohana's v4.113.x line; natural pixel sizes of
    chip sprites and preview photos (full-sprite vs body-inset box
    geometry unmeasured); the real calibrated field of view
    (mm/px in 960x540 space); live-UI behavior (never exercised
    live, per spec 54 §23).

## 9. Grayscale + luminance analysis (31-Oct-25, verified by coordinator)

Verdict: spec 54's three grayscale modes (threshold / stretch / 1-bit)
are DISPLAY-ONLY everywhere. No matcher takes a mode as input. Every
matcher re-derives its own grayscale from raw RGBA with Rec.601 and
ignores the mode buttons — the user changes what they SEE while
matching input never changes. Coordinator-verified: `markWhiteBoxes`
takes `whiteThreshold` only (white-box-marking.ts:153); the Pin1 hook
admits it in a comment ("stretch/one-bit change the preview bits
only — detection still uses thresholdLuma, so a mode switch never
re-runs detection"); `applyLuminanceFilter` has zero production
callers (only its own test); `toGrayscalePreviewRgba` has exactly one
production caller, `PatternCanvas.tsx:224` (preview).

- All production conversions are Rec.601 on raw sRGB bytes, no gamma
  linearization: Y = 0.299R + 0.587G + 0.114B. No Rec.709, no simple
  average anywhere in production. MBUD 4 answer: Rec.601 is canonical
  de facto (frontend and backend agree exactly); the fix is modes
  reaching matchers, not new weights.
- "Threshold" now means three different things: white-box threshold =
  true binarization 0/255 (commit 55c8ffbf changed it from whiten-only
  via `applyGrayscaleBitDepthContrast`, so spec 54 §20/§22 claims about
  "unchanged" legacy output are stale); Pin1 threshold = whiten-only on
  continuous gray (private copy in Pin1Canvas); Pin1 1-bit with
  DarkIndentation = dark→white, OPPOSITE to white-box 1-bit
  bright→white. White-box stretch = continuous stretch; Pin1 stretch =
  stretch then polarity-binarize.
- Pin1 silent threshold override (frontend round-hole-detector.ts AND
  backend pin1_detection.py, identical): with DarkIndentation, if the
  user's thresholdLuma >= region mean luma it is silently replaced by
  max(15, round(mean x 0.75)). The slider value is not the value used.
  Pin1 default thresholdLuma is 35 (dark-only) vs marking default 170.
- Atmel chip matcher is not a search: it compares each box's mean raw
  luma against hardcoded GOLDEN_ATMEL_LUMAS (24 constants from one
  golden sample) at fixed relative positions. No template correlation,
  no taught reference, no grayscale control affects its verdict.
  `greyscaleLevel` is computed but never passed to it.
- Taught-pattern analyzer genuinely searches (translation + rotation
  in 5-degree steps), but: (a) its positional stage is bright-only
  (`findWhiteBoxes` skips every pixel below threshold), so dark
  markings can never become candidates; (b) boxes with no stored
  `expectedLuma` never match, by design — legacy rules fail
  permanently. Saved threshold/greyscaleLevel from teach only feed the
  positional threshold; no mode is stored or read.
- Dead / decorative luminance features: the whole
  luminance-quantizer.ts engine (percentile stretch, Otsu, 2-bit
  quantize, polarity invert, offscreen buffer); StandardIntensityTool
  metric/limits are local useState only, never written to settings;
  `ATMEL_24_MARKING_OFFSETS` golden table defined but never
  referenced (a second golden table drifting from the live one);
  `toTwoBitGray` matching path effectively dormant (every real caller
  passes a threshold).

## 10. UI / window / install / run analysis (31-Oct-25, verified by
coordinator)

Spec 54 re-verified in current code (not trusted from the spec):
loopback POST /shutdown, single Exit path, launcher supervision + 5s
delegation guard, hover fix, wall-clock dwell, camera watchdog +
retry button. What remains:

- Minimize/maximize/close are broken BY ARCHITECTURE, not by a bug.
  No native shell exists (zero Tauri/Electron hits); the bridge
  resolver probes `window.desktopApi` / `__TAURI__` / `electronAPI`
  but nothing ever provides them. Coordinator-verified: minimize
  exits fullscreen, dispatches an event nobody listens to, and shows
  a toast saying minimize is unavailable in browser mode. Maximize
  is a fullscreen toggle fighting the `--start-fullscreen` launch
  flag. Close POSTs /shutdown then calls `window.close()`, a
  browser-security no-op for script-unopened windows — the user must
  still close the window by hand after every Exit. This is spec 54
  MBUD 8 / spec 55 MBUD 5, still open, and it gates the rest: no SPA
  code can create a real minimize button.
- Menu drop-down delay has NO coded cause: stock Radix menu, ~150ms
  animation, light content, no fetch/sleep on open. Ranked suspects
  needing a profiler trace on the user's machine: (1) `isMenuOpen`
  lives in StandardAppShell, so opening re-renders the shell AND its
  children, including heavy vision canvases and the simulation
  player; (2) main-thread contention during simulation/run; (3)
  `backdrop-blur-xl` compositing cost in fullscreen `--app`.
  Screenshot gap: the owner supplied the SAME link for menu glitch
  and exit, so the two complaints cannot be separated from images.
- Browser auto-open is structural: the "installed app" IS a browser
  window (`--app=<frontend-url> --start-fullscreen` + dedicated
  profile); the installer auto-launches it, and shortcuts point at
  the launchers. Extra vectors: macOS `open "$FRONTEND_URL"` fallback
  = a normal tab in the default browser with no profile, no
  fullscreen, no supervision; <5s delegation leaves the backend
  running with only a log line; the PS1 console window stays visible
  all session (no `-WindowStyle Hidden`).
- Version missing from the run UI is literally true: the badge
  renders ONLY on the home route (`pathname === "/"` gate); on /run
  and every tool page there is no version anywhere.
  Coordinator-verified: `version-info.ts` hardcodes
  `commitHash: "038f4b22"` (HEAD is now far past it) and imports
  version.json inlined at build time, so the running UI lags bumps.
  Three conflicting versions exist: version.json 4.113.9, BE
  `__init__` 0.1.0 (served by GET /meta), FastAPI 1.0.0. Launchers
  never print the version.
- start.ps1 bugs: no already-running check (asymmetric with
  start.sh) — a stale backend holding ports 8787/3000 masks the new
  backend's bind failure because readiness polling succeeds against
  the OLD backend; fully sequential startup (db-bootstrap → backend
  → 60s poll → frontend → 60s poll → browser) though frontend does
  not depend on backend; no version output.
- start.sh bugs: trap is INT TERM only, NOT EXIT — coordinator
  verified (`trap stop_own_services INT TERM`) — so a missing
  browser on Linux or a failed readiness wait under `set -e` exits
  leaving backend + frontend orphaned. Otherwise better than ps1
  (it does reuse healthy services).
- Run inefficiency, step by step: db-bootstrap runs synchronously,
  then the backend runs THE SAME migrations a second time in its
  lifespan before serving /healthz; then two sequential readiness
  polls (up to 60s each) before the browser launches; then a fresh
  profile cold start. Parallelizable without new architecture:
  concurrent backend + frontend starts, exactly one migration pass,
  parallel readiness waits with real health endpoints, healthy-service
  reuse on both platforms, fail fast on port bind failure instead of
  a 60s "did not become ready".
- Fix list (priority order): (1) decide MBUD 5/6 (native shell vs
  --app-only) — gates everything; (2) launcher parity + orphans +
  hidden PS1 console + macOS --app launch; (3) version badge on all
  routes, build-time commit hash, reconcile the three version
  sources, launchers print version; (4) faster run per above;
  (5) menu open (split menu state out of shell re-render, drop
  backdrop-blur, add open-timing instrumentation); (6) close honesty
  gap (say window.close() is a no-op, surface the delegation case as
  a toast); (7) ports fail fast with "already in use by …".
- Not verified here: `server/index.mjs` packaging artifact (absent
  from this tree — check on the installed machine); menu latency
  needs a profiler trace; spec 54 §13/§23 runtime checklist (button
  clicks, orphans, ports free, camera prompt) still owed on the
  user's machine.
- Simulation's carrier-tape evaluator computes raw Rec.601 luma
  throughout; no threshold, stretch, or mode reaches it.
- Fix list (priority order): (1) one shared `toMatchingGray(rgba,
  mode, threshold)` entry feeding every matcher, or label mode buttons
  preview-only; (2) collapse to one threshold implementation, polarity
  as a separate explicit invert; (3) stop silently overriding Pin1's
  threshold (surface the effective value); (4) replace the Atmel fixed
  golden table with the taught constellation or scope that tool to
  Atmel-only; (5) dark-marking positional path + expectedLuma backfill
  in the analyzer; (6) wire or delete the dead luminance features and
  the second golden table; (7) reconcile threshold scales (35 vs 170)
  and document each tool's slider end.
