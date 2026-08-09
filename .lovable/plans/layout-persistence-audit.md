# Layout persistence audit

Plan 65 step 22 (revised at v3.359.0). Snapshot of every `localStorage` key that survives reloads and shapes the workspace's on-screen state, plus a matrix of which panel operations MUST preserve that persisted state and which are allowed to reset it. Written so a future dev can answer "why did my layout come back / not come back after a refresh" without grepping the repo.

## Persistence contract at a glance

Storage key: `workspace-layout:v1` (localStorage). Zustand persist middleware, schema version **2** (bumped when the tools panel default moved from top to left). Written by `src/lib/workspace/layout-slice.ts` via `partialize: (state) => ({ panels, dockSizes })`.

What lives inside `panels[id]` (per panel):

| Field          | Type                                                               | Persisted | Notes                                                                                                                    |
| -------------- | ------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------ |
| `open`         | boolean                                                            | yes       | `closePanel` sets false; `openPanel`/`togglePanel` restore.                                                              |
| `dock`         | `"top" \| "left" \| "right" \| "bottom" \| "floating" \| "hidden"` | yes       | Written by `dockPanel` and `floatPanel`.                                                                                 |
| `minimized`    | boolean                                                            | yes       | Toggled by `minimizePanel` / `restorePanel`.                                                                             |
| `order`        | number                                                             | yes       | Stable index inside a dock.                                                                                              |
| `floatingRect` | `{x,y,width,height}` \| undefined                                  | yes       | Only meaningful when `dock === "floating"`. Preserved when the panel is re-docked so re-floating restores the same rect. |

What lives inside `dockSizes` (shared, one entry per slot):

| Slot   | Default (px) | Min | Max | Notes                                                                   |
| ------ | ------------ | --- | --- | ----------------------------------------------------------------------- |
| top    | 96           | 84  | 180 | Only used when a panel is docked top.                                   |
| left   | 140          | 96  | 800 | Left min was lowered to fit the compact Tools toolbox.                  |
| right  | 360          | 200 | 800 | Hosts wide list panels (Rules, Layers, Properties, Detectors, Preview). |
| bottom | 220          | 200 | 800 | Console, History.                                                       |

Schema version bumps discard prior state on merge. Current version is `2`; do NOT reuse `1`. Every future default-dock change to a panel that ships opened by default must bump the version so returning users see the new default instead of a stale slot.

## Registry vs. reality

Central registry: `src/lib/constants/storage.ts` (`StorageKey`). Every key that appears here is guaranteed to be imported by name (never inlined).

Stores that DO use the registry:

- `StorageKey.UiPrefs` -> `src/lib/ui-prefs-store.ts`
- `StorageKey.Shortcuts` -> `src/lib/shortcuts-store.ts`
- `StorageKey.ActiveProgram` -> `src/lib/program-store.ts`
- `StorageKey.CaptureHistory` -> `src/lib/capture-history-store.ts`
- `StorageKey.CameraControls` -> `src/lib/camera/capture-bridge.ts`
- `StorageKey.SampleSelection` -> `src/components/hmi/ViewportImageControls.tsx`
- `StorageKey.ReferenceImage` -> `src/lib/reference-image-store.ts`
- `StorageKey.EditorPreviewMode`, `StorageKey.EditorPreviewDebugOverlay` -> `src/lib/editor/preview-mode-store.ts`
- `StorageKey.ProjectsListPrefs` -> `src/routes/projects.index.tsx`
- `StorageKey.CaptureRequestPanelCollapsed` -> `CaptureRequestDebugPanel`

Stores that DO NOT use the registry (drift):

