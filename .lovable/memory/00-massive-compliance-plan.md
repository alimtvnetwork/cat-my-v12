# Codebase Massive Compliance Remediation Plan

> **Goal:** 400+ step remediation plan to enforce all coding guidelines strictly across the entire codebase.
> **Instructions for Sub-agents:** Do NOT skip the checklists. Apply strict V2 newline and Enum namespace rules. Commit after each step.

## Step 01
**Target Files:**
- `src/components/a11y/LiveAnnouncer.tsx`
- `src/components/app-shell/AppBreadcrumb.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 01 remediation`.

## Step 02
**Target Files:**
- `src/components/app-shell/HistoryNav.tsx`
- `src/components/app-shell/LayoutHotkeys.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 02 remediation`.

## Step 03
**Target Files:**
- `src/components/app-shell/LightingReadout.tsx`
- `src/components/app-shell/nav.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 03 remediation`.

## Step 04
**Target Files:**
- `src/components/app-shell/PaletteFrame.tsx`
- `src/components/app-shell/panels/DockableFrame.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 04 remediation`.

## Step 05
**Target Files:**
- `src/components/app-shell/panels/DockSlot.tsx`
- `src/components/app-shell/panels/FloatingWindow.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 05 remediation`.

## Step 06
**Target Files:**
- `src/components/app-shell/panels/index.ts`
- `src/components/app-shell/panels/MinimizedRail.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 06 remediation`.

## Step 07
**Target Files:**
- `src/components/app-shell/panels/PanelChrome.tsx`
- `src/components/app-shell/panels/PanelHost.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 07 remediation`.

## Step 08
**Target Files:**
- `src/components/app-shell/panels/__tests__/DockableFrame.test.tsx`
- `src/components/app-shell/panels/__tests__/PanelChrome.test.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 08 remediation`.

## Step 09
**Target Files:**
- `src/components/app-shell/PanelSearchPalette.tsx`
- `src/components/app-shell/ProjectRunButton.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 09 remediation`.

## Step 10
**Target Files:**
- `src/components/app-shell/RunningPill.tsx`
- `src/components/app-shell/RunningPillSlot.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 10 remediation`.

## Step 11
**Target Files:**
- `src/components/app-shell/SetupTiles.tsx`
- `src/components/app-shell/sidebar.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 11 remediation`.

## Step 12
**Target Files:**
- `src/components/app-shell/SkipToContentLink.tsx`
- `src/components/app-shell/StandardAppShellNav.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 12 remediation`.

## Step 13
**Target Files:**
- `src/components/app-shell/WindowMenu.tsx`
- `src/components/app-shell/__tests__/AppBreadcrumb.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 13 remediation`.

## Step 14
**Target Files:**
- `src/components/app-shell/__tests__/HistoryNav.test.tsx`
- `src/components/app-shell/__tests__/nav.test.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 14 remediation`.

## Step 15
**Target Files:**
- `src/components/app-shell/__tests__/sidebar.test.tsx`
- `src/components/BugErrorModal.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 15 remediation`.

## Step 16
**Target Files:**
- `src/components/camera/CaptureRequestDebugPanel.tsx`
- `src/components/cli/AgentLogo.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 16 remediation`.

## Step 17
**Target Files:**
- `src/components/cli/CliRouteError.tsx`
- `src/components/cli/CliRouteNotFound.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 17 remediation`.

## Step 18
**Target Files:**
- `src/components/cli/copy-envelope-button.tsx`
- `src/components/cli/CorrelationIdChip.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 18 remediation`.

## Step 19
**Target Files:**
- `src/components/cli/DeveloperPreferences.tsx`
- `src/components/cli/DoctorPanel.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 19 remediation`.

## Step 20
**Target Files:**
- `src/components/cli/EmptyState.tsx`
- `src/components/cli/envelope-viewer.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 20 remediation`.

## Step 21
**Target Files:**
- `src/components/cli/ExitEnvelopeDrawer.tsx`
- `src/components/cli/ExportSessionButton.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 21 remediation`.

## Step 22
**Target Files:**
- `src/components/cli/GlobalCliStatusWidget.tsx`
- `src/components/cli/ListSkeleton.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 22 remediation`.

## Step 23
**Target Files:**
- `src/components/cli/LiveRegion.tsx`
- `src/components/cli/status-pill.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 23 remediation`.

## Step 24
**Target Files:**
- `src/components/cli/UserConfigForm.tsx`
- `src/components/cli/__tests__/AgentLogo.test.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 24 remediation`.

## Step 25
**Target Files:**
- `src/components/common/EmptyState.tsx`
- `src/components/common/EmptyStateIllustrations.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 25 remediation`.

## Step 26
**Target Files:**
- `src/components/common/HintTooltip.tsx`
- `src/components/data-source/DataSourceToggle.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 26 remediation`.

## Step 27
**Target Files:**
- `src/components/data-source/__tests__/DataSourceToggle.test.tsx`
- `src/components/diagnostics/SeedGapCheckSection.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 27 remediation`.

## Step 28
**Target Files:**
- `src/components/diagnostics/SeedResetHistorySection.tsx`
- `src/components/editor/canvas/AlignmentGuides.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 28 remediation`.

## Step 29
**Target Files:**
- `src/components/editor/canvas/AngleZoneOverlay.tsx`
- `src/components/editor/canvas/CanvasViewport.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 29 remediation`.

## Step 30
**Target Files:**
- `src/components/editor/canvas/index.ts`
- `src/components/editor/canvas/SelectionOverlay.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 30 remediation`.

## Step 31
**Target Files:**
- `src/components/editor/canvas/SnapDebugHud.tsx`
- `src/components/editor/canvas/ValidationHighlightOverlay.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 31 remediation`.

## Step 32
**Target Files:**
- `src/components/editor/CollapsibleSection.tsx`
- `src/components/editor/design-mode/compile-shape.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 32 remediation`.

## Step 33
**Target Files:**
- `src/components/editor/design-mode/DesignModeOverlay.tsx`
- `src/components/editor/design-mode/image-import.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 33 remediation`.

## Step 34
**Target Files:**
- `src/components/editor/design-mode/svg-import.ts`
- `src/components/editor/design-mode/svg-path.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 34 remediation`.

## Step 35
**Target Files:**
- `src/components/editor/design-mode/__tests__/compile-shape.test.ts`
- `src/components/editor/FloatingInspector.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 35 remediation`.

## Step 36
**Target Files:**
- `src/components/editor/index.ts`
- `src/components/editor/InspectorPanel.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 36 remediation`.

## Step 37
**Target Files:**
- `src/components/editor/InspectorSurface.tsx`
- `src/components/editor/layers/index.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 37 remediation`.

## Step 38
**Target Files:**
- `src/components/editor/layers/LayerRow.tsx`
- `src/components/editor/layers/LayersPanel.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 38 remediation`.

## Step 39
**Target Files:**
- `src/components/editor/layers/LayersToolbar.tsx`
- `src/components/editor/layers/__tests__/LayersPanel.test.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 39 remediation`.

## Step 40
**Target Files:**
- `src/components/editor/layers/__tests__/LayersToolbar.test.tsx`
- `src/components/editor/panels/AcceptancePanel.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 40 remediation`.

## Step 41
**Target Files:**
- `src/components/editor/panels/BlobPanel.tsx`
- `src/components/editor/panels/ColorPanel.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 41 remediation`.

## Step 42
**Target Files:**
- `src/components/editor/panels/FocusPanel.tsx`
- `src/components/editor/panels/index.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 42 remediation`.

## Step 43
**Target Files:**
- `src/components/editor/panels/LightingDrawer.tsx`
- `src/components/editor/panels/MaskPanel.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 43 remediation`.

## Step 44
**Target Files:**
- `src/components/editor/panels/NumberPanel.tsx`
- `src/components/editor/panels/PatternEdgePanel.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 44 remediation`.

## Step 45
**Target Files:**
- `src/components/editor/panels/ReferenceAssetPanel.tsx`
- `src/components/editor/panels/resolver.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 45 remediation`.

## Step 46
**Target Files:**
- `src/components/editor/PreviewSettingsPanel.tsx`
- `src/components/editor/PropertiesPanel.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 46 remediation`.

## Step 47
**Target Files:**
- `src/components/editor/rail/BarcodeRuleEditor.tsx`
- `src/components/editor/rail/BlobRuleEditor.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 47 remediation`.

## Step 48
**Target Files:**
- `src/components/editor/rail/CalibrationDistributionPlot.tsx`
- `src/components/editor/rail/CalibrationStats.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 48 remediation`.

## Step 49
**Target Files:**
- `src/components/editor/rail/CircleRuleEditor.tsx`
- `src/components/editor/rail/CollapsiblePanelSection.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 49 remediation`.

