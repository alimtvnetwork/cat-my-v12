# Subtask 02: Canvas Selection Unblock & Interaction Fix

- **Parent Task**: Task 88 (`snap-24-event-20-ui-and-functionality-issues`)
- **Subtask ID**: Subtask-02
- **Owner**: Subtask Worker 2
- **Status**: COMPLETED
- **Specification Reference**: [`02-spec/21-app/88-snap-24-event-20-ui-and-functionality-issues/02-canvas-selection-unblock-spec.md`](file;02-spec/21-app/88-snap-24-event-20-ui-and-functionality-issues/02-canvas-selection-unblock-spec.md)
- **Target Files Owned**:
  - `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
  - `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx`

---

## 1. Executive Summary & Objective

Resolve critical canvas interaction deadlocks and coordinate calculation bugs:
1. **Fix Hit-Test Priority Inversion**: In `VisualToolWorkpieceCanvas.tsx`, reorder pointer down evaluation so other rules in `overlayRules` can be click-selected even when a large rule ($800 \times 520\text{ px}$) is active. Prioritize: (1) Corner handles, (2) 20px header grip bar, (3) Other rule selection, (4) Tool features, (5) Active rule interior body drag fallback.
2. **Fix Clamping Math Collapse**: Prevent bounding coordinates from collapsing to $(0,0)$ when $dx = 0, dy = 0$ or when the rule width equals or exceeds the image resolution.
3. **Decouple Body Double-Click from Locking**: Prevent accidental locking when double-clicking the ROI interior body. Restrict lock toggles exclusively to the top header grip lock badge.
4. **Synchronize Lock State**: Pass `onToggleLocked={railHandlers.onToggleLocked}` from `WorkpieceAnalyzeWorkspace.tsx` into `VisualToolWorkpieceCanvas` to ensure lock state changes persist across the ruleset store and sidebar panels.

---

## 2. Step-by-Step Implementation Milestones

### Milestone 2.1: Reorder Hit-Test Priorities in `handlePointerDown`
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Action**:
  - In `handlePointerDown`, keep corner handle checks as Priority 1.
  - Elevate the 20px header grip bar (`isInsideHeader`) check as Priority 2 for dragging the active rule.
  - Elevate the other rules selection check (`overlayRules.find(r => r.id !== selectedRuleId && pointInside(r))`) as Priority 3. If a different rule is clicked, immediately invoke `onSelectRule(r.id)` and return.
  - Move the active rule interior body drag (`isInsideRoi`) to Priority 5 as a fallback after all other features and rules have been evaluated.
- **Verification**: Selecting a large $800 \times 520$ rule and clicking on a smaller nested rule immediately transfers selection to the smaller rule without dragging the large rule.

### Milestone 2.2: Fix Clamping Math in `handlePointerMove`
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Action**:
  - In `handlePointerMove` under `if (isMovingRoi && dragStartPos && onChangeRoi)`:
    - Add early exit for zero delta: `if (dx === 0 && dy === 0) return;`
    - Update upper boundary calculation:
      ```typescript
      const maxAllowedX = naturalW > initial.width ? naturalW - initial.width : Math.max(0, initial.x);
      const maxAllowedY = naturalH > initial.height ? naturalH - initial.height : Math.max(0, initial.y);
      ```
    - Clamp $x$ and $y$ using safe bounds, preventing sudden drops to $0$.
- **Verification**: Dragging a rule with width $\ge 960$ with small or zero delta maintains its $x$ coordinate without collapsing to $0$.

### Milestone 2.3: Decouple Body Double-Click from Lock Toggle
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Action**:
  - In `handleDoubleClick`:
    - Remove `isInsideRoi` from the condition `if (isInsideHeader || isInsideRoi)`.
    - Retain lock toggling strictly for `if (isInsideHeader)`.
- **Verification**: Double-clicking inside the active rule's body does not toggle lock status. Double-clicking the top header bar toggles lock status.

### Milestone 2.4: Wire `onToggleLocked` in `WorkpieceAnalyzeWorkspace.tsx`
- **Target File**: `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx`
- **Action**:
  - In the JSX rendering `<VisualToolWorkpieceCanvas ... />`, pass:
    ```tsx
    onToggleLocked={railHandlers.onToggleLocked}
    onBringToFront={railHandlers.onBringToFront}
    onSendToBack={railHandlers.onSendToBack}
    ```
  - Verify that when the canvas invokes `onToggleLocked`, the rules store updates `rule.isLocked` and propagates to the `InspectionHierarchyTree` and `PhotoshopLayersPanel`.
- **Verification**: Toggling lock via header updates the lock icon in the sidebar tree and layers panel.

### Milestone 2.5: Verification & Anti-Asset Invariant
- **Action**:
  - Run type checks and verify clean compilation.
  - Verify that no bug screenshots are saved into `src/assets/`.
  - Validate that interaction feels responsive and deterministic.

---

## 3. Risk Analysis & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| User intends to move active rule by clicking body, but accidentally selects an underlying rule | Unexpected rule selection switch | Moving rules via their prominent 20px top header grip bar is guaranteed unambiguous; clicking inside a nested rule intentionally switches selection. |
| Complex multi-rule layouts with heavy overlap | Hard to select bottom rule | Reverse iteration over `overlayRules` ensures the topmost visual rule is hit first; right-click context menu provides explicit rule selection fallback. |
| Zero delta guard blocks valid sub-pixel moves | None | Canvas coordinates are already rounded integer pixels; sub-pixel jitter elimination is beneficial for stability. |
