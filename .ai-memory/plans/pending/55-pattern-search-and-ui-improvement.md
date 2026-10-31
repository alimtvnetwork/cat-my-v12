# Plan — 55-pattern-search-and-ui-improvement

Slug: pattern-search-and-ui-improvement
Spec: 02-spec/21-app/55-pattern-search-and-ui-improvement/readme.md
Status: analysis wave running; implementation waves follow.

## Subtasks

- 01-screenshot-extraction — download the 10 owner prnt.sc links to
  assets/screenshots/, verify valid images, record what each shows.
  Slug: pattern-search-and-ui-improvement - Task 01
- 02-pattern-search-root-cause — why simulation-created patterns land
  in the wrong place, why search finds the wrong pattern / goes in
  different ways, layer move + rectangle/region creation failures,
  selection + validation failures in simulation. Compare Yasin baseline
  and George release; name the single root cause chain. Read-only.
  Slug: pattern-search-and-ui-improvement - Task 02
- 03-grayscale-luminance — trace the color-to-gray conversion path,
  why grayscale does not convert colors properly, which luminance
  features are dead and why, Pin 1 configuration impact. Read-only.
  Slug: pattern-search-and-ui-improvement - Task 03
- 04-ui-window-install-run — window buttons (close/minimize/maximize)
  in --app mode, menu drop-down open delay, browser auto-open on run,
  missing version display, PS1 + run shell correctness, run-method
  efficiency, installation gaps. Verify spec 54 fixes first; report
  what remains. Read-only.
  Slug: pattern-search-and-ui-improvement - Task 04
- 05-yasin-history-review — review Yasin's past pattern-search
  implementations (branches, commits, PRs): what worked, what changed
  when simulation was added, what the repeated root-cause mentions
  were. Read-only.
  Slug: pattern-search-and-ui-improvement - Task 05
- 06-improvement-lists — compile the 100 improvement possibilities
  and the 200 pattern-search layering possibilities from waves 01–05,
  enumerated and prioritized, into spec sections 11–12.
  Slug: pattern-search-and-ui-improvement - Task 06
- 07-implementation-wave-1 — pattern search + layers + ROI square +
  toolbars/icons + selection/validation fixes (top priority from
  sections 11–12).
  Slug: pattern-search-and-ui-improvement - Task 07
- 08-implementation-wave-2 — grayscale + luminance + Pin 1 fixes.
  Slug: pattern-search-and-ui-improvement - Task 08
- 09-implementation-wave-3 — window controls + menu speed + browser
  auto-open + version display + PS1/shell + install + run speed.
  Slug: pattern-search-and-ui-improvement - Task 09
- 10-e2e-tests-build-ci — build fix, E2E tests, CI green, morning
  report input (spec end section).
  Slug: pattern-search-and-ui-improvement - Task 10