## Step 50
**Target Files:**
- `src/components/editor/rail/ColorMatRuleEditor.tsx`
- `src/components/editor/rail/EdgePitchRuleEditor.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 50 remediation`.

## Step 51
**Target Files:**
- `src/components/editor/rail/EdgeWidthRuleEditor.tsx`
- `src/components/editor/rail/FlawRuleEditor.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 51 remediation`.

## Step 52
**Target Files:**
- `src/components/editor/rail/index.ts`
- `src/components/editor/rail/LineToolControls.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 52 remediation`.

## Step 53
**Target Files:**
- `src/components/editor/rail/MathRuleEditor.tsx`
- `src/components/editor/rail/OcrRuleEditor.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 53 remediation`.

## Step 54
**Target Files:**
- `src/components/editor/rail/PassThresholdField.tsx`
- `src/components/editor/rail/PositionalAdjustmentRuleEditor.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 54 remediation`.

## Step 55
**Target Files:**
- `src/components/editor/rail/RectRuleEditor.tsx`
- `src/components/editor/rail/RightRail.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 55 remediation`.

## Step 56
**Target Files:**
- `src/components/editor/rail/RuleSetIOBar.tsx`
- `src/components/editor/rail/RulesRailHeader.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 56 remediation`.

## Step 57
**Target Files:**
- `src/components/editor/rail/TextRuleEditor.tsx`
- `src/components/editor/rail/__tests__/per-kind-editors.test.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 57 remediation`.

## Step 58
**Target Files:**
- `src/components/editor/ribbon/index.ts`
- `src/components/editor/ribbon/RibbonChip.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 58 remediation`.

## Step 59
**Target Files:**
- `src/components/editor/ribbon/ToolRibbon.tsx`
- `src/components/editor/setup/EditorSetupExperience.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 59 remediation`.

## Step 60
**Target Files:**
- `src/components/editor/setup/index.ts`
- `src/components/editor/setup/SetupBoundaries.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 60 remediation`.

## Step 61
**Target Files:**
- `src/components/editor/shell/DockedPropertiesPanel.tsx`
- `src/components/editor/shell/EditorShell.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 61 remediation`.

## Step 62
**Target Files:**
- `src/components/editor/shell/EditorTopBar.tsx`
- `src/components/editor/shell/index.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 62 remediation`.

## Step 63
**Target Files:**
- `src/components/editor/status/FpsBadge.tsx`
- `src/components/editor/status/index.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 63 remediation`.

## Step 64
**Target Files:**
- `src/components/editor/status/LastLogChip.tsx`
- `src/components/editor/status/SaveState.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 64 remediation`.

## Step 65
**Target Files:**
- `src/components/editor/status/StatusStrip.tsx`
- `src/components/editor/validation/ValidateAgainstImageDialog.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 65 remediation`.

## Step 66
**Target Files:**
- `src/components/editor/validation/ValidationChip.tsx`
- `src/components/editor/validation/WorkerHealthBanner.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 66 remediation`.

## Step 67
**Target Files:**
- `src/components/editor/__tests__/InspectorPanel.test.tsx`
- `src/components/editor/__tests__/PropertiesPanel.test.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 67 remediation`.

## Step 68
**Target Files:**
- `src/components/errors/EnvelopeErrorBoundary.tsx`
- `src/components/errors/EnvelopeErrorPanel.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 68 remediation`.

## Step 69
**Target Files:**
- `src/components/errors/error-dialog/constants.ts`
- `src/components/errors/error-dialog/copy-record.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 69 remediation`.

## Step 70
**Target Files:**
- `src/components/errors/error-dialog/ErrorDialogActions.tsx`
- `src/components/errors/error-dialog/ErrorDialogBody.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 70 remediation`.

## Step 71
**Target Files:**
- `src/components/errors/error-dialog/ErrorDialogHeader.tsx`
- `src/components/errors/error-dialog/useDialogSync.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 71 remediation`.

## Step 72
**Target Files:**
- `src/components/errors/ErrorDialog.tsx`
- `src/components/errors/ErrorDialogProvider.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 72 remediation`.

## Step 73
**Target Files:**
- `src/components/errors/ErrorHistoryDrawer.tsx`
- `src/components/errors/ErrorQueueBadge.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 73 remediation`.

## Step 74
**Target Files:**
- `src/components/errors/GlobalErrorModal.tsx`
- `src/components/errors/ServerErrorFallback.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 74 remediation`.

## Step 75
**Target Files:**
- `src/components/errors/SessionLinks.tsx`
- `src/components/errors/__tests__/EnvelopeErrorBoundary.test.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 75 remediation`.

## Step 76
**Target Files:**
- `src/components/errors/__tests__/EnvelopeErrorPanel.showDevFrames.test.tsx`
- `src/components/errors/__tests__/EnvelopeErrorPanel.test.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 76 remediation`.

## Step 77
**Target Files:**
- `src/components/hmi/ActionBar.tsx`
- `src/components/hmi/CameraPreview.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 77 remediation`.

## Step 78
**Target Files:**
- `src/components/hmi/Counter.tsx`
- `src/components/hmi/DeviceDiscoveryPanel.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 78 remediation`.

## Step 79
**Target Files:**
- `src/components/hmi/FeatureGate.tsx`
- `src/components/hmi/GlobalNav.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 79 remediation`.

## Step 80
**Target Files:**
- `src/components/hmi/HeaderDensityToggle.tsx`
- `src/components/hmi/HmiShell.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 80 remediation`.

## Step 81
**Target Files:**
- `src/components/hmi/index.ts`
- `src/components/hmi/KeyboardModeIndicator.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 81 remediation`.

## Step 82
**Target Files:**
- `src/components/hmi/MachineFrame.tsx`
- `src/components/hmi/ModeHeader.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 82 remediation`.

## Step 83
**Target Files:**
- `src/components/hmi/RunButton.tsx`
- `src/components/hmi/RunErrorDrawer.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 83 remediation`.

## Step 84
**Target Files:**
- `src/components/hmi/RunHistorySidebar.tsx`
- `src/components/hmi/RunSkeleton.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 84 remediation`.

## Step 85
**Target Files:**
- `src/components/hmi/SettingsDialog.tsx`
- `src/components/hmi/StatusBar.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 85 remediation`.

## Step 86
**Target Files:**
- `src/components/hmi/StatusLog.tsx`
- `src/components/hmi/titlebar-parts.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 86 remediation`.

## Step 87
**Target Files:**
- `src/components/hmi/Titlebar.tsx`
- `src/components/hmi/ToolTile.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 87 remediation`.

## Step 88
**Target Files:**
- `src/components/hmi/Viewport.tsx`
- `src/components/hmi/ViewportImageControls.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 88 remediation`.

## Step 89
**Target Files:**
- `src/components/home/data.ts`
- `src/components/home/entries.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 89 remediation`.

## Step 90
**Target Files:**
- `src/components/home/GettingStarted.tsx`
- `src/components/home/HomeBoundaries.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 90 remediation`.

## Step 91
**Target Files:**
- `src/components/home/index.ts`
- `src/components/home/JobList.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 91 remediation`.

## Step 92
**Target Files:**
- `src/components/home/RecentProjectsChip.tsx`
- `src/components/home/TaskPane.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 92 remediation`.

## Step 93
**Target Files:**
- `src/components/nav/CommandPalette.tsx`
- `src/components/nav/FavoritesBar.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 93 remediation`.

## Step 94
**Target Files:**
- `src/components/nav/GlobalHomeAffordance.tsx`
- `src/components/nav/SectionTopBar.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 94 remediation`.

## Step 95
**Target Files:**
- `src/components/nav/ShortcutsDialog.tsx`
- `src/components/nav/TopMenuBar.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 95 remediation`.

## Step 96
**Target Files:**
- `src/components/nav/__tests__/SectionTopBar.test.tsx`
- `src/components/ops/audit-retention-tile.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 96 remediation`.

## Step 97
**Target Files:**
- `src/components/ops/LogTailViewer.tsx`
- `src/components/ops/__tests__/LogTailViewer.test.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 97 remediation`.

## Step 98
**Target Files:**
- `src/components/palettes/ToolPalette.tsx`
- `src/components/palettes/UserFunctionsPalette.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 98 remediation`.

## Step 99
**Target Files:**
- `src/components/projects/ProjectEditorSections.tsx`
- `src/components/projects/RulesetPicker.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 99 remediation`.

## Step 100
**Target Files:**
- `src/components/projects/SampleCarousel.tsx`
- `src/components/projects/__tests__/ImageSamplesSection.reorder.test.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 100 remediation`.

## Step 101
**Target Files:**
- `src/components/rules/LayersPalette.tsx`
- `src/components/rules/properties/AdjustPane.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 101 remediation`.

