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
- 11. 100 improvement possibilities (enumerated, prioritized — complete:
  100 items, P0 40 / P1 35 / P2 25, 97 evidenced / 3 [PROPOSED]).
- 12. 200 pattern-search layering possibilities (enumerated,
    prioritized — complete: 200 items, P0 70 / P1 70 / P2 60, 122
    evidenced / 78 [PROPOSED], counted separately per surface).
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

## 11. 100 improvement possibilities (enumerated, prioritized)

One line each, P0 first. Area tags: PS pattern search, GS grayscale,
LY layers, SEL selection/validation, WIN window controls, MENU menu,
BRW browser auto-open, VER version display, INST installers, RUN run
speed, SIM simulation. Every item traces to a finding in §7–§10
(surface/file named in the item) unless marked [PROPOSED].

1. [P0] [PS] Capture the live canvas at trigger time and carry the crop origin — sim patterns land wrong (PatternMatchCanvas).
2. [P0] [PS] Fix carrier double jitter: analyse the un-translated draw, draw overlays outside the translate block, verify frame 2 not just frame 1.
3. [P0] [PS] Route simulation evaluation through taught referenceBoxes — useConveyorSimulation declares but never reads them.
4. [P0] [PS] Remove hardcoded toleranceLuma 22 in the conveyor evaluator; use the taught tolerancePx.
5. [P0] [PS] Give the conveyor evaluator the taught searchRegion instead of none.
6. [P0] [PS] One coherent verdict: positional AND luma, both reported — stop the analyzer discarding its positional evidence.
7. [P0] [PS] Add polarity to the pattern path: both threshold directions, or a polarity param mirroring Pin1.
8. [P0] [PS] Make findWhiteBoxes polarity-aware so dark-on-light markings can become candidates.
9. [P0] [GS] One shared toMatchingGray(rgba, mode, threshold) feeding every matcher, or label mode buttons preview-only.
10. [P0] [GS] Feed greyscaleLevel/threshold into the analyzer and report the effective threshold — the slider must be real.
11. [P0] [GS] Stop the silent Pin1 threshold override (frontend round-hole-detector.ts AND backend pin1_detection.py); surface the effective value.
12. [P0] [GS] Collapse to one threshold implementation; polarity as a separate explicit invert.
13. [P0] [GS] Fix Pin1 1-bit DarkIndentation vs white-box 1-bit polarity opposition (dark→white vs bright→white).
14. [P0] [LY] Give simulation canvases an input path or stop implying editability — carrier sim has zero pointer handlers.
15. [P0] [LY] Make the white-box lock discoverable: toast/hint + on-canvas Unlock; end the silent no-op drag.
16. [P0] [LY] Enforce square ROI on creation and resize (MBUD 1 decision gates the exact form).
17. [P0] [LY] Restore pattern toolbars/icons inside the ROI on all canvases.
18. [P0] [LY] Unify panel order, draw order, and hit-test order into one layerOrder truth.
19. [P0] [LY] Separate hide from exclude: box hide must not change validation counts.
20. [P0] [LY] Fix box reorder silently no-opping.
21. [P0] [SEL] Fix simulation selection: wire onSelectPocket in the carrier sim parent; enable pointer handlers or gate edit mode explicitly.
22. [P0] [SEL] Fix pattern/mask replacement surviving spec 54 (outside-click replacement).
23. [P0] [SEL] First-run full-frame ROI must not be immediately locked, or must show an unlock affordance.
24. [P0] [WIN] Decide MBUD 5 (native shell vs --app-only) — it gates all window work.
25. [P0] [WIN] Close honesty: window.close() is a browser no-op — surface it, and surface the delegation case as a toast.
26. [P0] [INST] Launcher parity: start.ps1 gets an already-running check like start.sh.
27. [P0] [INST] Fail fast on port bind failure instead of a 60s "did not become ready" (stale backend masking).
28. [P0] [RUN] Exactly one migration pass — db-bootstrap and the backend currently run migrations twice.
29. [P0] [RUN] Concurrent backend + frontend starts with parallel readiness waits on real health endpoints.
30. [P0] [BRW] macOS open fallback must use --app + dedicated profile, not a plain default-browser tab.
31. [P0] [BRW] PS1 console window hidden all session (-WindowStyle Hidden).
32. [P0] [BRW] Sub-5s delegation must surface a toast, not just a log line.
33. [P0] [VER] Version badge on all routes, not only home — remove the pathname === "/" gate.
34. [P0] [VER] Build-time commit hash instead of hardcoded 038f4b22 in version-info.ts.
35. [P0] [VER] Reconcile the three version sources (version.json 4.113.9, BE __init__ 0.1.0, FastAPI 1.0.0).
36. [P0] [PS] Simulation must not shadow live results: default isSimulating false in the live tool; no synthesized results without a frame ("no frame captured").
37. [P0] [PS] Replace the Atmel fixed golden table with the taught constellation, or scope that tool to Atmel-only.
38. [P0] [GS] Dark-marking positional path + expectedLuma backfill so legacy rules can match at all.
39. [P0] [PS] Fix the "missing saved pattern boxes" failure: teach must persist boxes before analysis runs; surface the missing-box state in UI, not only as a toast.
40. [P0] [PS] Declare one canonical coordinate space (stretched 960x540 recommended — rules are already calibrated to it) and run the rule re-tuning pass from 27262b06.
41. [P1] [PS] Size/shape gating + non-max suppression in constellation matching.
42. [P1] [PS] Teach and analyse on the same image (image-pipeline cache aliasing fix).
43. [P1] [PS] Letterboxing vs stretch applied consistently (loader, standard tool, carrier photo).
44. [P1] [GS] Reconcile threshold scales (35 vs 170) and document each tool's slider end.
45. [P1] [GS] Wire or delete dead luminance features (luminance-quantizer engine, toTwoBitGray, ATMEL_24_MARKING_OFFSETS second golden table).
46. [P1] [GS] Wire or delete applyLuminanceFilter (zero production callers, only its own test).
47. [P1] [GS] StandardIntensityTool metric/limits must persist to settings, not local useState only.
48. [P1] [GS] Share the preview path: toGrayscalePreviewRgba has exactly one production caller (PatternCanvas).
49. [P1] [LY] Panel order derives from layerOrder — kill the static kind zOrder.
50. [P1] [LY] Workbench canvas adopts the lock model (today it bypasses it entirely).
51. [P1] [LY] Pin1 dispatcher tool lock state wired to a panel (panel wiring landed only in Pin1MarkingTool).
52. [P1] [LY] Pattern/mask layers get lock semantics matching the ROI.
53. [P1] [LY] Box-layer reorder UI (boxes stay in number order today).
54. [P1] [MENU] Split menu state out of StandardAppShell re-render — opening must not re-render vision canvases and the simulation player.
55. [P1] [MENU] Drop backdrop-blur-xl in fullscreen --app menus.
56. [P1] [MENU] Add menu open-timing instrumentation; profiler trace on the user's machine.
57. [P1] [WIN] Minimize honesty: remove the event nobody listens to; toast states the browser-mode limitation or the native-shell plan.
58. [P1] [WIN] Maximize: stop the fullscreen toggle fighting the --start-fullscreen launch flag.
59. [P1] [INST] start.sh trap on EXIT, not only INT TERM (orphans on failed readiness / missing browser under set -e).
60. [P1] [INST] Healthy-service reuse on both platforms (start.ps1 parity with start.sh).
61. [P1] [RUN] Launchers print the version at startup.
62. [P1] [RUN] Fresh-profile cold start cost: warm the dedicated profile or document the cost.
63. [P1] [BRW] Decide MBUD 6: is browser launch ever wanted on run, or must run stay inside the installed shell always?
64. [P1] [VER] GET /meta version reconciled with version.json; launchers print version.
65. [P1] [PS] Carrier rotation handling in simulation evaluation.
66. [P1] [PS] Robust capture: capture failure reports, never silently falls back to the asset.
67. [P1] [PS] Clock/calibration honesty: simulation timestamps vs real capture time labeled.
68. [P1] [PS] Guided-tour demo rules must not persist into the real project store; fabricated Pass results removed.
69. [P1] [PS] Guided-tour geometry must not script the 1042x403 analyzer image as canonical.
70. [P1] [SEL] Unified validation gates across teach, runtime, and simulation.
71. [P1] [SEL] Identify the surface the owner actually uses when patterns land wrong (dispatcher carrier-tape sim vs orphaned conveyor canvas vs guided tour).
72. [P1] [PS] Pattern region derivation restored: derived region wins over input override (9fa1cc62 semantics).
73. [P1] [PS] Detection filtering by patternRegion center containment documented or removed.
74. [P1] [PS] Hardcoded centered-box fallback replaced with a derived region or an explicit empty state.
75. [P1] [GS] Document Rec.601 as canonical; remove Rec.709/average confusion from UI copy.
76. [P2] [PS] Dead-code deletion: orphaned conveyor canvas with no importer — wire it or delete it.
77. [P2] [PS] Natural pixel sizes of chip sprites measured; full-sprite vs body-inset box geometry documented.
78. [P2] [PS] Real calibrated field of view (mm/px in 960x540 space) measured and recorded.
79. [P2] [GS] Gamma linearization evaluation: is sRGB→linear worth it for matching?
80. [P2] [LY] Rotated detection bounds (axis-aligned today) — record as a limitation or implement.
81. [P2] [LY] Polygon point editing for pattern shapes (points default to corners today).
82. [P2] [LY] Pin1 rotation model (none exists) — record or implement.
83. [P2] [MENU] Menu animation (~150ms Radix) measured against the profiler; reduce only if it is blamed.
84. [P2] [WIN] server/index.mjs packaging artifact: verify presence on the installed machine.
85. [P2] [INST] Installer coverage decision MBUD 8 (Windows-only vs Windows + Linux + macOS).
86. [P2] [RUN] Readiness poll intervals tuned (60s ceilings → adaptive backoff).
87. [P2] [BRW] Dedicated profile creation idempotent; stale profile cleanup.
88. [P2] [VER] About panel with version + commit + build date on all routes.
89. [P2] [PS] Search direction/mode legitimacy per MBUD 3 (rotation/scale tolerance documented).
90. [P2] [PS] Res Mismatch warning becomes compensating, not display-only (or documented as display-only).
91. [P2] [SEL] Selection affordances: selected-layer outline visible on all canvases.
92. [P2] [SEL] Validation messages name the failing gate (geometry vs luma vs count).
93. [P2] [GS] Otsu/percentile stretch evaluation for an auto-threshold option.
94. [P2] [GS] 2-bit quantize mode: wire or delete.
95. [P2] [LY] Layer count/overflow guard: #1–#59 box overflow across pockets prevented.
96. [P2] [LY] Pocket-scoped vs global box numbering decision (spec 54 MBUD 3).
97. [P2] [PS] Conveyor vs carrier-tape engine consolidation plan (one matcher, two renderers).
98. [P2] [RUN] Telemetry of startup step timings (bootstrap/backend/frontend/browser) to a log. [PROPOSED]
99. [P2] [MENU] Menu content virtualization if the profiler shows content cost (not suspected today). [PROPOSED]
100. [P2] [PS] Regression suite: golden-image pattern-search fixtures pinning teach/runtime/sim verdicts together. [PROPOSED]

