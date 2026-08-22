# Subtask 03: TypeScript Enums & Nullable Booleans

**Slug:** `03-ts-enums-and-nullable-booleans`
**Parent Plan:** `.lovable/plans/pending/01-coding-guideline-fixes.md`
**Target Area:** `src/lib/enums/`, `src/types/`
**Rules Violated:** `.lovable/strictly-avoid.md` § 2 (Enum Naming), `.lovable/memory/boolean-guidelines.md` (Strict Non-Nullability)

## 1. Context & Root Cause
1. `HtmlTag` in `src/lib/enums/html.ts` and `ValidationStatus` in `src/lib/enums/validation.ts` lack the mandatory `Type` suffix.
2. Interfaces contain `?: boolean` or `boolean | null` / `boolean | undefined`.
**Root Cause:** Legacy enum creation without Type suffix; optional props in React interfaces.
**Fallout Analysis:**
- Renaming Enums requires updating all imports across `src/`.
- Changing optional boolean props requires assigning default `false` values at destructuring sites.

## 2. Granular Execution Steps (Steps 36-55)

### Step 36: Rename `HtmlTag` to `HtmlTagType`
- **File:** [`src/lib/enums/html.ts`](file:///D:/wp-work/riseup-asia/cat-my/src/lib/enums/html.ts)
- **Action:** Rename enum to `HtmlTagType` and update all consumer imports.
- **Fallout Check:** Run `bunx tsgo --noEmit` to verify all imports resolve.

### Step 37: Rename `ValidationStatus` to `ValidationStatusType`
- **File:** [`src/lib/enums/validation.ts`](file:///D:/wp-work/riseup-asia/cat-my/src/lib/enums/validation.ts)
- **Action:** Rename enum to `ValidationStatusType` and update all consumer imports.
- **Fallout Check:** Run `bunx tsgo --noEmit`.

### Step 38: Eliminate nullable/optional boolean in `src/router.tsx`
- **File:** [`src/router.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/router.tsx)
- **Line:** 10
- **Violation:** `hasVisibility?: boolean` in `queryMeta: { hasVisibility?: boolean };`
- **Action:** Replace with strict `boolean` and default to `false`.
- **Fallout Check:** Ensure destructuring assigns `= false` without type errors.

### Step 39: Eliminate nullable/optional boolean in `src/router.tsx`
- **File:** [`src/router.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/router.tsx)
- **Line:** 11
- **Violation:** `hasVisibility?: boolean` in `mutationMeta: { hasVisibility?: boolean; suppressGlobalError?: boolean };`
- **Action:** Replace with strict `boolean` and default to `false`.
- **Fallout Check:** Ensure destructuring assigns `= false` without type errors.

### Step 40: Eliminate nullable/optional boolean in `src/router.tsx`
- **File:** [`src/router.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/router.tsx)
- **Line:** 11
- **Violation:** `suppressGlobalError?: boolean` in `mutationMeta: { hasVisibility?: boolean; suppressGlobalError?: boolean };`
- **Action:** Replace with strict `boolean` and default to `false`.
- **Fallout Check:** Ensure destructuring assigns `= false` without type errors.

### Step 41: Eliminate nullable/optional boolean in `src/components/app-shell/panels/DockableFrame.tsx`
- **File:** [`src/components/app-shell/panels/DockableFrame.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/panels/DockableFrame.tsx)
- **Line:** 97
- **Violation:** `hideWhenHidden?: boolean` in `hideWhenHidden?: boolean;`
- **Action:** Replace with strict `boolean` and default to `false`.
- **Fallout Check:** Ensure destructuring assigns `= false` without type errors.

### Step 42: Eliminate nullable/optional boolean in `src/components/app-shell/panels/DockSlot.tsx`
- **File:** [`src/components/app-shell/panels/DockSlot.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/panels/DockSlot.tsx)
- **Line:** 26
- **Violation:** `dragActive?: boolean` in `dragActive?: boolean;`
- **Action:** Replace with strict `boolean` and default to `false`.
- **Fallout Check:** Ensure destructuring assigns `= false` without type errors.

### Step 43: Eliminate nullable/optional boolean in `src/components/app-shell/panels/PanelChrome.tsx`
- **File:** [`src/components/app-shell/panels/PanelChrome.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/panels/PanelChrome.tsx)
- **Line:** 33
- **Violation:** `collapsed?: boolean` in `collapsed?: boolean;`
- **Action:** Replace with strict `boolean` and default to `false`.
- **Fallout Check:** Ensure destructuring assigns `= false` without type errors.

### Step 44: Eliminate nullable/optional boolean in `src/components/cli/AgentLogo.tsx`
- **File:** [`src/components/cli/AgentLogo.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/AgentLogo.tsx)
- **Line:** 21
- **Violation:** `showWordmark?: boolean` in `showWordmark?: boolean;`
- **Action:** Replace with strict `boolean` and default to `false`.
- **Fallout Check:** Ensure destructuring assigns `= false` without type errors.

### Step 45: Eliminate nullable/optional boolean in `src/components/cli/copy-envelope-button.tsx`
- **File:** [`src/components/cli/copy-envelope-button.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/copy-envelope-button.tsx)
- **Line:** 85
- **Violation:** `compact?: boolean` in `compact?: boolean;`
- **Action:** Replace with strict `boolean` and default to `false`.
- **Fallout Check:** Ensure destructuring assigns `= false` without type errors.

### Step 46: Eliminate nullable/optional boolean in `src/components/cli/envelope-viewer.tsx`
- **File:** [`src/components/cli/envelope-viewer.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/envelope-viewer.tsx)
- **Line:** 52
- **Violation:** `DEV?: boolean` in `return Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);`
- **Action:** Replace with strict `boolean` and default to `false`.
- **Fallout Check:** Ensure destructuring assigns `= false` without type errors.

### Step 47: Eliminate nullable/optional boolean in `src/components/cli/envelope-viewer.tsx`
- **File:** [`src/components/cli/envelope-viewer.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/envelope-viewer.tsx)
- **Line:** 165
- **Violation:** `defaultOpen?: boolean` in `defaultOpen?: boolean;`
- **Action:** Replace with strict `boolean` and default to `false`.
- **Fallout Check:** Ensure destructuring assigns `= false` without type errors.

### Step 48: Eliminate nullable/optional boolean in `src/components/cli/envelope-viewer.tsx`
- **File:** [`src/components/cli/envelope-viewer.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/envelope-viewer.tsx)
- **Line:** 197
- **Violation:** `forceShowMethodsStack?: boolean` in `forceShowMethodsStack?: boolean;`
- **Action:** Replace with strict `boolean` and default to `false`.
- **Fallout Check:** Ensure destructuring assigns `= false` without type errors.

### Step 49: Eliminate nullable/optional boolean in `src/components/cli/ExportSessionButton.tsx`
- **File:** [`src/components/cli/ExportSessionButton.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/ExportSessionButton.tsx)
- **Line:** 29
- **Violation:** `compact?: boolean` in `compact?: boolean;`
- **Action:** Replace with strict `boolean` and default to `false`.
- **Fallout Check:** Ensure destructuring assigns `= false` without type errors.

### Step 50: Eliminate nullable/optional boolean in `src/components/cli/status-pill.tsx`
- **File:** [`src/components/cli/status-pill.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/status-pill.tsx)
- **Line:** 60
- **Violation:** `dot?: boolean` in `dot?: boolean;`
- **Action:** Replace with strict `boolean` and default to `false`.
- **Fallout Check:** Ensure destructuring assigns `= false` without type errors.

### Step 51: Eliminate nullable/optional boolean in `src/components/cli/status-pill.tsx`
- **File:** [`src/components/cli/status-pill.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/status-pill.tsx)
- **Line:** 62
- **Violation:** `outline?: boolean` in `outline?: boolean;`
- **Action:** Replace with strict `boolean` and default to `false`.
- **Fallout Check:** Ensure destructuring assigns `= false` without type errors.

### Step 52: Eliminate nullable/optional boolean in `src/components/common/EmptyState.tsx`
- **File:** [`src/components/common/EmptyState.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/common/EmptyState.tsx)
- **Line:** 38
- **Violation:** `compact?: boolean` in `compact?: boolean;`
- **Action:** Replace with strict `boolean` and default to `false`.
- **Fallout Check:** Ensure destructuring assigns `= false` without type errors.

### Step 53: Eliminate nullable/optional boolean in `src/components/editor/CollapsibleSection.tsx`
- **File:** [`src/components/editor/CollapsibleSection.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/CollapsibleSection.tsx)
- **Line:** 90
- **Violation:** `defaultOpen?: boolean` in `defaultOpen?: boolean;`
- **Action:** Replace with strict `boolean` and default to `false`.
- **Fallout Check:** Ensure destructuring assigns `= false` without type errors.

### Step 54: Eliminate nullable/optional boolean in `src/components/editor/PropertiesPanel.tsx`
- **File:** [`src/components/editor/PropertiesPanel.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/PropertiesPanel.tsx)
- **Line:** 520
- **Violation:** `disabled?: boolean` in `disabled?: boolean;`
- **Action:** Replace with strict `boolean` and default to `false`.
- **Fallout Check:** Ensure destructuring assigns `= false` without type errors.

### Step 55: Eliminate nullable/optional boolean in `src/components/editor/canvas/AngleZoneOverlay.tsx`
- **File:** [`src/components/editor/canvas/AngleZoneOverlay.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/canvas/AngleZoneOverlay.tsx)
- **Line:** 27
- **Violation:** `atBound?: boolean` in `atBound?: boolean;`
- **Action:** Replace with strict `boolean` and default to `false`.
- **Fallout Check:** Ensure destructuring assigns `= false` without type errors.