## Step 102
**Target Files:**
- `src/components/rules/properties/CssPane.tsx`
- `src/components/rules/properties/GridPane.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 102 remediation`.

## Step 103
**Target Files:**
- `src/components/rules/properties/HistoryPane.tsx`
- `src/components/rules/properties/ImagePane.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 103 remediation`.

## Step 104
**Target Files:**
- `src/components/rules/properties/InfoPane.tsx`
- `src/components/rules/properties/LayersShortcutPane.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 104 remediation`.

## Step 105
**Target Files:**
- `src/components/rules/properties/paneShell.tsx`
- `src/components/rules/properties/ParagraphPane.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 105 remediation`.

## Step 106
**Target Files:**
- `src/components/rules/properties/SwatchesPane.tsx`
- `src/components/rules/properties/TypePane.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 106 remediation`.

## Step 107
**Target Files:**
- `src/components/rules/PropertiesPalette.tsx`
- `src/components/rules/RuleCreateDialog.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 107 remediation`.

## Step 108
**Target Files:**
- `src/components/rules/RuleEditor.tsx`
- `src/components/rules/RuleEditorToolbar.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 108 remediation`.

## Step 109
**Target Files:**
- `src/components/rules/RuleKindBadge.tsx`
- `src/components/rules/RuleMetadataBar.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 109 remediation`.

## Step 110
**Target Files:**
- `src/components/rules/RulePreviewThumbnail.tsx`
- `src/components/rules/tools/ToolGuideDialog.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 110 remediation`.

## Step 111
**Target Files:**
- `src/components/rules/tools/toolGuides.ts`
- `src/components/rules/tools/ToolsPalette.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 111 remediation`.

## Step 112
**Target Files:**
- `src/components/rules/tools/toolTooltipMap.ts`
- `src/components/rules/tools/__tests__/ToolGuideDialog.test.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 112 remediation`.

## Step 113
**Target Files:**
- `src/components/rules/tools/__tests__/toolGuides.test.ts`
- `src/components/rules/tools/__tests__/ToolsPalette.a11y.test.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 113 remediation`.

## Step 114
**Target Files:**
- `src/components/rules/tools/__tests__/ToolsPalette.touch.test.tsx`
- `src/components/rules/tools/__tests__/toolTooltipMap.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 114 remediation`.

## Step 115
**Target Files:**
- `src/components/rules/__tests__/RuleMetadataBar.test.tsx`
- `src/components/settings/ReferenceImageCard.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 115 remediation`.

## Step 116
**Target Files:**
- `src/components/settings/RetentionStepper.tsx`
- `src/components/settings/SavedBadge.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 116 remediation`.

## Step 117
**Target Files:**
- `src/components/settings/SettingsCard.tsx`
- `src/components/settings/SettingsDisclosure.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 117 remediation`.

## Step 118
**Target Files:**
- `src/components/settings/SettingsGroup.tsx`
- `src/components/settings/SettingsSidenav.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 118 remediation`.

## Step 119
**Target Files:**
- `src/components/settings/TriggerTimingDiagram.tsx`
- `src/components/settings/__tests__/RetentionStepper.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 119 remediation`.

## Step 120
**Target Files:**
- `src/components/settings/__tests__/SavedBadge.test.ts`
- `src/components/setup/CategoryCombobox.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 120 remediation`.

## Step 121
**Target Files:**
- `src/components/setup/NewRuleSetDialog.tsx`
- `src/components/shell/AddressBar.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 121 remediation`.

## Step 122
**Target Files:**
- `src/components/shell/InlineEditNavigationGuard.tsx`
- `src/components/shell/__tests__/AddressBar.sanitize.test.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 122 remediation`.

## Step 123
**Target Files:**
- `src/components/shell/__tests__/AddressBar.slug-roundtrip.test.tsx`
- `src/components/shortcuts/AltMnemonicLayer.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 123 remediation`.

## Step 124
**Target Files:**
- `src/components/shortcuts/ShortcutCheatSheet.tsx`
- `src/components/shortcuts/ShortcutProvider.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 124 remediation`.

## Step 125
**Target Files:**
- `src/components/theme/FlavorToggle.tsx`
- `src/components/theme/ThemeController.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 125 remediation`.

## Step 126
**Target Files:**
- `src/components/theme/ThemeToggle.tsx`
- `src/components/ui/accordion.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 126 remediation`.

## Step 127
**Target Files:**
- `src/components/ui/alert-dialog.tsx`
- `src/components/ui/alert.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 127 remediation`.

## Step 128
**Target Files:**
- `src/components/ui/aspect-ratio.tsx`
- `src/components/ui/avatar.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 128 remediation`.

## Step 129
**Target Files:**
- `src/components/ui/badge.tsx`
- `src/components/ui/breadcrumb.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 129 remediation`.

## Step 130
**Target Files:**
- `src/components/ui/button.tsx`
- `src/components/ui/calendar.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 130 remediation`.

## Step 131
**Target Files:**
- `src/components/ui/card.tsx`
- `src/components/ui/carousel.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 131 remediation`.

## Step 132
**Target Files:**
- `src/components/ui/chart.tsx`
- `src/components/ui/checkbox.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 132 remediation`.

## Step 133
**Target Files:**
- `src/components/ui/collapsible.tsx`
- `src/components/ui/command.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 133 remediation`.

## Step 134
**Target Files:**
- `src/components/ui/context-menu.tsx`
- `src/components/ui/dialog.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 134 remediation`.

## Step 135
**Target Files:**
- `src/components/ui/drawer.tsx`
- `src/components/ui/dropdown-menu.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 135 remediation`.

## Step 136
**Target Files:**
- `src/components/ui/form-error-summary.tsx`
- `src/components/ui/form-field.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 136 remediation`.

## Step 137
**Target Files:**
- `src/components/ui/form.tsx`
- `src/components/ui/hover-card.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 137 remediation`.

## Step 138
**Target Files:**
- `src/components/ui/InlineEdit.tsx`
- `src/components/ui/input-otp.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 138 remediation`.

## Step 139
**Target Files:**
- `src/components/ui/input.tsx`
- `src/components/ui/label.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 139 remediation`.

## Step 140
**Target Files:**
- `src/components/ui/menubar.tsx`
- `src/components/ui/navigation-menu.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 140 remediation`.

## Step 141
**Target Files:**
- `src/components/ui/pagination.tsx`
- `src/components/ui/popover.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 141 remediation`.

## Step 142
**Target Files:**
- `src/components/ui/progress.tsx`
- `src/components/ui/radio-group.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 142 remediation`.

## Step 143
**Target Files:**
- `src/components/ui/resizable.tsx`
- `src/components/ui/scroll-area.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 143 remediation`.

## Step 144
**Target Files:**
- `src/components/ui/section.tsx`
- `src/components/ui/select.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 144 remediation`.

## Step 145
**Target Files:**
- `src/components/ui/separator.tsx`
- `src/components/ui/sheet.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 145 remediation`.

## Step 146
**Target Files:**
- `src/components/ui/sidebar.tsx`
- `src/components/ui/skeleton-primitives.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 146 remediation`.

## Step 147
**Target Files:**
- `src/components/ui/skeleton.tsx`
- `src/components/ui/slider.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 147 remediation`.

## Step 148
**Target Files:**
- `src/components/ui/sonner.tsx`
- `src/components/ui/switch.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 148 remediation`.

## Step 149
**Target Files:**
- `src/components/ui/table.tsx`
- `src/components/ui/tabs.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 149 remediation`.

## Step 150
**Target Files:**
- `src/components/ui/textarea.tsx`
- `src/components/ui/toggle-group.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 150 remediation`.

## Step 151
**Target Files:**
- `src/components/ui/toggle.tsx`
- `src/components/ui/tooltip.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 151 remediation`.

## Step 152
**Target Files:**
- `src/components/ui/__tests__/form-error-summary.test.tsx`
- `src/components/ui/__tests__/sonner.test.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 152 remediation`.

## Step 153
**Target Files:**
- `src/features/projects/modals/NewMicSettingsModal.tsx`
- `src/features/projects/modals/SaveCameraSetupModal.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 153 remediation`.

## Step 154
**Target Files:**
- `src/features/projects/modals/__tests__/NewMicSettingsModal.test.tsx`
- `src/features/projects/sections/ProjectRulesSection.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 154 remediation`.

## Step 155
**Target Files:**
- `src/features/projects/sections/__tests__/ProjectRulesSection.test.ts`
- `src/features/rules/editor/ColorParamsPanel.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 155 remediation`.

## Step 156
**Target Files:**
- `src/features/rules/editor/ConditionCard.tsx`
- `src/features/rules/editor/ConditionTypeSelect.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 156 remediation`.

