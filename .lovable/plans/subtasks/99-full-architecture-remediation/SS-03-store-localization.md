# SS-03 — Zustand Store Localization

Parent: 99-full-architecture-remediation
Slug: SS-03-store-localization
Status: pending
Created: 2026-08-17

## Goal

Audit all 11 Zustand stores in `src/lib/stores/`. Stores that are only
consumed within a single layout tree (editor, HMI) are converted to React
Contexts scoped to that layout component. Stores that are genuinely cross-tree
global remain as Zustand.

## Current Stores Inventory

| File                        | Current consumers (grep)              | Decision        |
| --------------------------- | ------------------------------------- | --------------- |
| `capture-history-store.ts`  | HMI components only                   | Localize        |
| `favorites-store.ts`        | Nav, home — cross-tree                | Keep global     |
| `palette-store.ts`          | Editor shell only                     | Localize        |
| `program-store.ts`          | Editor + HMI                          | Keep global     |
| `recent-projects-store.ts`  | Home page only — but very lightweight | Keep (minimal)  |
| `run-store.ts`              | HMI + editor                          | Keep global     |
| `running-ops-store.ts`      | HMI + project run button              | Keep global     |
| `shortcuts-store.ts`        | Editor shell only                     | Localize        |
| `ui-prefs-store.ts`         | Many trees — cross-tree               | Keep global     |
| `errorStore.ts`             | Global error modal — cross-tree       | Keep global     |
| `reference-image-store.ts`  | Editor canvas + settings              | Keep global     |

Stores to localize: `capture-history-store`, `palette-store`, `shortcuts-store`.

## Steps

### SS-03-01: Audit capture-history-store consumers
Run `grep -r "capture-history-store" src/` to enumerate every import.
Verify all are within `src/components/hmi/` or `src/routes/` HMI route subtree.

### SS-03-02: Create HmiContext
Create `src/contexts/HmiContext.tsx`. Move `capture-history-store`'s state and
actions into a React `useReducer` or simple `useState` context. Export
`HmiProvider` and `useHmiContext`. Follow the 100-line `.tsx` cap
(`.lovable/coding-guidelines.md` §6).

### SS-03-03: Mount HmiProvider
Wrap the HMI layout component (`src/components/hmi/HmiShell.tsx`) with
`<HmiProvider>`. Remove the Zustand store import from all HMI components and
replace with `useHmiContext()`.

### SS-03-04: Delete capture-history-store.ts
Delete `src/lib/stores/capture-history-store.ts`. Run `npx tsc --noEmit`
to confirm zero broken imports.

### SS-03-05: Audit palette-store consumers
Run `grep -r "palette-store" src/` to enumerate every import. Verify all
are within the editor shell subtree.

### SS-03-06: Create EditorContext (palette slice)
Add a `palette` slice to `src/contexts/EditorContext.tsx` (create if not exists).
Move palette state (open panel ID, floating window positions) into this context.
Export `EditorProvider` and `usePaletteContext`.

### SS-03-07: Mount EditorProvider
Wrap `src/components/editor/shell/EditorShell.tsx` with `<EditorProvider>`.
Replace all `usePaletteStore()` calls with `usePaletteContext()`.

### SS-03-08: Audit shortcuts-store consumers
Run `grep -r "shortcuts-store" src/` to enumerate. Verify all are editor-only.

### SS-03-09: Add shortcuts slice to EditorContext
Add a `shortcuts` slice to `EditorContext.tsx`. Move shortcuts state into it.
Replace all `useShortcutsStore()` calls with `useShortcutsContext()`.

### SS-03-10: Delete localized stores
Delete `src/lib/stores/capture-history-store.ts`,
`src/lib/stores/palette-store.ts`, `src/lib/stores/shortcuts-store.ts`.

### SS-03-11: Typecheck
Run `npx tsc --noEmit`. Errors must be zero.

### SS-03-12: Verify runtime behavior
Run dev server; navigate to editor and open palettes + shortcut dialog.
Confirm they work. Navigate to HMI and trigger a capture. Confirm history
stores correctly. No console errors.

## Acceptance Criteria

- `grep -r "usePaletteStore\|useShortcutsStore\|useCaptureHistoryStore" src/` returns zero.
- `src/lib/stores/` contains exactly 8 files (down from 11).
- `npx tsc --noEmit` exits 0.
- Editor palette and shortcuts work in dev. HMI capture history works.
