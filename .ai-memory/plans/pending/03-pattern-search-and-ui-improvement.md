---
Status: pending
Created: 31-Oct-26
Goal: Fix pattern search (grayscale, matching, pin-one), layering, ROI, window controls, run method, installation, and UI glitches on branch fix/4-oct-26-joy-optimization-and-project, from the root causes established 31-Oct-26 — without contradicting the authoritative pattern-search spec or the in-flight 02-cicd-remediation task
---

# Pattern Search and UI Improvement Plan

Spec: `02-spec/21-app/03-pattern-search-and-ui-improvement/` (readme plus
files 01–05). Parent spec: `.ai-memory/plans/completed/01-pattern-search-spec.md`.
Evidence: three research tracks plus nine operator screenshots (links and
findings in the spec readme).

## Root causes (summary; full evidence in spec files 01–03)

- RC1: four coordinate spaces (1280x720 editor, 960x540 pattern, 512x288
  simulation, raw camera pixels), zero conversion between them.
- RC2: four disagreeing grayscale/luminance implementations plus a
  one-sided threshold and sample/reference asymmetry.
- RC3: fragmented region model (five representations), a matcher that
  measures only at expected positions (no translation search), and
  substring dispatch that checks simulation before pattern (with the
  "greyscle simulation" typo).

## Tasks

1. [Task 01 — Root-cause investigation](../subtasks/03-pattern-search-and-ui-improvement/task-01-root-cause-investigation.md) — DONE
2. [Task 02 — Grayscale and luminance](../subtasks/03-pattern-search-and-ui-improvement/task-02-grayscale-luminance.md)
3. [Task 03 — Layers, selection, validation](../subtasks/03-pattern-search-and-ui-improvement/task-03-layers-selection-validation.md)
4. [Task 04 — Square ROI plus toolbars and icons](../subtasks/03-pattern-search-and-ui-improvement/task-04-square-roi-toolbars-icons.md)
5. [Task 05 — Window buttons](../subtasks/03-pattern-search-and-ui-improvement/task-05-window-buttons.md)
6. [Task 06 — Run method efficiency](../subtasks/03-pattern-search-and-ui-improvement/task-06-run-efficiency.md)
7. [Task 07 — Installation plus PS1 and run shell files](../subtasks/03-pattern-search-and-ui-improvement/task-07-installation-ps1-run-sh.md)
8. [Task 08 — Menu delay, glitches, browser auto-open](../subtasks/03-pattern-search-and-ui-improvement/task-08-menu-delay-browser-auto-open.md)
9. [Task 09 — Version display during run](../subtasks/03-pattern-search-and-ui-improvement/task-09-version-display.md)
10. [Task 10 — Pin-one configuration](../subtasks/03-pattern-search-and-ui-improvement/task-10-pin-one-configuration.md)
11. [Task 11 — 100 improvements plus 200 layering possibilities](../subtasks/03-pattern-search-and-ui-improvement/task-11-inventories.md) — DONE
12. [Task 12 — Screenshot analysis](../subtasks/03-pattern-search-and-ui-improvement/task-12-screenshot-analysis.md) — DONE
13. [Task 13 — E2E testing](../subtasks/03-pattern-search-and-ui-improvement/task-13-e2e-testing.md)
14. [Task 14 — Spec, plan, commit](../subtasks/03-pattern-search-and-ui-improvement/task-14-spec-plan-commit.md) — IN PROGRESS (spec and plan done; final atomic commit after fix waves)

Every task file carries its `Slug: pattern-search-and-ui-improvement - Task NN`
line, per the task instructions.

## Worker file boxes (disjoint; full table in spec file 03 §13)

- Coordinate worker: coords, StandardCanvas, RegionOverlay, white-box
  readImage functions, pattern-matching normalize, PatternCanvas sizing,
  sim canvas display mapping. No evaluator math, no threshold logic.
- Grayscale worker: vision_eval _to_grayscale only, white-box gray and
  threshold functions, threshold resolution in both pattern hooks and sim
  tolerances, score downsample/optical symmetry, vision_preprocess. No
  region geometry, no dispatch.