## Step 157
**Target Files:**
- `src/features/rules/editor/PresenceParamsPanel.tsx`
- `src/features/rules/editor/RuleConditionsEditor.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 157 remediation`.

## Step 158
**Target Files:**
- `src/features/rules/editor/RuleEditorDrawer.tsx`
- `src/features/rules/editor/RuleRow.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 158 remediation`.

## Step 159
**Target Files:**
- `src/features/rules/editor/RulesetHeader.tsx`
- `src/features/rules/editor/RulesList.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 159 remediation`.

## Step 160
**Target Files:**
- `src/features/rules/editor/RuleTemplateHints.tsx`
- `src/features/rules/editor/SameImageParamsPanel.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 160 remediation`.

## Step 161
**Target Files:**
- `src/features/rules/editor/ValidationModeToggle.tsx`
- `src/features/rules/preview/LivePreviewBadge.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 161 remediation`.

## Step 162
**Target Files:**
- `src/features/rules/preview/useLivePreview.ts`
- `src/features/rules/preview/__tests__/useLivePreview.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 162 remediation`.

## Step 163
**Target Files:**
- `src/features/rules/save/SaveConflictModal.tsx`
- `src/features/rules/save/SaveRuleSetButton.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 163 remediation`.

## Step 164
**Target Files:**
- `src/features/rules/save/__tests__/SaveConflictModal.test.tsx`
- `src/generated/ipc-types.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 164 remediation`.

## Step 165
**Target Files:**
- `src/hooks/editor/useLayerDnd.ts`
- `src/hooks/use-app-mutation.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 165 remediation`.

## Step 166
**Target Files:**
- `src/hooks/use-app-query.ts`
- `src/hooks/use-cli-hotkeys.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 166 remediation`.

## Step 167
**Target Files:**
- `src/hooks/use-envelope-query.ts`
- `src/hooks/use-mobile.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 167 remediation`.

## Step 168
**Target Files:**
- `src/hooks/use-show-dev-frames.ts`
- `src/hooks/useHeaderMetrics.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 168 remediation`.

## Step 169
**Target Files:**
- `src/hooks/useHotkeys.ts`
- `src/hooks/useInputModality.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 169 remediation`.

## Step 170
**Target Files:**
- `src/hooks/useLicenseFeatures.ts`
- `src/hooks/useMenuShortcuts.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 170 remediation`.

## Step 171
**Target Files:**
- `src/hooks/useRailPanelState.ts`
- `src/hooks/useReducedMotion.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 171 remediation`.

## Step 172
**Target Files:**
- `src/hooks/useRunning.ts`
- `src/hooks/useViewportSafe.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 172 remediation`.

## Step 173
**Target Files:**
- `src/hooks/useVisibleInterval.ts`
- `src/hooks/__tests__/use-envelope-query.test.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 173 remediation`.

## Step 174
**Target Files:**
- `src/hooks/__tests__/useViewportSafe.test.tsx`
- `src/integrations/supabase/auth-attacher.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 174 remediation`.

## Step 175
**Target Files:**
- `src/integrations/supabase/auth-middleware.ts`
- `src/integrations/supabase/client.server.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 175 remediation`.