## 12. 200 pattern-search layering possibilities (enumerated, prioritized)

One line each, P0 first. Surface tags: TEACH white-box teach canvas,
PIN1 Pin1 canvas, BENCH workbench analyzer canvas, CARR carrier-tape
simulation canvas, CONV conveyor simulation canvas, TOUR guided tour,
DISP dispatcher, PANEL layer panels, COORD coordinate spaces,
X cross-cutting. The same defect class is counted separately per
surface where it appears in multiple places (stated in the item via
its surface tag). Items trace to §7–§10 findings unless marked
[PROPOSED] (a genuine new opportunity, not a found defect).

1. [P0] [TEACH] Panel order, draw order, and hit-test order unified to one layerOrder (today three different truths).
2. [P0] [TEACH] Hit-test honors layerOrder instead of hardcoded boxes→masks→pattern→ROI.
3. [P0] [TEACH] Locked ROI drag is a silent no-op — add toast/hint + on-canvas Unlock affordance.
4. [P0] [TEACH] Outside-click no longer replaces a locked ROI; when unlocked, replacement requires explicit intent.
5. [P0] [TEACH] Pattern layer replacement on outside click removed; pattern edits only via pattern handles.
6. [P0] [TEACH] Mask layer replacement on outside click removed; masks edit only via mask handles.
7. [P0] [TEACH] Box reorder wired (today silently no-ops); drag or Bring Forward/Send Backward changes draw + hit order.
8. [P0] [PIN1] Pin1 canvas lock/reorder enforcement parity with white-box, verified end to end (canvas landed in spec 54 wave 2.5).
9. [P0] [PIN1] Pin1MarkingTool LayersPanel buttons wired to canvas lock/reorder state (canvas first, panel omitted).
10. [P0] [PIN1] Pin1 search ROI locked by default with a visible LOCKED label; double-click unlocks.
11. [P0] [PIN1] Pin1 package region lock semantics defined (stays unlocked after Add Package Region — document or change).
12. [P0] [PIN1] Pin1 pattern-shape overlay hit-test must not hijack ROI drag.
13. [P0] [PIN1] Pin1 grayscale mode layer: preview mode must reach detection or be labeled preview-only.
14. [P0] [PIN1] Pin1 dispatcher tool lock state exposed to a panel (currently panel-less enforcement).
15. [P0] [BENCH] Workbench canvas adopts the lock model (today bypasses it entirely — no lock parameter).
16. [P0] [BENCH] Analyzer draw order (ROI→pattern→masks→zones→boxes-on-top) replaced by layerOrder.
17. [P0] [BENCH] Analyzer hit-test order matches its draw order.
18. [P0] [BENCH] Analyzer boxes spanning pockets (#1–#59 overflow) constrained to pocket scope.
19. [P0] [BENCH] Analyzer pattern boxes drawn from saved geometry only; unsaved geometry never rendered as results.
20. [P0] [BENCH] Analyzer ROI squareness enforced at draw time.
21. [P0] [BENCH] Analyzer "missing saved pattern boxes" state rendered on canvas, not only as a toast.
22. [P0] [CARR] Carrier sim canvas gains pointer handlers (today zero) or an explicit non-editable badge.
23. [P0] [CARR] onSelectPocket wired by its only parent (today never passed).
24. [P0] [CARR] Carrier sim overlays drawn outside the jitter translate block (double-jitter fix).
25. [P0] [CARR] Carrier sim analysis runs on the un-translated draw, not the shifted crop.
26. [P0] [CARR] Carrier sim ROI/pattern layers drawn in the same space as analysis (no second jitter offset).
27. [P0] [CARR] Carrier sim layer visibility toggles exist (ROI/pattern/boxes separately).
28. [P0] [CARR] Carrier sim pattern toolbar/icons rendered inside the ROI, or the sim labeled read-only.
29. [P0] [CONV] Conveyor capture crops the live canvas at trigger time and carries the crop origin.
30. [P0] [CONV] Conveyor pointer handlers re-enabled when not simulating, or edit mode made explicit.
31. [P0] [CONV] Conveyor sim defaults to not simulating in the live tool (isSimulating false).
32. [P0] [CONV] Conveyor sim never synthesizes results without a frame — "no frame captured" state.
33. [P0] [CONV] Conveyor sim layer order matches teach canvas layer order.
34. [P0] [CONV] Conveyor sim taught referenceBoxes actually read by the evaluator.
35. [P0] [CONV] Orphaned conveyor canvas (no importer) wired or deleted — no third hidden layer model.
36. [P0] [TOUR] Guided-tour geometry never persists into the real project store.
37. [P0] [TOUR] Guided-tour fabricated Pass results removed; tour verdicts labeled demo-only.
38. [P0] [TOUR] Tour DEVICE_LAYOUTS geometry scoped to its 1042x403 demo image, never treated as canonical.
39. [P0] [TOUR] Tour pattern boxes drawn as a demo overlay layer, visually distinct from user layers.
40. [P0] [TOUR] Tour layer edits (if any) sandboxed; exiting the tour restores user geometry.
41. [P0] [TOUR] Tour ROI squareness enforced same as the teach canvas.
42. [P0] [TOUR] Tour completion clears demo layers instead of leaving them in the project.
43. [P0] [DISP] Dispatcher carrier-tape sim surface identified and its layer model documented.
44. [P0] [DISP] Dispatcher sim layers (ROI/pattern/boxes) share teach layerOrder.
45. [P0] [DISP] Dispatcher sim selection works (pocket select via canvas, not only buttons).
46. [P0] [DISP] Dispatcher sim pattern placement uses taught geometry, not scripted geometry.
47. [P0] [DISP] Dispatcher sim lock state visible (locked ROI labeled, unlock gesture works).
48. [P0] [DISP] Dispatcher sim boxes constrained to the selected pocket.
49. [P0] [DISP] Dispatcher sim pattern toolbar/icons present inside the ROI.
50. [P0] [PANEL] LayersPanel order derives from layerOrder (kill static kind zOrder).
51. [P0] [PANEL] LayersPanel exists in simulation surfaces, or sim labeled panel-less.
52. [P0] [PANEL] Panel selection syncs to canvas selection bidirectionally.
53. [P0] [PANEL] Panel visibility toggle changes draw only, never validation counts.
54. [P0] [PANEL] Panel lock toggle changes canvas lock state (both directions).
55. [P0] [PANEL] Panel reorder changes draw order AND hit-test order atomically.
56. [P0] [PANEL] BoxReviewPanel/Pin1ReviewPanel layer state syncs with canvas (grayscale mode precedent).
57. [P0] [COORD] Canonical space declared: stretched 960x540 (rules already calibrated to it).
58. [P0] [COORD] Source-pixel regions mapped to the stretched frame at draw time (single transform).
59. [P0] [COORD] Portrait loader stretch documented; letterbox-vs-stretch decision applied.
60. [P0] [COORD] Standard tool upload stretch to 960x540 mapped through the same transform.
61. [P0] [COORD] Carrier photo 512x288 forced size mapped through the same transform.
62. [P0] [COORD] 140-wide conveyor capture crop origin carried into layer coordinates.
63. [P0] [COORD] Res Mismatch warning becomes a compensating transform or is documented display-only.
64. [P0] [X] One shared layer model type used by all four canvases (no per-canvas reinvention).
65. [P0] [X] Teach geometry, runtime geometry, and simulation geometry stored in separate namespaces, never mixed.
66. [P0] [X] Simulation geometry never persists as a user rule (9fa1cc62 semantics restored).
67. [P0] [X] Pattern region derivation restored: derived region wins over input override.
68. [P0] [X] Hide vs exclude separated globally: hide affects draw only, exclude affects validation.
69. [P0] [X] Box hide in every surface changes draw only (audit all surfaces).
70. [P0] [X] Square ROI enforcement once the canonical space is fixed (all surfaces).
71. [P1] [TEACH] Rotate handle rotates the pattern layer with bounds recomputed (axis-aligned today).
72. [P1] [TEACH] Resize handles respect the square constraint when enabled.
73. [P1] [TEACH] Layer grouping: ROI+pattern+masks move as a group when grouped. [PROPOSED]
74. [P1] [TEACH] Layer opacity controls for overlays (tape/glare readability). [PROPOSED]
75. [P1] [TEACH] Active-layer highlight distinct from the selection outline.
76. [P1] [TEACH] Layer delete with confirmation; deleting an ROI deletes dependent pattern/masks or warns.
77. [P1] [TEACH] Layer duplicate (pattern/mask) for multi-pocket teach. [PROPOSED]
78. [P1] [PIN1] Pin1 rotation model added (none exists) or rotation explicitly unsupported.
79. [P1] [PIN1] Pin1 polygon point editing (points default to corners today).
80. [P1] [PIN1] Pin1 pattern-shape layer z-order vs search ROI defined.
81. [P1] [PIN1] Pin1 hole badges layer above the pattern overlay, never hidden by it.
82. [P1] [PIN1] Pin1 registered-reticle layer toggle. [PROPOSED]
83. [P1] [PIN1] Pin1 detected-hole layer selection syncs with the list panel.
84. [P1] [PIN1] Pin1 grayscale preview layer composited under overlays, never over them.
85. [P1] [BENCH] Bench zone layers (zones vs masks) draw order defined.
86. [P1] [BENCH] Bench numbered-box layer order follows box number, not insertion.
87. [P1] [BENCH] Bench pattern region dashed outline distinct from the ROI outline.
88. [P1] [BENCH] Bench rejected-workpiece overlay layer (toast + canvas tint) consistent.
89. [P1] [BENCH] Bench grayscale parameter panel values reflected in the canvas preview layer.
90. [P1] [BENCH] Bench layer visibility persists across analysis runs. [PROPOSED]
91. [P1] [BENCH] Bench canvas layer state survives image switch (source dropdown).
92. [P1] [CARR] Carrier pocket layer per pocket (boxes scoped per pocket, not global).
93. [P1] [CARR] Carrier strip layer vs pocket layer separation.
94. [P1] [CARR] Carrier sim jitter visualization layer (show the applied offset for debug). [PROPOSED]
95. [P1] [CARR] Carrier sim frame-2 verification layer (not just frame 1).
96. [P1] [CARR] Carrier sim tape-sprocket layer excluded from pattern matching.
97. [P1] [CARR] Carrier sim layer creation allowed in paused sim (edit-while-paused mode). [PROPOSED]
98. [P1] [CARR] Carrier sim layer edits in pause do not leak into live rules.
99. [P1] [CONV] Conveyor chip-asset layer vs captured-frame layer separation.
100. [P1] [CONV] Conveyor overlay layer drawn from captured frame coordinates.
101. [P1] [CONV] Conveyor sim pattern layer uses the taught searchRegion.
102. [P1] [CONV] Conveyor sim tolerance layer: taught tolerancePx visualized as a match band.
103. [P1] [CONV] Conveyor sim minMatchPercent visualized as a threshold band.
104. [P1] [CONV] Conveyor sim greyscaleLevel visualized (effective threshold reported).
105. [P1] [CONV] Conveyor sim layer state resets on new capture (no stale boxes).
106. [P1] [TOUR] Tour overlay layer z-order above user layers, clearly badged DEMO.
107. [P1] [TOUR] Tour step highlight layer (current step element outlined).
108. [P1] [TOUR] Tour demo boxes numbered separately from user box numbering.
109. [P1] [TOUR] Tour image layer fixed to its demo asset (no user image bleed).
110. [P1] [TOUR] Tour layer persistence explicitly disabled (no save path).
111. [P1] [TOUR] Tour exit restores pre-tour layer visibility.
112. [P1] [TOUR] Tour pattern toolbar shown, or the tour labeled toolbar-less. [PROPOSED]
113. [P1] [DISP] Dispatcher tool layer model shared with the standard tool (no fork).
114. [P1] [DISP] Dispatcher pocket buttons sync with canvas pocket layer selection.
115. [P1] [DISP] Dispatcher strip image layer vs pocket layer separation.
116. [P1] [DISP] Dispatcher pattern layer per pocket (strip-wide search forbidden).
117. [P1] [DISP] Dispatcher sim layer edits require an explicit edit mode toggle.
118. [P1] [DISP] Dispatcher sim validation counts exclude hidden layers.
119. [P1] [DISP] Dispatcher sim ROI squareness enforced same as teach.
120. [P1] [PANEL] Panel shows layer kind icons (ROI/pattern/mask/box/zone) consistently.
121. [P1] [PANEL] Panel drag-reorder implemented (today buttons only, where implemented). [PROPOSED]
122. [P1] [PANEL] Panel layer count badge (e.g. boxes 59) with overflow warning.
123. [P1] [PANEL] Panel search/filter for layers when box count is large. [PROPOSED]
124. [P1] [PANEL] Panel layer rename (custom labels for masks/patterns). [PROPOSED]
125. [P1] [PANEL] Panel undo for layer reorder/hide/delete. [PROPOSED]
126. [P1] [PANEL] Panel state persists per project (visibility + order). [PROPOSED]
127. [P1] [COORD] Display→source transform unit-tested per surface (CSS px vs canvas px vs source px).
128. [P1] [COORD] DevicePixelRatio handled in hit-testing (canvas backing store vs CSS size).
129. [P1] [COORD] Zoom/pan transform (if any) composed with layer coordinates. [PROPOSED]
130. [P1] [COORD] Calibration (mm/px) recorded per canonical space, not per image.
131. [P1] [COORD] Rule re-tuning pass migrates legacy stretched-pixel rules to the canonical space.
132. [P1] [COORD] Migration report: which rules moved, by how many px.
133. [P1] [COORD] Non-960x540 uploads normalized before teach (no silent stretch).
134. [P1] [X] Layer model versioned in saved rules (order + visibility + lock).
135. [P1] [X] Layer state migration for legacy rules (no layerOrder → default order). [PROPOSED]
136. [P1] [X] Layer validation gate names the failing layer in messages.
137. [P1] [X] Layer change events logged for debugging (who moved what, when). [PROPOSED]
138. [P1] [X] Layer model shared type enforced by lint (no ad-hoc layer objects).
139. [P1] [X] Teach/runtime/sim layer diff view for debugging (what differs, where). [PROPOSED]
140. [P1] [X] Layered screenshot export (canvas + layer list) for bug reports. [PROPOSED]
141. [P2] [TEACH] Snap-to-grid for layer moves (optional, off by default). [PROPOSED]
142. [P2] [TEACH] Layer alignment guides (align pattern to ROI edges). [PROPOSED]
143. [P2] [TEACH] Multi-select layers (shift-click) for group move. [PROPOSED]
144. [P2] [TEACH] Layer keyboard nudging (arrow keys move the selected layer 1px). [PROPOSED]
145. [P2] [TEACH] Layer copy/paste across pockets. [PROPOSED]
146. [P2] [TEACH] Layer templates (save an ROI+pattern+mask set as a template). [PROPOSED]
147. [P2] [PIN1] Pin1 layer opacity slider for the pattern overlay. [PROPOSED]
148. [P2] [PIN1] Pin1 layer blend mode toggle (for glare-heavy images). [PROPOSED]
149. [P2] [PIN1] Pin1 hole-layer filter (show only kept / only primary). [PROPOSED]
150. [P2] [PIN1] Pin1 reticle layer color customization. [PROPOSED]
151. [P2] [PIN1] Pin1 layer export (ROI+shape as JSON). [PROPOSED]
152. [P2] [PIN1] Pin1 layer import validation (reject out-of-frame geometry). [PROPOSED]
153. [P2] [BENCH] Bench layer timeline (layer state per analysis run). [PROPOSED]
154. [P2] [BENCH] Bench diff layer (teach vs runtime geometry side by side). [PROPOSED]
155. [P2] [BENCH] Bench heatmap layer for match scores. [PROPOSED]
156. [P2] [BENCH] Bench layer screenshot with annotations for reports. [PROPOSED]
157. [P2] [BENCH] Bench layer preset per product (load a layer set by product). [PROPOSED]
158. [P2] [BENCH] Bench layer audit log (which layer changed a verdict). [PROPOSED]
159. [P2] [CARR] Carrier sim slow-motion layer stepping (frame-by-frame layer view). [PROPOSED]
160. [P2] [CARR] Carrier sim layer ghosting (previous frame overlay at low opacity). [PROPOSED]
161. [P2] [CARR] Carrier sim pocket-index layer labels. [PROPOSED]
162. [P2] [CARR] Carrier sim sprocket-hole layer toggle. [PROPOSED]
163. [P2] [CARR] Carrier sim layer recording (export layer states per frame). [PROPOSED]
164. [P2] [CARR] Carrier sim layer A/B (compare two layer sets). [PROPOSED]
165. [P2] [CONV] Conveyor sim capture-history layer (past captures as thumbnails). [PROPOSED]
166. [P2] [CONV] Conveyor sim match-score overlay layer. [PROPOSED]
167. [P2] [CONV] Conveyor sim trigger-line layer (capture line visualization). [PROPOSED]
168. [P2] [CONV] Conveyor sim belt-speed layer annotation. [PROPOSED]
169. [P2] [CONV] Conveyor sim layer snapshot on trigger. [PROPOSED]
170. [P2] [CONV] Conveyor sim layer replay (re-run evaluation on a saved frame). [PROPOSED]
171. [P2] [TOUR] Tour layer walkthrough (each step highlights one layer). [PROPOSED]
172. [P2] [TOUR] Tour skip-to-layer step navigation. [PROPOSED]
173. [P2] [TOUR] Tour demo layer reset button. [PROPOSED]
174. [P2] [TOUR] Tour layer quiz (identify ROI vs pattern layer). [PROPOSED]
175. [P2] [TOUR] Tour layer state checkpoint/restore. [PROPOSED]
176. [P2] [TOUR] Tour layer localization (labels per locale). [PROPOSED]
177. [P2] [DISP] Dispatcher sim layer favorites (pin frequent layer sets). [PROPOSED]
178. [P2] [DISP] Dispatcher sim layer compare (teach vs sim geometry). [PROPOSED]
179. [P2] [DISP] Dispatcher sim layer grid overlay. [PROPOSED]
180. [P2] [DISP] Dispatcher sim layer ruler (px/mm scale). [PROPOSED]
181. [P2] [DISP] Dispatcher sim layer print layout (for paper SOP). [PROPOSED]
182. [P2] [DISP] Dispatcher sim layer voice labels (accessibility). [PROPOSED]
183. [P2] [PANEL] Panel layer color coding by kind. [PROPOSED]
184. [P2] [PANEL] Panel collapsible layer groups. [PROPOSED]
185. [P2] [PANEL] Panel layer visibility presets (all / teach-only / results-only). [PROPOSED]
186. [P2] [PANEL] Panel layer sort (by kind / name / z-order). [PROPOSED]
187. [P2] [PANEL] Panel layer duplication button. [PROPOSED]
188. [P2] [PANEL] Panel layer lock-all / unlock-all. [PROPOSED]
189. [P2] [COORD] Coordinate-space badge on canvas (shows current space + scale). [PROPOSED]
190. [P2] [COORD] Coordinate readout on hover (source px + canonical px). [PROPOSED]
191. [P2] [COORD] Transform debugger overlay (draw source frame bounds). [PROPOSED]
192. [P2] [COORD] Per-image calibration override (when FOV differs). [PROPOSED]
193. [P2] [COORD] Transform regression fixtures (golden transforms pinned). [PROPOSED]
194. [P2] [COORD] Coordinate-space migration dry-run report. [PROPOSED]
195. [P2] [X] Layer model documentation page (kinds, orders, semantics). [PROPOSED]
196. [P2] [X] Layer model JSON schema + validation on load. [PROPOSED]
197. [P2] [X] Layer telemetry (which layers users touch most). [PROPOSED]
198. [P2] [X] Layer accessibility (keyboard layer navigation). [PROPOSED]
199. [P2] [X] Layer animation on reorder (smooth z transition). [PROPOSED]
200. [P2] [X] Layer conflict resolver (teach vs sim geometry merge UI). [PROPOSED]

## 13. Wave 3 completion — window/menu/browser/version/install/run
(31-Oct-25, verified by coordinator: 3 commits on origin, HEAD
27d4e2e3 at verification time; prebuild wiring 7ff856aa followed.)

- Launcher parity + orphans: start.ps1 gained already-running
  reuse checks for backend/frontend (a stale backend can no longer
  mask a new bind failure) + combined Wait-AppServices polling both
  every 250ms; start.sh trap is now EXIT INT TERM (coordinator
  verified) with a LEAVE_SERVICES_RUNNING guard for the two
  must-outlive paths (browser delegation, macOS open path); macOS
  fallback replaced with per-app `open -n -a` --app + dedicated
  profile (plain-tab open no longer exists); install.ps1 final
  launch uses -WindowStyle Hidden.
- Version everywhere, one source: badge moved out of the
  `pathname === "/"` gate (coordinator verified: logo stays
  home-only, badge button is outside the conditional) — shows on
  /run and all tool pages; hardcoded commitHash 038f4b22 replaced by
  a generated import (scripts/generate-commit-hash.mjs +
  src/lib/commit-hash.generated.ts); BE __version__ = 4.113.9,
  FastAPI version uses it, GET /meta serves it (old 0.1.0/1.0.0
  gone; no in-repo FE code reads /meta today, but its docstring
  claims a typed client gates features on it — external consumers
  see the new value); both launchers print the version at startup
  (from version.json in source layout, else GET /meta after backend
  readiness in installed layout).
- Faster run: backend + frontend start concurrently on both
  launchers, 0.25s poll interval, 60s cap kept, process-death
  fail-fast during waits; migration pass deleted from the LAUNCH
  path only (backend lifespan runs the same _bootstrap_tier for
  root/task/rules, which also covers backends started without the
  launcher; db-bootstrap itself untouched, still used by CLI
  preflight; tradeoff: a launch-time migration failure now surfaces
  as a lifespan warning, not a hard launcher failure); port
  fail-fast with "port 8787/3000 already in use by …" (TCP probe +
  ss/lsof owner on sh, Test-PortHeld + Get-PortOwnerText on ps1).
- Menu open: ShellMainContent memoized on children identity, so a
  menu open no longer re-renders heavy vision canvases;
  backdrop-blur-xl removed from menu content (header's kept);
  open timing instrumented (cat-vision:menu-open-start mark +
  `[menu-timing] menu open took Xms` log) — the next complaint
  arrives with a measured number.
- Close honesty gap: after POST /shutdown + window.close(), a
  400ms timer sets isCloseNoop and the dialog states plainly that
  the browser blocked the close and the user must close the window
  themselves (Alt+F4/OS button), plus a toast with the same
  remaining step. Minimize/maximize UNCHANGED (still browser-limited)
  — no SPA code can fix them without the MBUD 5/6 native-shell
  decision.
- Commit-hash freshness, closed by coordinator (7ff856aa):
  package.json `prebuild` now runs the generator, so every
  `bun run build` — including the release workflow's Compile
  Frontend step — refreshes the hash to the build commit. The
  committed generated file is a dev fallback, always one commit
  behind by construction; the built badge is fresh.
- Delegation toast, closest correct behavior: a launcher cannot
  toast into browser UI without a channel, so both launchers now
  print a prominent multi-line delegation notice (console +
  shutdown.log) alongside the Exit-flow toast/dialog. A true
  launcher→UI toast needs a backend flag endpoint or the MBUD 5/6
  native shell.
- Verification: bash -n clean on start.sh; prettier clean on all
  touched frontend files; PowerShell files re-read in full after
  editing (no PowerShell on this VM — machine syntax check owed to
  CI/end-of-tunnel). No builds or test runs per program order.