- Matcher/model/dispatch worker: atmel-chip-boxes, domain pattern-search,
  region parsing/writing in both pattern hooks, greyscale pattern tool,
  dispatcher, pattern-matching types, score _parse_roi and pattern_match
  window, evaluator pocket-slicing removal only. No canvas rendering, no
  sim internals.
- Simulation worker: greyscale simulation tool, carrier-tape-simulation
  files, conveyor simulation files. Never writes to real rule state.
- Layers/ROI-UX worker: editor layers files, layer DnD (diagnose, do not
  rewire blindly), RegionOverlay square lock only, toolbar gap in
  white-box and simulation tools, mask-region reorder in BoxReviewPanel.
  No evaluator math.
- Pin-one worker: pin1-config files, backend pin1_detection, carrier-tape
  evaluator Rule 1 section only (coordinated with simulation worker).
- Window-controls worker: Titlebar, titlebar-parts (new controls only),
  new shell-IPC module if created. No app-shell panel system, no run
  files, no packaging.
- Panel-chrome worker: PaletteFrame, palette-store, MinimizedRail. No
  workspace layout files (other system — coordinate, do not co-edit).
- Window-menu worker: WindowMenu, WindowMenubarGroup, layout-slice,
  panel-registry. No palette-store.
- Menu-performance worker: TopMenuBar, TopMenuGroup, TopMenuRows,
  TopMenuMnemonics, ui menubar. No Titlebar structure changes
  (single-header invariant locked by tests/e2e/playwright_single_header.py).
- Launcher worker: run.ps1, run.sh, run.config.json, wait-for-http
  scripts. No packaging installers, no src.
- Version-display worker: StatusBar, vite.config.ts (version injection
  only), version.json (read-only unless release). No package.json version
  field (release process owns it).
- Installer worker: packaging installers, bin/install-*.py,
  BE/app/installer_plan.py, installer tests. No run.ps1/run.sh, no
  BE/app/installer_path.py (02-cicd-remediation owns it).
- Shared read-only for all: src/styles.css (single owner for edits:
  menu-performance worker for menu changes; others request via spec).

Workers never run git commands. The parent commits and pushes.

## E2E scope (named flows only, per V7 R1)

Installation (clean-machine path), run via PS1 and via run.sh (including
-NoShell/--no-shell and browser behavior), pattern search end to end
including grayscale conversion and pin-one configuration. No other builds,
tests, or CI runs unless the user explicitly asks.

## Commit plan

- Stage commit (this plan): spec folder 01–05, readme, plan, subtasks.
  One gitmap commit, hyphen format, no colons, pushed to
  fix/4-oct-26-joy-optimization-and-project. Today is a Saturday, so the
  weekend exemption applies (commits anytime).
- Final atomic commit: all fix-wave changes plus E2E evidence, one gitmap
  commit, same format, after the fix waves. Two stage commits total, not
  per-task commits — this satisfies both the standing always-commit rule
  and the V7 no-history-pollution rule.
- On push rejection: pull --rebase and retry; resolve conflicts per the
  user's instruction (commit all with conflict resolve). Never rewrite
  pushed history (Lovable-connected repo: no force-push, rebase, or amend
  of pushed commits).

## Open questions (recorded in spec, not invented)

- "George" / "Yasi and George release": unattested, zero repo hits.
- Square ROI scope: search, pattern, masks, or all; enforced at draw,
  resize, or validation.
- Which grayscale path is reported broken: theme, mask, or pattern-match
  (spec file 02 §10 diagnostic answers this empirically).
- Parent spec §12 unknowns carried forward unanswered.

## Collisions

- Active RC Heatmap task 02-cicd-remediation: 03 workers avoid its files
  (linter-scripts, check-magic-strings.sh, BE/app/installer_path.py,
  SS-02 backend files, SS-04 app-shell baselines sequencing).
- Other agents on this branch: Yasin pushed 6f589ed6 "Ui redesigend and
  simulation" after the parent's 92369c36; merges and a CI/CD fix v2–v9
  series followed through 2026-10-15. Check remote before every worker
  wave; merge, do not chase.
- CI note: ci.yml triggers only on push to main plus PRs, so branch
  pushes run no CI. Main CI is red for pre-existing reasons (133 broken
  spec cross-links, pytest cv2 import, frontend lint/typecheck, backend
  ruff) — not caused by this task.