## Step 176
**Target Files:**
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 176 remediation`.

## Step 177
**Target Files:**
- `src/lib/a11y/announcer.ts`
- `src/lib/ai-testing/aggregate.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 177 remediation`.

## Step 178
**Target Files:**
- `src/lib/ai-testing/__tests__/aggregate.test.ts`
- `src/lib/app-mode.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 178 remediation`.

## Step 179
**Target Files:**
- `src/lib/audit-export.functions.ts`
- `src/lib/audit-retention.functions.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 179 remediation`.

## Step 180
**Target Files:**
- `src/lib/backend/envelope-server.ts`
- `src/lib/backend/envelope.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 180 remediation`.

## Step 181
**Target Files:**
- `src/lib/backend/errorMapping.ts`
- `src/lib/be-fetch.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 181 remediation`.

## Step 182
**Target Files:**
- `src/lib/breadcrumb-tokens.ts`
- `src/lib/camera/capability.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 182 remediation`.

## Step 183
**Target Files:**
- `src/lib/camera/capture-bridge.ts`
- `src/lib/camera/capture-frame.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 183 remediation`.

## Step 184
**Target Files:**
- `src/lib/camera/facade.ts`
- `src/lib/camera/io.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 184 remediation`.

## Step 185
**Target Files:**
- `src/lib/camera/last-capture-request-store.ts`
- `src/lib/camera/live-capture.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 185 remediation`.

## Step 186
**Target Files:**
- `src/lib/camera/model.ts`
- `src/lib/camera/permission-messages.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 186 remediation`.

## Step 187
**Target Files:**
- `src/lib/camera/seed.ts`
- `src/lib/camera/store.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 187 remediation`.

## Step 188
**Target Files:**
- `src/lib/camera/useCameraLibrary.ts`
- `src/lib/camera/__tests__/capability.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 188 remediation`.

## Step 189
**Target Files:**
- `src/lib/camera/__tests__/capture-bridge.test.ts`
- `src/lib/camera/__tests__/capture-frame.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 189 remediation`.

## Step 190
**Target Files:**
- `src/lib/camera/__tests__/facade.test.ts`
- `src/lib/camera/__tests__/io.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 190 remediation`.

## Step 191
**Target Files:**
- `src/lib/camera/__tests__/live-capture.test.ts`
- `src/lib/camera/__tests__/model.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 191 remediation`.

## Step 192
**Target Files:**
- `src/lib/camera/__tests__/permission-messages.test.ts`
- `src/lib/camera/__tests__/store.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 192 remediation`.

## Step 193
**Target Files:**
- `src/lib/camera/__tests__/useCameraLibrary.test.tsx`
- `src/lib/canvas-prefs/facade.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 193 remediation`.

## Step 194
**Target Files:**
- `src/lib/canvas-prefs/histogram.ts`
- `src/lib/canvas-prefs/__tests__/facade.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 194 remediation`.

## Step 195
**Target Files:**
- `src/lib/capture-auth.server.ts`
- `src/lib/capture-history-store.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 195 remediation`.

## Step 196
**Target Files:**
- `src/lib/capture.functions.ts`
- `src/lib/capture.server.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 196 remediation`.

## Step 197
**Target Files:**
- `src/lib/capture.shared.ts`
- `src/lib/command-bus.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 197 remediation`.

## Step 198
**Target Files:**
- `src/lib/constants/events.ts`
- `src/lib/constants/http.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 198 remediation`.

## Step 199
**Target Files:**
- `src/lib/constants/index.ts`
- `src/lib/constants/storage.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 199 remediation`.

## Step 200
**Target Files:**
- `src/lib/data-source/gate.ts`
- `src/lib/data-source/index.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 200 remediation`.

## Step 201
**Target Files:**
- `src/lib/data-source/store.ts`
- `src/lib/data-source/url-bootstrap.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 201 remediation`.

## Step 202
**Target Files:**
- `src/lib/data-source/__tests__/gate.test.ts`
- `src/lib/data-source/__tests__/store.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 202 remediation`.

## Step 203
**Target Files:**
- `src/lib/db-wrapper.ts`
- `src/lib/denial-burst-query.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 203 remediation`.

## Step 204
**Target Files:**
- `src/lib/denial-tuning.functions.ts`
- `src/lib/dev/single-header-invariant.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 204 remediation`.

## Step 205
**Target Files:**
- `src/lib/diagnostics/home-error-log.ts`
- `src/lib/diagnostics/memory-load.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 205 remediation`.

## Step 206
**Target Files:**
- `src/lib/display-labels.ts`
- `src/lib/editor/align.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 206 remediation`.

## Step 207
**Target Files:**
- `src/lib/editor/calibration-stats.ts`
- `src/lib/editor/calibration.functions.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 207 remediation`.

## Step 208
**Target Files:**
- `src/lib/editor/calibration.ts`
- `src/lib/editor/controller/RuleController.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 208 remediation`.

## Step 209
**Target Files:**
- `src/lib/editor/coords.ts`
- `src/lib/editor/dnd/constants.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 209 remediation`.

## Step 210
**Target Files:**
- `src/lib/editor/dnd/keyboard-controller.test.ts`
- `src/lib/editor/dnd/keyboard-controller.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 210 remediation`.

## Step 211
**Target Files:**
- `src/lib/editor/errors.ts`
- `src/lib/editor/historyStore.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 211 remediation`.

## Step 212
**Target Files:**
- `src/lib/editor/hit-test.ts`
- `src/lib/editor/hud-position.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 212 remediation`.

## Step 213
**Target Files:**
- `src/lib/editor/inline-edit-registry.ts`
- `src/lib/editor/keyboard/shortcuts.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 213 remediation`.

## Step 214
**Target Files:**
- `src/lib/editor/keyboard/useToolShortcuts.ts`
- `src/lib/editor/kind-icons.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 214 remediation`.

## Step 215
**Target Files:**
- `src/lib/editor/log-stream.ts`
- `src/lib/editor/marquee.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 215 remediation`.

## Step 216
**Target Files:**
- `src/lib/editor/mask/primitive.ts`
- `src/lib/editor/mask/__tests__/primitive.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 216 remediation`.

## Step 217
**Target Files:**
- `src/lib/editor/mask-store.ts`
- `src/lib/editor/math/evaluator.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 217 remediation`.

## Step 218
**Target Files:**
- `src/lib/editor/math/index.ts`
- `src/lib/editor/math/parser.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 218 remediation`.

## Step 219
**Target Files:**
- `src/lib/editor/math/tokenize.ts`
- `src/lib/editor/math/types.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 219 remediation`.

## Step 220
**Target Files:**
- `src/lib/editor/migrations.ts`
- `src/lib/editor/ocr/results-bus.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 220 remediation`.

## Step 221
**Target Files:**
- `src/lib/editor/pointer/dispatcher.ts`
- `src/lib/editor/preview-mode-store.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 221 remediation`.

## Step 222
**Target Files:**
- `src/lib/editor/primitives/barcode.ts`
- `src/lib/editor/primitives/blob.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 222 remediation`.

## Step 223
**Target Files:**
- `src/lib/editor/primitives/color-mat.ts`
- `src/lib/editor/primitives/flaw-detection.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 223 remediation`.

## Step 224
**Target Files:**
- `src/lib/editor/primitives/line-tool.ts`
- `src/lib/editor/primitives/positional-adjustment.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 224 remediation`.

## Step 225
**Target Files:**
- `src/lib/editor/primitives/__tests__/barcode.test.ts`
- `src/lib/editor/primitives/__tests__/blob.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 225 remediation`.

## Step 226
**Target Files:**
- `src/lib/editor/primitives/__tests__/color-mat.test.ts`
- `src/lib/editor/primitives/__tests__/flaw-detection.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 226 remediation`.

## Step 227
**Target Files:**
- `src/lib/editor/primitives/__tests__/line-tool.test.ts`
- `src/lib/editor/primitives/__tests__/positional-adjustment.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 227 remediation`.

## Step 228
**Target Files:**
- `src/lib/editor/render/frame.ts`
- `src/lib/editor/render/__tests__/frame-selected-label.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 228 remediation`.

## Step 229
**Target Files:**
- `src/lib/editor/rotation.ts`
- `src/lib/editor/rule-presets.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 229 remediation`.

## Step 230
**Target Files:**
- `src/lib/editor/ruleset-io.ts`
- `src/lib/editor/runner/color/delta-e.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 230 remediation`.

## Step 231
**Target Files:**
- `src/lib/editor/runner/color/evaluate.ts`
- `src/lib/editor/runner/color/kmeans.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 231 remediation`.

## Step 232
**Target Files:**
- `src/lib/editor/runner/color/lab.ts`
- `src/lib/editor/runner/color/__tests__/color-eval.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 232 remediation`.

## Step 233
**Target Files:**
- `src/lib/editor/runner/condition-eval.ts`
- `src/lib/editor/runner/rule-eval.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 233 remediation`.

## Step 234
**Target Files:**
- `src/lib/editor/runner/ruleset-eval.ts`
- `src/lib/editor/runner/types.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 234 remediation`.

## Step 235
**Target Files:**
- `src/lib/editor/runner/__tests__/ruleset-eval.test.ts`
- `src/lib/editor/sample-library.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 235 remediation`.

## Step 236
**Target Files:**
- `src/lib/editor/schema.ts`
- `src/lib/editor/selection/open-bus.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 236 remediation`.

## Step 237
**Target Files:**
- `src/lib/editor/selection/palette-kind-map.ts`
- `src/lib/editor/selection/useSelectedRules.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 237 remediation`.

## Step 238
**Target Files:**
- `src/lib/editor/selection/useSelectedRuleShape.ts`
- `src/lib/editor/snap-store.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 238 remediation`.

## Step 239
**Target Files:**
- `src/lib/editor/snap.ts`
- `src/lib/editor/store/history-reducers.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 239 remediation`.

## Step 240
**Target Files:**
- `src/lib/editor/store/history-slice.ts`
- `src/lib/editor/store/history-types.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 240 remediation`.

## Step 241
**Target Files:**
- `src/lib/editor/store/ids.ts`
- `src/lib/editor/store/persistence.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 241 remediation`.

## Step 242
**Target Files:**
- `src/lib/editor/store/rules-slice.ts`
- `src/lib/editor/store/save-status.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 242 remediation`.

## Step 243
**Target Files:**
- `src/lib/editor/store/__tests__/persistence.test.ts`
- `src/lib/editor/store/__tests__/rules-slice-groups.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 243 remediation`.

## Step 244
**Target Files:**
- `src/lib/editor/test-hooks.ts`
- `src/lib/editor/tools/anchor-tool.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 244 remediation`.

## Step 245
**Target Files:**
- `src/lib/editor/tools/index.ts`
- `src/lib/editor/tools/rect-tool.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 245 remediation`.

## Step 246
**Target Files:**
- `src/lib/editor/types.ts`
- `src/lib/editor/useSampleLibrary.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 246 remediation`.

## Step 247
**Target Files:**
- `src/lib/editor/validation-cache.ts`
- `src/lib/editor/validation-store.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 247 remediation`.

## Step 248
**Target Files:**
- `src/lib/editor/validation.functions.ts`
- `src/lib/editor/validation.shared.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 248 remediation`.

## Step 249
**Target Files:**
- `src/lib/editor/validation.ts`
- `src/lib/editor/worker-health-store.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 249 remediation`.

## Step 250
**Target Files:**
- `src/lib/editor/__tests__/align.test.ts`
- `src/lib/editor/__tests__/marquee.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 250 remediation`.

## Step 251
**Target Files:**
- `src/lib/editor/__tests__/rotation.test.ts`
- `src/lib/editor/__tests__/snap-store.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 251 remediation`.

## Step 252
**Target Files:**
- `src/lib/editor/__tests__/snap.test.ts`
- `src/lib/editor/__tests__/useSampleLibrary.step31.test.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 252 remediation`.

## Step 253
**Target Files:**
- `src/lib/editor/__tests__/validation.functions.test.ts`
- `src/lib/enums/editor.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 253 remediation`.

## Step 254
**Target Files:**
- `src/lib/enums/html.ts`
- `src/lib/enums/menu-group-id-type.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 254 remediation`.

## Step 255
**Target Files:**
- `src/lib/enums/menu-shortcut-type.ts`
- `src/lib/enums/ui.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 255 remediation`.

## Step 256
**Target Files:**
- `src/lib/enums/validation.ts`
- `src/lib/error-capture.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 256 remediation`.

## Step 257
**Target Files:**
- `src/lib/error-page.ts`
- `src/lib/errors/AppError.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 257 remediation`.

## Step 258
**Target Files:**
- `src/lib/errors/error-bus.ts`
- `src/lib/errors/error-record.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 258 remediation`.

## Step 259
**Target Files:**
- `src/lib/errors/errorStore.ts`
- `src/lib/errors/export.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 259 remediation`.

## Step 260
**Target Files:**
- `src/lib/errors/format.ts`
- `src/lib/errors/globalCapture.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 260 remediation`.

## Step 261
**Target Files:**
- `src/lib/errors/history-facade.ts`
- `src/lib/errors/index.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 261 remediation`.

## Step 262
**Target Files:**
- `src/lib/errors/ipcErrorBridge.tsx`
- `src/lib/errors/notify.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 262 remediation`.

## Step 263
**Target Files:**
- `src/lib/errors/registry.ts`
- `src/lib/errors/retry-registry.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 263 remediation`.

## Step 264
**Target Files:**
- `src/lib/errors/__tests__/errorStore.test.ts`
- `src/lib/errors/__tests__/export.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 264 remediation`.

## Step 265
**Target Files:**
- `src/lib/errors/__tests__/history-facade.test.ts`
- `src/lib/errors/__tests__/notify.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 265 remediation`.

## Step 266
**Target Files:**
- `src/lib/errors/__tests__/registry-lookup.test.ts`
- `src/lib/errors/__tests__/registry.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 266 remediation`.

## Step 267
**Target Files:**
- `src/lib/export-project.ts`
- `src/lib/facade/contracts.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 267 remediation`.

## Step 268
**Target Files:**
- `src/lib/facade/__tests__/contracts.test.ts`
- `src/lib/facades/categories-facade.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 268 remediation`.

## Step 269
**Target Files:**
- `src/lib/facades/domain-facade.ts`
- `src/lib/facades/memory-domain-facade.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 269 remediation`.

## Step 270
**Target Files:**
- `src/lib/facades/registry.ts`
- `src/lib/facades/slice-facades.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 270 remediation`.

## Step 271
**Target Files:**
- `src/lib/facades/useFacadeOrStore.ts`
- `src/lib/facades/__tests__/categories-facade.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 271 remediation`.

## Step 272
**Target Files:**
- `src/lib/facades/__tests__/domain-facade.test.ts`
- `src/lib/facades/__tests__/facade-only-ratchet.step40.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 272 remediation`.

## Step 273
**Target Files:**
- `src/lib/facades/__tests__/memory-domain-facade.test.ts`
- `src/lib/facades/__tests__/registry.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 273 remediation`.

## Step 274
**Target Files:**
- `src/lib/facades/__tests__/useFacadeOrStore.test.tsx`
- `src/lib/favorites-store.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 274 remediation`.

## Step 275
**Target Files:**
- `src/lib/format-label.ts`
- `src/lib/functions/chain-events-io.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 275 remediation`.

## Step 276
**Target Files:**
- `src/lib/functions/chain-events-runner.ts`
- `src/lib/functions/chain-events-store.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 276 remediation`.

## Step 277
**Target Files:**
- `src/lib/functions/chain-events.ts`
- `src/lib/functions/library-store.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 277 remediation`.

## Step 278
**Target Files:**
- `src/lib/functions/library.ts`
- `src/lib/functions/persistence.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 278 remediation`.

## Step 279
**Target Files:**
- `src/lib/functions/__tests__/chain-events-io.test.ts`
- `src/lib/functions/__tests__/chain-events-runner.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 279 remediation`.

## Step 280
**Target Files:**
- `src/lib/functions/__tests__/chain-events-store.test.ts`
- `src/lib/functions/__tests__/chain-events.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 280 remediation`.

## Step 281
**Target Files:**
- `src/lib/functions/__tests__/library-store.test.ts`
- `src/lib/functions/__tests__/library.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 281 remediation`.

## Step 282
**Target Files:**
- `src/lib/functions/__tests__/persistence.test.ts`
- `src/lib/fuzzy-match.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 282 remediation`.

## Step 283
**Target Files:**
- `src/lib/gated-features.functions.ts`
- `src/lib/http/client.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 283 remediation`.

## Step 284
**Target Files:**
- `src/lib/ids/int-alias.ts`
- `src/lib/ids/ulid.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 284 remediation`.

## Step 285
**Target Files:**
- `src/lib/ids/__tests__/int-alias.test.ts`
- `src/lib/image-samples/facade.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 285 remediation`.

## Step 286
**Target Files:**
- `src/lib/image-samples/model.ts`
- `src/lib/image-samples/seed.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 286 remediation`.

## Step 287
**Target Files:**
- `src/lib/image-samples/use-selected-sample.ts`
- `src/lib/image-samples/useImageSamples.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 287 remediation`.

## Step 288
**Target Files:**
- `src/lib/image-samples/__tests__/facade.test.ts`
- `src/lib/license-gate.server.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 288 remediation`.

## Step 289
**Target Files:**
- `src/lib/license-store.server.ts`
- `src/lib/license.functions.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 289 remediation`.

## Step 290
**Target Files:**
- `src/lib/license.ts`
- `src/lib/lighting/store.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 290 remediation`.

## Step 291
**Target Files:**
- `src/lib/lighting/__tests__/store.test.ts`
- `src/lib/lovable-error-reporting.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 291 remediation`.

## Step 292
**Target Files:**
- `src/lib/mic-settings/facade.ts`
- `src/lib/mic-settings/model.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 292 remediation`.

## Step 293
**Target Files:**
- `src/lib/mic-settings/seed.ts`
- `src/lib/mic-settings/useMicSettingsLibrary.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 293 remediation`.

## Step 294
**Target Files:**
- `src/lib/mic-settings/__tests__/facade.test.ts`
- `src/lib/mic-settings/__tests__/model.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 294 remediation`.

## Step 295
**Target Files:**
- `src/lib/mic-settings/__tests__/useMicSettingsLibrary.test.tsx`
- `src/lib/notify.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 295 remediation`.

## Step 296
**Target Files:**
- `src/lib/observability/cliSession.functions.ts`
- `src/lib/observability/cliSessions.functions.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 296 remediation`.

## Step 297
**Target Files:**
- `src/lib/observability/config.functions.ts`
- `src/lib/observability/doctor.functions.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 297 remediation`.

## Step 298
**Target Files:**
- `src/lib/observability/ipc.functions.ts`
- `src/lib/observability/logs.functions.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 298 remediation`.

## Step 299
**Target Files:**
- `src/lib/observability/rules.functions.ts`
- `src/lib/observability/samples.functions.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 299 remediation`.

## Step 300
**Target Files:**
- `src/lib/observability/savedViews.ts`
- `src/lib/observability/sessions.functions.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 300 remediation`.

## Step 301
**Target Files:**
- `src/lib/observability/status.functions.ts`
- `src/lib/observability/useSessionLogTail.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 301 remediation`.

## Step 302
**Target Files:**
- `src/lib/observability/useSessionLogTailAutoReconnect.ts`
- `src/lib/observability/__tests__/useSessionLogTail.test.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 302 remediation`.

## Step 303
**Target Files:**
- `src/lib/observability/__tests__/useSessionLogTailAutoReconnect.test.tsx`
- `src/lib/ops.functions.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 303 remediation`.

## Step 304
**Target Files:**
- `src/lib/ops.server.ts`
- `src/lib/ops.shared.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 304 remediation`.

## Step 305
**Target Files:**
- `src/lib/palette/facade.ts`
- `src/lib/palette/usePaletteState.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 305 remediation`.

## Step 306
**Target Files:**
- `src/lib/palette/__tests__/facade.test.ts`
- `src/lib/palette-store.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 306 remediation`.

## Step 307
**Target Files:**
- `src/lib/program-store.ts`
- `src/lib/projects/broadcast.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 307 remediation`.

## Step 308
**Target Files:**
- `src/lib/projects/bundle.ts`
- `src/lib/projects/canonical-snapshot.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 308 remediation`.

## Step 309
**Target Files:**
- `src/lib/projects/category-resolver.ts`
- `src/lib/projects/chain.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 309 remediation`.

## Step 310
**Target Files:**
- `src/lib/projects/cross-tab.ts`
- `src/lib/projects/facade-json.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 310 remediation`.

## Step 311
**Target Files:**
- `src/lib/projects/facade.ts`
- `src/lib/projects/override-chain.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 311 remediation`.

## Step 312
**Target Files:**
- `src/lib/projects/project-runner.ts`
- `src/lib/projects/seed-bindings.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 312 remediation`.

## Step 313
**Target Files:**
- `src/lib/projects/seed.ts`
- `src/lib/projects/store.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 313 remediation`.

## Step 314
**Target Files:**
- `src/lib/projects/trials.ts`
- `src/lib/projects/useCategoryOptions.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 314 remediation`.

## Step 315
**Target Files:**
- `src/lib/projects/__tests__/bundle.test.ts`
- `src/lib/projects/__tests__/category-resolver.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 315 remediation`.

## Step 316
**Target Files:**
- `src/lib/projects/__tests__/chain.test.ts`
- `src/lib/projects/__tests__/facade-single-seam.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 316 remediation`.

## Step 317
**Target Files:**
- `src/lib/projects/__tests__/project-runner.test.ts`
- `src/lib/projects/__tests__/seed.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 317 remediation`.

## Step 318
**Target Files:**
- `src/lib/projects/__tests__/store.test.ts`
- `src/lib/projects/__tests__/trials.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 318 remediation`.

## Step 319
**Target Files:**
- `src/lib/projects/__tests__/useCategoryOptions.test.tsx`
- `src/lib/projects.functions.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 319 remediation`.

## Step 320
**Target Files:**
- `src/lib/react-query/poll.ts`
- `src/lib/recent-projects-store.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 320 remediation`.

## Step 321
**Target Files:**
- `src/lib/reference-image-store.ts`
- `src/lib/rpc/client.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 321 remediation`.

## Step 322
**Target Files:**
- `src/lib/rpc/guards.ts`
- `src/lib/rpc/index.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 322 remediation`.

## Step 323
**Target Files:**
- `src/lib/rules/audit-export.ts`
- `src/lib/rules/audit-store.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 323 remediation`.

## Step 324
**Target Files:**
- `src/lib/rules/bootReconcile.ts`
- `src/lib/rules/draftPersistence.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 324 remediation`.

## Step 325
**Target Files:**
- `src/lib/rules/draftStore.ts`
- `src/lib/rules/envelope-schema.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 325 remediation`.

## Step 326
**Target Files:**
- `src/lib/rules/envelopeAdapter.ts`
- `src/lib/rules/facade.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 326 remediation`.

## Step 327
**Target Files:**
- `src/lib/rules/loadRuleSet.ts`
- `src/lib/rules/model.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 327 remediation`.

## Step 328
**Target Files:**
- `src/lib/rules/reconcileDrafts.ts`
- `src/lib/rules/rule-id-alias.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 328 remediation`.

## Step 329
**Target Files:**
- `src/lib/rules/ruleset-id-alias.ts`
- `src/lib/rules/saveRuleSet.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 329 remediation`.

## Step 330
**Target Files:**
- `src/lib/rules/seed.ts`
- `src/lib/rules/useRulesLibrary.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 330 remediation`.

## Step 331
**Target Files:**
- `src/lib/rules/useSaveConflictResolvers.ts`
- `src/lib/rules/useSaveRuleSet.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 331 remediation`.

## Step 332
**Target Files:**
- `src/lib/rules/useSeededRules.ts`
- `src/lib/rules/__tests__/audit-export.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 332 remediation`.

## Step 333
**Target Files:**
- `src/lib/rules/__tests__/audit-store.test.ts`
- `src/lib/rules/__tests__/bootReconcile.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 333 remediation`.

## Step 334
**Target Files:**
- `src/lib/rules/__tests__/draftStore.test.ts`
- `src/lib/rules/__tests__/enabled-toggle.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 334 remediation`.

## Step 335
**Target Files:**
- `src/lib/rules/__tests__/envelopeAdapter.test.ts`
- `src/lib/rules/__tests__/envelopeRoundtrip.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 335 remediation`.

## Step 336
**Target Files:**
- `src/lib/rules/__tests__/facade.test.ts`
- `src/lib/rules/__tests__/model.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 336 remediation`.

## Step 337
**Target Files:**
- `src/lib/rules/__tests__/reconcileDrafts.test.ts`
- `src/lib/rules/__tests__/rule-id-alias.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 337 remediation`.

## Step 338
**Target Files:**
- `src/lib/rules/__tests__/seed.test.ts`
- `src/lib/rules/__tests__/useRulesLibrary.test.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 338 remediation`.

## Step 339
**Target Files:**
- `src/lib/rules/__tests__/useSaveConflictResolvers.test.ts`
- `src/lib/rules/__tests__/useSaveRuleSet.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 339 remediation`.

## Step 340
**Target Files:**
- `src/lib/rules/__tests__/useSeededRules.step32.test.tsx`
- `src/lib/rules.functions.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 340 remediation`.

## Step 341
**Target Files:**
- `src/lib/rulesets-clone.functions.ts`
- `src/lib/run-project.functions.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 341 remediation`.

## Step 342
**Target Files:**
- `src/lib/run-store.ts`
- `src/lib/running-ops-store.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 342 remediation`.

## Step 343
**Target Files:**
- `src/lib/running-pill-position.ts`
- `src/lib/sdk-facade.server.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 343 remediation`.

## Step 344
**Target Files:**
- `src/lib/security/health-token.ts`
- `src/lib/security-telemetry.functions.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 344 remediation`.

## Step 345
**Target Files:**
- `src/lib/seed/active-profile.ts`
- `src/lib/seed/apply-profile-command.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 345 remediation`.

## Step 346
**Target Files:**
- `src/lib/seed/dry-run-v2.ts`
- `src/lib/seed/facade.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 346 remediation`.

## Step 347
**Target Files:**
- `src/lib/seed/gap-check.ts`
- `src/lib/seed/index.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 347 remediation`.

## Step 348
**Target Files:**
- `src/lib/seed/json-facade.ts`
- `src/lib/seed/memory-facade.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 348 remediation`.

## Step 349
**Target Files:**
- `src/lib/seed/orchestrator-v2.ts`
- `src/lib/seed/orchestrator.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 349 remediation`.

## Step 350
**Target Files:**
- `src/lib/seed/provider.tsx`
- `src/lib/seed/remote-facade.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 350 remediation`.

## Step 351
**Target Files:**
- `src/lib/seed/reset-summary-json.ts`
- `src/lib/seed/sample-image-registry.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 351 remediation`.

## Step 352
**Target Files:**
- `src/lib/seed/schemas-v2.ts`
- `src/lib/seed/schemas.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 352 remediation`.

## Step 353
**Target Files:**
- `src/lib/seed/SeedRecoveryToast.tsx`
- `src/lib/seed/SeedSlot.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 353 remediation`.

## Step 354
**Target Files:**
- `src/lib/seed/telemetry-store.ts`
- `src/lib/seed/types.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 354 remediation`.

## Step 355
**Target Files:**
- `src/lib/seed/useSeededEmptyStateAction.ts`
- `src/lib/seed/useSeededSurfaces.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 355 remediation`.

## Step 356
**Target Files:**
- `src/lib/seed/useSeedSlice.ts`
- `src/lib/seed/validate-bundle-loud.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 356 remediation`.

## Step 357
**Target Files:**
- `src/lib/seed/__tests__/apply-profile-command.test.ts`
- `src/lib/seed/__tests__/dry-run-v2.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 357 remediation`.

## Step 358
**Target Files:**
- `src/lib/seed/__tests__/gap-check.test.ts`
- `src/lib/seed/__tests__/idempotency.step39.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 358 remediation`.

## Step 359
**Target Files:**
- `src/lib/seed/__tests__/json-facade.test.ts`
- `src/lib/seed/__tests__/memory-facade.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 359 remediation`.

## Step 360
**Target Files:**
- `src/lib/seed/__tests__/orchestrator-v2.test.ts`
- `src/lib/seed/__tests__/orchestrator.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 360 remediation`.

## Step 361
**Target Files:**
- `src/lib/seed/__tests__/provider.test.tsx`
- `src/lib/seed/__tests__/relationship-integrity.step38.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 361 remediation`.

## Step 362
**Target Files:**
- `src/lib/seed/__tests__/sample-image-registry.test.ts`
- `src/lib/seed/__tests__/schema-ratchet.step37.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 362 remediation`.

## Step 363
**Target Files:**
- `src/lib/seed/__tests__/schemas-v2-bundle-validation.test.ts`
- `src/lib/seed/__tests__/schemas-v2-detailed-errors.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 363 remediation`.

## Step 364
**Target Files:**
- `src/lib/seed/__tests__/schemas-v2.test.ts`
- `src/lib/seed/__tests__/slice-render.step36.test.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 364 remediation`.

## Step 365
**Target Files:**
- `src/lib/seed/__tests__/telemetry-store.test.ts`
- `src/lib/seed/__tests__/useSeededEmptyStateAction.step35.test.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 365 remediation`.

## Step 366
**Target Files:**
- `src/lib/seed/__tests__/validate-bundle-loud.test.ts`
- `src/lib/setup/schemas.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 366 remediation`.

## Step 367
**Target Files:**
- `src/lib/setup/useSetupForm.ts`
- `src/lib/setup/__tests__/create-scenarios.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 367 remediation`.

## Step 368
**Target Files:**
- `src/lib/setup/__tests__/schemas.test.ts`
- `src/lib/shapes.functions.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 368 remediation`.

## Step 369
**Target Files:**
- `src/lib/shapes.server.ts`
- `src/lib/shell/sanitize-address.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 369 remediation`.

## Step 370
**Target Files:**
- `src/lib/shell/__tests__/sanitize-address.preserve.test.ts`
- `src/lib/shell/__tests__/sanitize-address.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 370 remediation`.

## Step 371
**Target Files:**
- `src/lib/shortcut-format.ts`
- `src/lib/shortcuts/formatCombo.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 371 remediation`.

## Step 372
**Target Files:**
- `src/lib/shortcuts/registry.ts`
- `src/lib/shortcuts/scopes.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 372 remediation`.

## Step 373
**Target Files:**
- `src/lib/shortcuts/useAriaKeyshortcuts.ts`
- `src/lib/shortcuts-store.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 373 remediation`.

## Step 374
**Target Files:**
- `src/lib/swatches/facade.ts`
- `src/lib/swatches/useSeededSwatches.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 374 remediation`.

## Step 375
**Target Files:**
- `src/lib/swatches/__tests__/useSeededSwatches.step33.test.tsx`
- `src/lib/type-tool/facade.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 375 remediation`.

## Step 376
**Target Files:**
- `src/lib/type-tool/__tests__/facade.test.ts`
- `src/lib/ui-prefs-store.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 376 remediation`.

## Step 377
**Target Files:**
- `src/lib/utils/query-wrapper.ts`
- `src/lib/utils.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 377 remediation`.

## Step 378
**Target Files:**
- `src/lib/workspace/layout-presets.ts`
- `src/lib/workspace/layout-slice.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 378 remediation`.

## Step 379
**Target Files:**
- `src/lib/workspace/panel-host-registry.ts`
- `src/lib/workspace/panel-registry.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 379 remediation`.

## Step 380
**Target Files:**
- `src/lib/workspace/__tests__/layout-slice.test.ts`
- `src/lib/workspace/__tests__/panel-registry.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 380 remediation`.

## Step 381
**Target Files:**
- `src/lib/__tests__/be-fetch.test.ts`
- `src/lib/__tests__/display-labels-functions.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 381 remediation`.

## Step 382
**Target Files:**
- `src/lib/__tests__/running-pill-position.test.ts`
- `src/lib/__tests__/ui-prefs-store.tooltip-mode.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 382 remediation`.

## Step 383
**Target Files:**
- `src/router.tsx`
- `src/routes/admin.debug.calibration-distributions.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 383 remediation`.

## Step 384
**Target Files:**
- `src/routes/admin.debug.calibration.tsx`
- `src/routes/admin.security.denial-burst.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 384 remediation`.

## Step 385
**Target Files:**
- `src/routes/ai-testing.tsx`
- `src/routes/api/camera.capture.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 385 remediation`.

## Step 386
**Target Files:**
- `src/routes/api/camera.defaults.ts`
- `src/routes/api/cli.ipc.$msgId.requeue.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 386 remediation`.

## Step 387
**Target Files:**
- `src/routes/api/cli.sessions.$runId.export.ts`
- `src/routes/api/cli.sessions.$runId.log.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 387 remediation`.

## Step 388
**Target Files:**
- `src/routes/api/public/health.live.ts`
- `src/routes/api/public/health.ready.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 388 remediation`.

## Step 389
**Target Files:**
- `src/routes/api/public/hooks/audit-retention.ts`
- `src/routes/api/__tests__/cli.sessions.log.proxy.test.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 389 remediation`.

## Step 390
**Target Files:**
- `src/routes/cli-sessions.$runId.tsx`
- `src/routes/cli-sessions.index.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 390 remediation`.

## Step 391
**Target Files:**
- `src/routes/cli.index.tsx`
- `src/routes/cli.ipc.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 391 remediation`.

## Step 392
**Target Files:**
- `src/routes/cli.rules.$ruleId.tsx`
- `src/routes/cli.rules.import.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 392 remediation`.

## Step 393
**Target Files:**
- `src/routes/cli.rules.tsx`
- `src/routes/cli.samples.$sampleId.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 393 remediation`.

## Step 394
**Target Files:**
- `src/routes/cli.samples.tsx`
- `src/routes/cli.sessions.$sessionId.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 394 remediation`.

## Step 395
**Target Files:**
- `src/routes/cli.sessions.compare.tsx`
- `src/routes/cli.sessions.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 395 remediation`.

## Step 396
**Target Files:**
- `src/routes/cli.settings.tsx`
- `src/routes/cli.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 396 remediation`.

## Step 397
**Target Files:**
- `src/routes/diagnostics.tsx`
- `src/routes/errors.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 397 remediation`.

## Step 398
**Target Files:**
- `src/routes/index.tsx`
- `src/routes/observability.runs.$runId.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 398 remediation`.

## Step 399
**Target Files:**
- `src/routes/observability.sessions.$cliInvocationId.ipc.tsx`
- `src/routes/observability.sessions.$cliInvocationId.logs.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 399 remediation`.

## Step 400
**Target Files:**
- `src/routes/observability.sessions.tsx`
- `src/routes/ops.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 400 remediation`.

## Step 401
**Target Files:**
- `src/routes/projects.$projectId.ai-testing-history.tsx`
- `src/routes/projects.$projectId.ai-testing.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 401 remediation`.

## Step 402
**Target Files:**
- `src/routes/projects.$projectId.camera.tsx`
- `src/routes/projects.$projectId.categories.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 402 remediation`.

## Step 403
**Target Files:**
- `src/routes/projects.$projectId.index.tsx`
- `src/routes/projects.$projectId.rulesets.$rulesetId.rules.$ruleId.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 403 remediation`.

## Step 404
**Target Files:**
- `src/routes/projects.$projectId.rulesets.$rulesetId.tsx`
- `src/routes/projects.$projectId.rulesets.index.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 404 remediation`.

## Step 405
**Target Files:**
- `src/routes/projects.$projectId.rulesets.new.tsx`
- `src/routes/projects.$projectId.rulesets.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 405 remediation`.

## Step 406
**Target Files:**
- `src/routes/projects.$projectId.runs.tsx`
- `src/routes/projects.$projectId.trial-run.$runId.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 406 remediation`.

## Step 407
**Target Files:**
- `src/routes/projects.$projectId.trial-run.tsx`
- `src/routes/projects.$projectId.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 407 remediation`.

## Step 408
**Target Files:**
- `src/routes/projects.index.tsx`
- `src/routes/projects.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 408 remediation`.

## Step 409
**Target Files:**
- `src/routes/results.tsx`
- `src/routes/run.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 409 remediation`.

## Step 410
**Target Files:**
- `src/routes/settings.camera.tsx`
- `src/routes/settings.index.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 410 remediation`.

## Step 411
**Target Files:**
- `src/routes/settings.license.tsx`
- `src/routes/settings.lighting.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 411 remediation`.

## Step 412
**Target Files:**
- `src/routes/settings.shortcuts.tsx`
- `src/routes/settings.trigger.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 412 remediation`.

## Step 413
**Target Files:**
- `src/routes/settings.tsx`
- `src/routes/setup.camera.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 413 remediation`.

## Step 414
**Target Files:**
- `src/routes/setup.categories.$id.tsx`
- `src/routes/setup.categories.index.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 414 remediation`.

## Step 415
**Target Files:**
- `src/routes/setup.categories.tsx`
- `src/routes/setup.chain-events.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 415 remediation`.

## Step 416
**Target Files:**
- `src/routes/setup.functions.tsx`
- `src/routes/setup.index.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 416 remediation`.

## Step 417
**Target Files:**
- `src/routes/setup.reference.tsx`
- `src/routes/setup.roi.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 417 remediation`.

## Step 418
**Target Files:**
- `src/routes/setup.rules.$id.tsx`
- `src/routes/setup.rules.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 418 remediation`.

## Step 419
**Target Files:**
- `src/routes/setup.tsx`
- `src/routes/shortcuts.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 419 remediation`.

## Step 420
**Target Files:**
- `src/routes/trial-run.tsx`
- `src/routes/__root.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 420 remediation`.

## Step 421
**Target Files:**
- `src/routes/__tests__/denial-burst-shell.test.tsx`
- `src/routes/__tests__/home-missing-data.test.tsx`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 421 remediation`.