| Key literal             | File                                                       | Notes                                                                                                                                                                                      |
| ----------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `workspace-layout:v1`   | `src/lib/workspace/layout-slice.ts` (`LAYOUT_STORAGE_KEY`) | Dock slot arrangement + dock sizes. Exported const, tested in `layout-slice.test.ts`. Persist middleware `version: 2`. Should be surfaced in the registry as `StorageKey.WorkspaceLayout`. |
| `palette.layout.v1`     | `src/lib/palette-store.ts` (`STORE_KEY`)                   | Per-palette dock/float/min/max/hidden state. Read by every `PaletteFrame`. Also should move to the registry.                                                                               |
| `ca.recent-projects.v1` | `src/lib/recent-projects-store.ts`                         | Recent projects list. Home CTA depends on it.                                                                                                                                              |
| `ca:projects:v1`        | `src/lib/projects/store.ts`                                | Full projects store.                                                                                                                                                                       |
| `ca.favorites`          | `src/lib/favorites-store.ts`                               | Favorite tools list. No version suffix (risk: shape change breaks silently).                                                                                                               |

## Operation matrix: what MUST NOT break persistence

Every reducer in `layout-slice.ts` is expected to keep `partialize` output valid so the next refresh restores the same on-screen arrangement. The invariants below are load-bearing: if any of them regresses, users lose their workspace on reload.

| Operation                                   | Must persist                                                                                                                | Must not persist / must reset                                                                                                |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `openPanel(id)`                             | `open=true`, previous `dock`, previous `floatingRect`, `order`, `minimized`.                                                | Nothing. Reopen must not silently redock.                                                                                    |
| `closePanel(id)`                            | `dock`, `floatingRect`, `order`.                                                                                            | `open=false`; do NOT clear `dock` or `floatingRect` so reopening lands in the same slot.                                     |
| `togglePanel(id)`                           | Same as open/close.                                                                                                         | Never mutates `dock` or `floatingRect`.                                                                                      |
| `dockPanel(id, slot)`                       | new `dock`, `open=true`, `minimized=false`, preserved `floatingRect` (for later re-float).                                  | If `slot === "floating"`, do not clobber a valid `floatingRect`; only overwrite when re-floating with a fresh rect.          |
| `floatPanel(id, rect)`                      | `dock="floating"`, `floatingRect=rect`, `open=true`, `minimized=false`.                                                     | Do not drop the previous docked slot until the user re-docks.                                                                |
| `minimizePanel(id)`                         | `minimized=true`, `dock`, `floatingRect`, `order`.                                                                          | Never mutates `open` (a minimized panel is still open).                                                                      |
| `restorePanel(id)`                          | `minimized=false`, everything else unchanged.                                                                               | Never mutates `dock`.                                                                                                        |
| `collapseOthers(id)`                        | Every other panel's `dock`, `floatingRect`, `order`, `open`.                                                                | Only mutates `minimized`.                                                                                                    |
| `setDockSize(slot, px)`                     | Clamped size in `dockSizes[slot]`.                                                                                          | Never mutates any panel; must not force a panel out of a slot.                                                               |
| Drag redock (`PanelHost` -> `dockPanel`)    | Same as `dockPanel`.                                                                                                        | Must not lose `floatingRect` if the source was floating; must not reorder unrelated panels.                                  |
| Drag tear-off (`PanelHost` -> `floatPanel`) | Same as `floatPanel`. Clamps rect to `[DEFAULT_FLOAT_WIDTH..MAX_FLOAT_WIDTH]` x `[DEFAULT_FLOAT_HEIGHT..MAX_FLOAT_HEIGHT]`. | Must not spawn a floating window smaller than the drag threshold (`DRAG_OUT_THRESHOLD_PX = 24`); those gestures stay docked. |
| `resetLayout()`                             | Nothing from the previous session.                                                                                          | Explicitly wipes `panels` and `dockSizes` back to registry defaults.                                                         |
| Persist version bump                        | Everything else the user has.                                                                                               | Whole `workspace-layout:v1` payload is discarded on load. Only use for breaking default changes.                             |

### Non-reducer invariants

