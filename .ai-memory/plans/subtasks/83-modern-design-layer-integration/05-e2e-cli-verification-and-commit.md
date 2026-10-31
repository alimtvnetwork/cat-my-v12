# Subtask 05: End-to-End Verification, CLI Test Runner & Atomic Bot Commit

- **Subtask ID**: `sub-084333-task-05`
- **Parent Task**: `task-20261031084253-modern-design-layer-integration`
- **Owner**: E2E Verification & Bot Release Agent
- **Status**: PENDING
- **Spec Citations**:
  - `02-spec/21-app/83-modern-design-layer-integration/04-implementation-guide-spec.md` (Section 4)

---

## 1. Goal

Execute rigorous end-to-end (E2E) automated verification of all modernized vision layer components, validate TypeScript compilation, verify strict coding guidelines compliance, ensure zero regressions across existing test suites, and execute an atomic GitMap hyphen-separated commit.

---

## 2. Verification Protocol & Quality Gates

### 2.1 Static Analysis & Quality Verification
1. **TypeScript Type Safety**:
   ```bash
   pnpm exec tsc --noEmit
   ```
   - Target: 0 errors across all modified components.
2. **ESLint & Coding Guideline Compliance**:
   ```bash
   pnpm exec eslint src/components/vision/
   ```
   - Target: Strict positive booleans (`isActive`, `isLocked`, `isMaskEnabled`, `isInverted`), no bare void, proper parameter structs, vertical whitespace discipline.

### 2.2 Functional & Visual Assertion Test Suite
- **RegionOverlay Tests**:
  - Verify that 8 white/slate handles are rendered with `data-testid="handle-nw"`, etc.
  - Assert that `handleHeaderPointerDown` initiates pointer capture while inner div does not.
  - Assert that `isActive = false` hides handles and displays dashed border.
- **RoiToolbar Tests**:
  - Verify buttons for `btn-toggle-lock`, `btn-shape-selector`, `btn-toggle-mask`, `btn-toggle-invert`, `btn-crop-template`, and `btn-opacity-slider`.
  - Assert that clicking `btn-toggle-lock` toggles `isLocked` state.
  - Assert that shape cycling shifts from `rectangle` -> `square` -> `circle`.
  - Assert that slider input modifies opacity percentage.
- **Layers Tab Integration Tests**:
  - Assert that `ToolTabs` renders the `"Layers"` tab.
  - Assert that selecting `"Layers"` renders `PhotoshopLayersPanel` within `StandardToolPanel`.
  - Verify bi-directional sync between layer selection and active ROI.
- **PatternMatchCanvas Static Handles Tests**:
  - Assert that in static inspection view, the 2D canvas draws 8 handles and the 20px header bar.

---

## 3. Atomic Commit Ceremony

Upon 100% green verification:
1. Verify working tree status:
   - Ensure only designated vision components, specifications, and plan files are staged.
2. Construct atomic GitMap commit message:
   ```text
   feat(vision): modern design layer integration - white-slate handles, in-roi toolbar & photoshop layers tab
   ```
3. Comply strictly with subagent constraints:
   - Do NOT push directly to remote; report all artifacts and changes back to parent agent for final integration.
