---
title: Shell grid + top bar shell (plan 30 step 52)
slug: shell-grid-topbar
plan: 30
step: 52
status: locked
---

# Shell grid + top bar shell

## Purpose

Land the first physical implementation surface: the editor shell grid
that mounts inside `src/routes/setup.tsx` (and `setup.roi.tsx`,
`setup.reference.tsx` via the same layout route). Every subsequent step
(ribbon 53, rail 54, status 55, canvas 61+) mounts into named slots
declared here. This note is the exact file diff contract.

## Target files (new)

```
src/components/editor/shell/
  EditorShell.tsx          # grid host + slot props
  EditorTopBar.tsx         # 48 px top bar
  index.ts                 # barrel: EditorShell, EditorTopBar
```

`EditorShell` accepts named slot children: `topBar`, `ribbon`, `rail`,
`status`, and `children` for the canvas region. No default content;
missing slot => empty region (still occupies its budgeted dimension).

## Grid contract (matches `_notes/layout-budget-gate.md`)

```
grid-template-rows: 48px 1fr 28px           /* top bar / body / status */
grid-template-columns: 56px 1fr 320px       /* ribbon / canvas / rail */
```

Body row spans ribbon | canvas | rail. Top bar and status span full
width. `wide` (>=1440 px) and `compact` (1024-1439 px) share identical
dimensions; `compact` only shifts rail section-header typography per the
layout gate. Below 1024 px the shell renders the
`min-viewport-unsupported` message and skips grid mount.

## Top bar contract

- Height exactly 48 px, background `--ca-chrome`, ink `--ca-chrome-ink`.
- Three slots single-row: left = program name + `--text-hmi-title`;
  center = breadcrumb tabs (Setup / Ops / Results) with active state
  `--ca-select`; right = actions (Save / Publish) driven by callback
  props, never internal state.
- Elevation `--elevation-1`, bottom border `1px --ca-border`.
- Motion `--motion-fast` with `--ease-standard` for tab underline.
- `role="banner"` landmark; tabs are `role="tablist"` with roving
  tabindex; ESC returns focus to program name.

## Slot budget (bytes / children policy)

| Slot     | Max direct children                      | Owner          |
| -------- | ---------------------------------------- | -------------- |
| topBar   | 1 (`<EditorTopBar />` or custom)         | shell consumer |
| ribbon   | 1 (`<ToolRibbon />`)                     | step 53        |
| rail     | 1 (`<RightRail />`)                      | step 54        |
| status   | 1 (`<StatusStrip />`)                    | step 55        |
| children | 1 (`<CanvasWorkspace />` or placeholder) | step 61+       |

`EditorShell` MUST NOT render fallbacks for missing slots (no "Coming
soon" cards). Consumers pass explicit placeholders during phased rollout.

## Route wiring

`src/routes/setup.tsx` swaps its existing `HmiShell` body for
`EditorShell` under a feature flag `editor.shell.v2` (default off in
`src/lib/persist.ts` flags). Legacy `HmiShell` remains until step 60
(shell gates green) then is removed. Flag reads happen in the route
component, not deep in the tree.

## Error boundary

`<EditorErrorBoundary>` wraps the shell body; route-level error boundary
already lives in `errorComponent`. Both log `E_UI_EDITOR_SHELL_CRASH`
with `correlation_id` and last selection state via the future
`src/lib/editor/errors.ts` logger; for step 52 the logger is stubbed to
`console.error` inside the boundary file only (guard-allowlisted here,
banned everywhere else).

## Acceptance for step 52

- `src/components/editor/shell/{EditorShell,EditorTopBar,index}.tsx`
  exist and export the named types.
- Setting `editor.shell.v2=true` renders the 3-row / 3-col grid with
  visibly empty ribbon / rail / status regions at their locked
  dimensions.
- Top bar renders program name + tabs + save/publish action props.
- Guards G-LAYOUT-01..03 pass on the new files.
- No console errors on route mount; the shell crash log fires only when
  a slot throws.

## Regression guards (delta from layout gate)

```bash
# G-SHELL-01: grid dimensions are token-locked, not arbitrary
rg -nE "grid-template-(rows|columns).*(px|fr)" src/components/editor/shell

# G-SHELL-02: no default slot fallbacks
rg -nE "Coming soon|Placeholder|TODO" src/components/editor/shell

# G-SHELL-03: shell crash logs E_UI_EDITOR_SHELL_CRASH
rg -n "E_UI_EDITOR_SHELL_CRASH" src/components/editor/shell
```

Expected at step 52 land: G-SHELL-01 matches once per template line;
G-SHELL-02 empty; G-SHELL-03 has one match in the boundary file.

## Decision

Shell grid + top bar are locked at 3 rows x 3 cols with 48 / 1fr / 28
row heights and 56 / 1fr / 320 column widths, 5 named slots with no
fallbacks, banner top bar with tablist center, and one shell-crash log
code. Step 53 (tool ribbon chips) may mount into the `ribbon` slot.