1. `partialize` must always emit BOTH `panels` and `dockSizes`. Emitting one without the other on a merge silently resets the missing half.
2. `merge()` must clamp every `dockSizes[slot]` through `clampDockSize` so a stale persisted 220px for `left` (from v1) collapses to the new 96..800 range without exceptions. This is how the v1 -> v2 transition survives partial migrations.
3. Panels not present in the registry (deleted or renamed) must be pruned in `merge()` and emit `E_PANEL_UNKNOWN_ID`. Never let them tombstone in storage.
4. Panels added to the registry after a save must inherit `defaultDock` / `defaultOpen` on merge, never `undefined`.
5. A floating panel's rect must round-trip through JSON without NaN (write-time guard is `Number.isFinite` in `clampDockSize`; there is no equivalent for `floatingRect`, so reducers must never assign non-finite coords).

## Persistence coverage per workspace surface

- Docked / floating / minimized / hidden panel state: `workspace-layout:v1` (`panels[id]`). Includes `floatingRect` so torn-out panels return to the same spot.
- Palette layout (legacy, older screens only): `palette.layout.v1` (palette-store). Reset via `usePaletteStore().reset()` from `ResetLayoutButton` (confirm dialog since step 18). Reset does NOT touch `workspace-layout:v1`; that keeps dock slot ownership.
- Dock slot sizes (left/right widths, top/bottom heights): `workspace-layout:v1` (`dockSizes`). Written on `pointerup` of the DockSlot resize handle so one gesture writes one entry.
- Editor preview mode + debug overlay: `editor.previewMode.v1`, `editor.previewDebugOverlay.v1`.
- Layers panel: no persisted expand/collapse or selection. Selection is per-session route state.
- Right rail width / left dock width: persisted as of Plan 65 step 35 via `dockSizes` (see above).
- Getting Started checklist: no persisted "seen"/"dismissed" flag. Recomputed from data each render.
- Reference image + sample selection: `ca.referenceImage.v1`, `ca.sample.selection.v1`.
- Shortcuts overrides: `ca.shortcuts.v1`.
- UI prefs (theme, density, etc.): `ca.uiPrefs.v1`.

## Reset scopes today

- `usePaletteStore().reset()` -> only `palette.layout.v1`.
- `useWorkspaceLayoutStore.getState().resetLayout()` -> `workspace-layout:v1` (`panels` + `dockSizes`). Wired to the top-bar Reset Layout button.
- No "reset app" that wipes every `StorageKey.*` at once. Would be useful for support / repro.

## Verification checklist

Run these before shipping any change to `layout-slice.ts`, `PanelHost.tsx`, `DockSlot.tsx`, or `panel-registry.ts`:

1. `bunx vitest run src/lib/workspace/__tests__/layout-slice.test.ts` (reducer contract).
2. `bunx vitest run src/components/app-shell/panels/__tests__` (drag/dock/float integration).
3. Manual: open the editor, dock Tools left, drag it out to float, close it, refresh -> reopen from Window menu; it should return floating at the same rect.
4. Manual: resize left dock to a non-default width, refresh -> width persists; call Reset Layout -> width returns to `DEFAULT_DOCK_SIZES.left`.
5. If `panel-registry.ts` changed a `defaultDock` for a `defaultOpen: true` panel, confirm the persist `version` was bumped in the same PR.

## Follow-up items (not shipped in this step)

1. Move `LAYOUT_STORAGE_KEY`, `palette.layout.v1`, `ca.recent-projects.v1`, `ca:projects:v1`, `ca.favorites` into `StorageKey`. Import by name at each call site.
2. Add `.vN` suffix to `ca.favorites` (currently unversioned).
3. Rename the localStorage key from `workspace-layout:v1` to `workspace-layout:v2` to match the persist schema version, and add a one-time migration read of the v1 key. Until then, "v1" in the key is a lie; only the persist middleware's internal `version` field is authoritative.
4. Add a `resetAll()` helper that iterates `ALL_STORAGE_KEYS` plus the drift keys above and reloads. Wire into Settings > Support.
5. Consider persisting the currently-focused floating panel z-order so restacking survives reload.

No user-facing behavior changes come from this document. It is the reference for reviewers of any change that touches dock, float, minimize, close, or resize behavior.
