# UI v3 Open Ambiguities (Plan 66)

Created: 2026-07-17
Parent plan: `.lovable/plans/pending/66-ui-v3-missing-completion.md`
Prior list: `.lovable/ambiguity-questions/01-ui-v2-open-questions.md`

Each entry: `Q<n>. <question>` followed by `Options:` and `Blocking:` (yes/no + which plan step).

## Resolution log (plan 66 step 2)

Date: 2026-07-17. Defaults accepted for every non-blocking question and for
the blocking questions where the default is a safe, minimum-scope option
that lets later steps proceed without new backend or worker work. Q3, Q5,
Q9 stay at their in-file defaults.

- Q1: (b) re-importable but reformatted. Rationale: a lossless YAML twin
  requires round-tripping JSON comments/order that we do not store, so (b)
  is the only honest option today. Step 8 ships (b).
- Q2: (c) placeholder zip that emits JSON labeled `.sqlite.zip` and warns.
  Rationale: sql.js pulls a 1MB+ WASM into the client bundle for one export
  path; defer until the desktop worker exists. Step 9 ships (c) and the
  SQLite row stays MISSING (not DEFERRED) so it re-surfaces when the
  desktop worker lands.
- Q3: (b) shadcn Command primitive. Default accepted.
- Q4: (c) hybrid, history first, route-parent fallback. Rationale: matches
  browser expectation on normal navigation and still gives a sensible target
  when the app is opened directly on a deep link.
- Q5: (b) vertical stack. Default accepted.
- Q6: (a) ZXing WASM in browser. Rationale: no backend exists yet, and (b)
  would block the primitive indefinitely. Fallback path is a future concern.
- Q7: (b) client heuristic (edge variance). Rationale: (a) leaves the row
  MISSING for the whole plan window; (b) produces a real pass/fail that
  the worker can replace later without changing the rule schema.
- Q8: (b) new runs only. Rationale: retro-apply mutates historical run
  results, which breaks reproducibility. New-runs-only is the safe default
  and can be upgraded to (c) later without a data migration.
- Q9: (a) per user with a "reset for this project" action. Default accepted.
- Q10: (a) GitHub Actions in `.github/workflows/ci.yml`.

## Q1. YAML vs JSON parity scope

Do YAML exports need to be a lossless twin of JSON (same field order, same comments) or only a lossy but re-importable view?

Options: (a) lossless twin, (b) re-importable but reformatted, (c) YAML read-only preview.
Blocking: yes for step 8 (YAML serializer).

## Q2. SQLite-zip while there is no backend

The web build has no SQLite. Should the "SQLite zip" export be produced client-side from an in-memory sql.js DB, or deferred entirely until the desktop worker exists?

Options: (a) sql.js in browser, (b) deferred until desktop, (c) placeholder that emits a JSON zip labeled ".sqlite.zip" and warns.
Blocking: yes for step 9. If (b) the row is DEFERRED not MISSING.

## Q3. Command palette provider

Ship a bespoke `cmdk`-based palette or reuse `shadcn/ui` command primitive?

Options: (a) `cmdk`, (b) shadcn Command component, (c) build in-house.
Blocking: no. Default to (b) unless overridden.

## Q4. Back-button semantics

Should Back replay the exact history stack (browser semantics) or a route-map "parent" for nested routes?

Options: (a) history.back, (b) route-parent, (c) hybrid: history first, parent fallback.
Blocking: yes for step 4.

## Q5. Floating pill: one process at a time or a stack?

If two long-running jobs run in parallel (validate + run) should the pill split, stack, or queue?

Options: (a) one at a time, (b) vertical stack, (c) merge into one pill with a switcher.
Blocking: no. Default (b).

## Q6. Barcode / QR engine

Client-side (ZXing WASM) or backend-only?

Options: (a) ZXing WASM in browser, (b) backend only, (c) both with fallback.
Blocking: yes for step 15 (Barcode primitive).

## Q7. Flaw detection heuristic without a worker

Until the Python worker exists, does Flaw Detection ship as a placeholder that only records the ROI, or as a client-side heuristic (edge variance) that produces a real pass/fail?

Options: (a) placeholder, (b) client heuristic, (c) block until worker.
Blocking: yes for step 14.

## Q8. Category auto-apply resolver

When a rule set moves categories, do we retro-apply the change to all projects that reference that category or only new runs?

Options: (a) retro-apply, (b) new runs only, (c) prompt per project.
Blocking: yes for step 20 (PR-05).

## Q9. Panel layout persistence per user vs per project

Panel layout state persists in localStorage today. Should it move to per-project so different projects remember different arrangements?

Options: (a) per user, (b) per project, (c) per user with per-project override.
Blocking: no. Default (a) with a "reset for this project" action.

## Q10. CI provider

Which CI runs the pipeline: GitHub Actions, GitLab CI, or the Lovable Cloud runner?

Options: (a) GitHub Actions in `.github/workflows/ci.yml`, (b) other, (c) already present, please point me at it.
Blocking: yes for step 29 (CI wiring).
