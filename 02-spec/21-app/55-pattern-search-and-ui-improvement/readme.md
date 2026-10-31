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
