# Subtask 08: TypeScript Nested Ifs & Control Flow Flattening

**Slug:** `08-ts-nested-ifs-and-guard-clauses`
**Parent Plan:** `.lovable/plans/pending/01-coding-guideline-fixes.md`
**Target Area:** `src/`
**Rules Violated:** `spec/02-coding-guidelines/01-cross-language/04-code-style/01-braces-and-nesting.md` (Rule 2: Zero Nested If - Absolute Ban)

## 1. Context & Root Cause
Nested `if` statements inside UI event handlers and route components.
**Root Cause:** Multiple condition layers added sequentially without early-return flattening.
**Fallout Analysis:**
- Flattening with early returns improves readability and reduces cyclomatic complexity. Ensure early returns do not bypass required hook cleanups.

## 2. Granular Execution Steps (Steps 136-160)

### Step 136: Flatten nested if in `src/components/app-shell/PanelSearchPalette.tsx`
- **File:** [`src/components/app-shell/PanelSearchPalette.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/PanelSearchPalette.tsx)
- **Line:** 66 (nested inside parent line 61)
- **Violation:** `if (firstOpen) state.collapseOthers(firstOpen.id);`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.

### Step 137: Flatten nested if in `src/components/app-shell/RunningPill.tsx`
- **File:** [`src/components/app-shell/RunningPill.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/RunningPill.tsx)
- **Line:** 68 (nested inside parent line 53)
- **Violation:** `if (window.__runningPillTestHooks === api) delete window.__runningPillTestHooks;`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.

### Step 138: Flatten nested if in `src/components/app-shell/panels/PanelHost.tsx`
- **File:** [`src/components/app-shell/panels/PanelHost.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/panels/PanelHost.tsx)
- **Line:** 98 (nested inside parent line 97)
- **Violation:** `if (getPanel(panelId) === undefined) return;`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.

### Step 139: Flatten nested if in `src/components/app-shell/panels/PanelHost.tsx`
- **File:** [`src/components/app-shell/panels/PanelHost.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/panels/PanelHost.tsx)
- **Line:** 181 (nested inside parent line 177)
- **Violation:** `if (overSlot) {`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.

### Step 140: Flatten nested if in `src/components/app-shell/panels/PanelHost.tsx`
- **File:** [`src/components/app-shell/panels/PanelHost.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/panels/PanelHost.tsx)
- **Line:** 182 (nested inside parent line 181)
- **Violation:** `if (getPanel(panelId) === undefined) return;`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.

### Step 141: Flatten nested if in `src/components/app-shell/panels/PanelHost.tsx`
- **File:** [`src/components/app-shell/panels/PanelHost.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/panels/PanelHost.tsx)
- **Line:** 263 (nested inside parent line 260)
- **Violation:** `if (match) {`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.