## Step 422
**Target Files:**
- `src/routes/__tests__/home-smoke.test.tsx`
- `src/routeTree.gen.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 422 remediation`.

## Step 423
**Target Files:**
- `src/server.ts`
- `src/start.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 423 remediation`.

## Step 424
**Target Files:**
- `src/types/errors/ErrorCode.ts`
- `src/types/errors.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 424 remediation`.

## Step 425
**Target Files:**
- `src/types/rules/ColorModeType.ts`
- `src/types/rules/ConditionTypeType.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 425 remediation`.

## Step 426
**Target Files:**
- `src/types/rules/DndAxis.ts`
- `src/types/rules/DndMode.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 426 remediation`.

## Step 427
**Target Files:**
- `src/types/rules/PresenceModeType.ts`
- `src/types/rules/ReasonCodeType.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 427 remediation`.

## Step 428
**Target Files:**
- `src/types/rules/RuleColor.ts`
- `src/types/rules/RuleKind.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 428 remediation`.

## Step 429
**Target Files:**
- `src/types/rules/ValidationModeType.ts`
- `src/types/ruleset/ValidationModeType.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 429 remediation`.

## Step 430
**Target Files:**
- `src/types/run/RunStatus.ts`
- `src/types/ui/KeyboardKeyType.ts`
**Action Checklist:**
- [ ] Read `.lovable/coding-guidelines.md` and `spec/02-coding-guidelines-V2/*`.
- [ ] Enforce function length (15 max) and flatten nested `if`s.
- [ ] Enforce boolean naming (`is*`, `has*`, `can*`) and remove double negatives.
- [ ] Verify single blank line before `return` and `throw` (unless only statement in block).
- [ ] Convert string unions to Enums (must end with `Type`) and add namespace `isVariant` helpers.
- [ ] Replace raw Enum equality checks (`val === EnumType.X`) with namespace helpers (`EnumType.isX(val)`).
- [ ] Commit chunk: `refactor(compliance): step 430 remediation`.

---
*End of Plan*
