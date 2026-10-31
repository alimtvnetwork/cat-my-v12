# Task 08 — Menu delay, glitches, browser auto-open

Slug: pattern-search-and-ui-improvement - Task 08

Status: PENDING (spec done, fix not started).

## Spec

Spec file 03 §2 (blank render), §3 (menus), §4 (browser auto-open).

## Scope

- Menus: honor 02-spec/24-app-ui-design-system/40-menu-anti-jitter.md
  (no hover layout shift; MenuItem only primitive; fixed tokens). The
  recorded menu cause is jitter, NOT open latency.
- Open latency is UNMEASURED: instrument menu-open timing (open request
  to first paint) before claiming any cause. Verification items:
  titlebar re-render storm, backdrop-blur over repainting canvases,
  Radix portal plus enter animation on a busy main thread.
- Blank simulation render: hatch plus message empty states, never a
  blank box (folder 26 preview doctrine).
- Browser auto-open: single source of truth (see Task 07).

## File box (disjoint)

Menu-performance worker: `src/components/nav/TopMenuBar.tsx`,
`src/components/nav/TopMenuGroup.tsx`,
`src/components/nav/TopMenuRows.tsx`,
`src/components/nav/TopMenuMnemonics.tsx`,
`src/components/ui/menubar.tsx`. No Titlebar structure changes
(single-header invariant locked by
tests/e2e/playwright_single_header.py). Shared read-only:
`src/styles.css` (menu worker owns menu-related edits).

## Acceptance

- [ ] Menu-open timing measured before and after; latency cause stated
  from evidence, not assumed.
- [ ] No hover layout shift (anti-jitter contract holds).
- [ ] Simulation view never renders blank.