### Step 142: Flatten nested if in `src/components/cli/copy-envelope-button.tsx`
- **File:** [`src/components/cli/copy-envelope-button.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/copy-envelope-button.tsx)
- **Line:** 103 (nested inside parent line 64)
- **Violation:** `if (payload === null) {`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.

### Step 143: Flatten nested if in `src/components/cli/envelope-viewer.tsx`
- **File:** [`src/components/cli/envelope-viewer.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/envelope-viewer.tsx)
- **Line:** 118 (nested inside parent line 117)
- **Violation:** `if (value.length === 0) return <span className="text-ca-ink-muted">[]</span>;`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.

### Step 144: Flatten nested if in `src/components/cli/envelope-viewer.tsx`
- **File:** [`src/components/cli/envelope-viewer.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/envelope-viewer.tsx)
- **Line:** 134 (nested inside parent line 131)
- **Violation:** `if (entries.length === 0) return <span className="text-ca-ink-muted">{"{}"}</span>;`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.

### Step 145: Flatten nested if in `src/components/cli/GlobalCliStatusWidget.tsx`
- **File:** [`src/components/cli/GlobalCliStatusWidget.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/GlobalCliStatusWidget.tsx)
- **Line:** 61 (nested inside parent line 27)
- **Violation:** `if (typeof document === "undefined") return;`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.

### Step 146: Flatten nested if in `src/components/cli/LiveRegion.tsx`
- **File:** [`src/components/cli/LiveRegion.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/LiveRegion.tsx)
- **Line:** 87 (nested inside parent line 84)
- **Violation:** `if (politeTimer !== null) return;`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.

### Step 147: Flatten nested if in `src/components/cli/LiveRegion.tsx`
- **File:** [`src/components/cli/LiveRegion.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/LiveRegion.tsx)
- **Line:** 92 (nested inside parent line 84)
- **Violation:** `if (assertiveTimer !== null) return;`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.

### Step 148: Flatten nested if in `src/components/cli/LiveRegion.tsx`
- **File:** [`src/components/cli/LiveRegion.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/LiveRegion.tsx)
- **Line:** 113 (nested inside parent line 81)
- **Violation:** `if (priority === "polite") {`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.

### Step 149: Flatten nested if in `src/components/cli/LiveRegion.tsx`
- **File:** [`src/components/cli/LiveRegion.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/LiveRegion.tsx)
- **Line:** 114 (nested inside parent line 113)
- **Violation:** `if (lastPolite.current === message) {`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.

### Step 150: Flatten nested if in `src/components/cli/UserConfigForm.tsx`
- **File:** [`src/components/cli/UserConfigForm.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/UserConfigForm.tsx)
- **Line:** 59 (nested inside parent line 58)
- **Violation:** `if (/^-?\d+$/.test(raw) === false) return { value: null, error: "must be an integer" };`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.

### Step 151: Flatten nested if in `src/components/cli/UserConfigForm.tsx`
- **File:** [`src/components/cli/UserConfigForm.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/UserConfigForm.tsx)
- **Line:** 67 (nested inside parent line 64)
- **Violation:** `if (Number.isFinite(n) === false) return { value: null, error: "must be a number" };`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.

### Step 152: Flatten nested if in `src/components/editor/CollapsibleSection.tsx`
- **File:** [`src/components/editor/CollapsibleSection.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/CollapsibleSection.tsx)
- **Line:** 45 (nested inside parent line 42)
- **Violation:** `if (tag === HtmlTag.Input || tag === HtmlTag.Textarea || tag === HtmlTag.Select) return;`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.

### Step 153: Flatten nested if in `src/components/editor/CollapsibleSection.tsx`
- **File:** [`src/components/editor/CollapsibleSection.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/CollapsibleSection.tsx)
- **Line:** 77 (nested inside parent line 73)
- **Violation:** `if (raw === "1") return true;`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.

### Step 154: Flatten nested if in `src/components/editor/FloatingInspector.tsx`
- **File:** [`src/components/editor/FloatingInspector.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/FloatingInspector.tsx)
- **Line:** 162 (nested inside parent line 156)
- **Violation:** `if (p) applyPos(p.x, p.y);`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.

### Step 155: Flatten nested if in `src/components/editor/InspectorSurface.tsx`
- **File:** [`src/components/editor/InspectorSurface.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/InspectorSurface.tsx)
- **Line:** 59 (nested inside parent line 54)
- **Violation:** `if (anchorIdx >= 0 && targetIdx >= 0) {`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.

### Step 156: Flatten nested if in `src/components/editor/PreviewSettingsPanel.tsx`
- **File:** [`src/components/editor/PreviewSettingsPanel.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/PreviewSettingsPanel.tsx)
- **Line:** 69 (nested inside parent line 65)
- **Violation:** `if (isTyping(e.target)) return;`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.

### Step 157: Flatten nested if in `src/components/editor/PropertiesPanel.tsx`
- **File:** [`src/components/editor/PropertiesPanel.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/PropertiesPanel.tsx)
- **Line:** 439 (nested inside parent line 436)
- **Violation:** `if (next.width !== undefined) height = Math.max(1, Math.round(next.width / ratio));`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.

### Step 158: Flatten nested if in `src/components/editor/canvas/AlignmentGuides.tsx`
- **File:** [`src/components/editor/canvas/AlignmentGuides.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/canvas/AlignmentGuides.tsx)
- **Line:** 40 (nested inside parent line 28)
- **Violation:** `if (g.orientation === "v") {`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.

### Step 159: Flatten nested if in `src/components/editor/canvas/CanvasViewport.tsx`
- **File:** [`src/components/editor/canvas/CanvasViewport.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/canvas/CanvasViewport.tsx)
- **Line:** 203 (nested inside parent line 199)
- **Violation:** `if (!raw) return SPOTLIGHT_DEFAULTS;`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.

### Step 160: Flatten nested if in `src/components/editor/canvas/CanvasViewport.tsx`
- **File:** [`src/components/editor/canvas/CanvasViewport.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/canvas/CanvasViewport.tsx)
- **Line:** 315 (nested inside parent line 311)
- **Violation:** `if (!raw) return;`
- **Action:** Flatten using guard clause, early return, or extracted positive composite boolean.
- **Fallout Check:** Test component behavior to ensure all conditional paths execute correctly.
