---
title: Top bar polish (plan 30 step 59)
slug: top-bar-polish
plan: 30
step: 59
status: locked
---

# Top bar polish

## Purpose

Finalize the shell top bar so every top-bar surface is bound to real
store or persistence signals, not placeholder props. This closes the
last shell perimeter gap before layout gate green (step 60).

## Target file edits

```
src/components/editor/shell/EditorTopBar.tsx
src/components/editor/shell/TopBarTabs.tsx     # new
src/components/editor/shell/TopBarActions.tsx  # new
src/lib/editor/selectors/program.ts            # selectProgramName
```

Step 52 introduced `EditorTopBar.tsx` with props for name / tabs /
actions. Step 59 splits tabs and actions into siblings and wires them
to real signals.

## Program name

- Reads `selectProgramName()` from store; no prop drilling for name.
- `--text-hmi-title` weight 600, ellipsize with the console-open click
  pattern from the status strip (no `title=`).
- Prefixed by a `--ca-select` 8 px pill when the program has any dirty
  history entries (reads `selectSaveState() === 'dirty'`).

## Tabs (tablist)

Three tabs in fixed order: `Setup`, `Ops`, `Results`.

- `role="tablist"` with `aria-orientation="horizontal"`; each tab is
  `role="tab"` with `aria-selected`, roving tabindex, and a
  `<Link to>` navigation target (`/setup`, `/ops`, `/results`).
- Active state uses `--ca-select` ink and a 2 px `--ca-select`
  underline animated with `--motion-fast` + `--ease-standard`.
- Keyboard: Arrow Left/Right move focus, Home/End jump ends, Enter or
  Space activates the focused tab (which triggers navigation).
- Route mount syncs `aria-selected` from the current `Route.location`
  path prefix; no local state.
- Tab click emits `I_UI_NAV_TAB` with `{ from, to, correlationId }`.

## Actions

Two buttons on the right: `Save` (primary) and `Publish` (secondary).

- Save button:
  - Disabled when `selectSaveState() === 'saved'` and history undo
    stack is empty; label reads `Saved` in disabled state.
  - Otherwise enabled with label `Save`. Click dispatches through the
    persistence adapter (`adapter.write(serialize(state))`) and emits
    `I_UI_SAVE_CLICKED` alongside the existing `I_UI_PERSIST_WRITE`
    from the adapter itself.
  - On write failure, remains enabled and shows `Retry` label for the
    duration of the next `E_UI_PERSIST_WRITE` correlation window
    (until either success or user click).
- Publish button:
  - Stubbed for v1: click emits `I_UI_PUBLISH_STUB` and opens a
    `--elevation-3` dialog with body `"Publish is not yet
implemented."` and a single close button.
  - Never dispatches to the store or persistence; real publish lands
    outside plan 30.

Both buttons use `--text-hmi-header` weight 600, `--space-2` padding,
`--radius-md`, and consume `--elevation-1` chrome from the top bar.
Focus ring uses `--ca-focus-ring` at `--elevation-4`.

## Acceptance for step 59

- Program name renders from the store; toggling `dirty` toggles the
  8 px `--ca-select` pill.
- Navigating between `/setup`, `/ops`, `/results` moves the tab
  underline within one `--motion-fast` duration and never desyncs from
  the URL.
- Save button reflects `saved` / `dirty` / `saving` states across a
  full ribbon-driven kind switch and matching persistence write.
- Publish button opens the stub dialog on click and closes on Escape,
  emitting `I_UI_PUBLISH_STUB` exactly once per open.
- Tab keyboard model passes: Left/Right, Home/End, Enter/Space.
- Guards G-TOPBAR-01..03 pass on new files.

## Regression guards (delta)

```bash
# G-TOPBAR-01: no local navigation state (tabs read Route.location)
rg -nE "useState[^)]*(active|current|tab)" src/components/editor/shell/TopBarTabs.tsx

# G-TOPBAR-02: no title= tooltip fallback in top bar
rg -n "title=" src/components/editor/shell

# G-TOPBAR-03: Publish is stubbed; never touches store or persistence
rg -nE "dispatch|adapter\.write" src/components/editor/shell/TopBarActions.tsx | rg -v "Save"
```

Expected: G-TOPBAR-01 empty; G-TOPBAR-02 empty; G-TOPBAR-03 shows
matches only inside the Save-button branch.

## Decision

Top bar is wired to real signals: program name + dirty pill from
selectors, tablist from `Route.location`, Save button through
persistence adapter with `saved`/`dirty`/`saving`/`Retry` label
transitions, and Publish as an `I_UI_PUBLISH_STUB`-only dialog. Step 60
(layout gate green) may now run every G-\* guard across shell code.
