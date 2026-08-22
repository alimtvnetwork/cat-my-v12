# Subtask 01: TypeScript Inverted Booleans Remediation

**Slug:** `01-ts-inverted-booleans`
**Parent Plan:** `.lovable/plans/pending/01-coding-guideline-fixes.md`
**Target Area:** `src/` (Components, Routes, Lib, Hooks)
**Rules Violated:** `spec/02-coding-guidelines/01-cross-language/02-boolean-principles/01-naming-prefixes.md`, `.lovable/coding-guidelines.md` § Boolean Naming

## 1. Context & Root Cause
Past sessions introduced negative checks using `!` on boolean variables and outcomes (e.g. `!canRun`, `!hasTunedValues`, `!isDragActive`, `!isSuccess`).
**Root Cause:** Developers used standard JS `!flag` idioms rather than adhering to explicit positively-named boolean comparisons (`hasTunedValues === false` or `isFailed`).
**Fallout Analysis:**
- Direct UI conditional rendering checks could invert if types are altered without changing callers.
- Safe refactor: Replace `!isX` with explicit `isX === false` or extract a positively named boolean `const isNotX = ...`.

## 2. Granular Execution Steps (Steps 1-20)

### Step 1: Fix inverted boolean in `src/components/app-shell/LightingReadout.tsx`
- **File:** [`src/components/app-shell/LightingReadout.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/LightingReadout.tsx)
- **Line:** 84
- **Violation:** `!hasTunedValues` in `const isDefault = !hasTunedValues;`
- **Action:** Replace negation with explicit boolean comparison or positive guard variable.
- **Fallout Check:** Verify component renders identically under true and false states.

### Step 2: Fix inverted boolean in `src/components/app-shell/ProjectRunButton.tsx`
- **File:** [`src/components/app-shell/ProjectRunButton.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/ProjectRunButton.tsx)
- **Line:** 44
- **Violation:** `!canRun` in `if (!canRun || busy) return;`
- **Action:** Replace negation with explicit boolean comparison or positive guard variable.
- **Fallout Check:** Verify component renders identically under true and false states.

### Step 3: Fix inverted boolean in `src/components/app-shell/ProjectRunButton.tsx`
- **File:** [`src/components/app-shell/ProjectRunButton.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/ProjectRunButton.tsx)
- **Line:** 72
- **Violation:** `!canRun` in `disabled={!canRun}`
- **Action:** Replace negation with explicit boolean comparison or positive guard variable.
- **Fallout Check:** Verify component renders identically under true and false states.

### Step 4: Fix inverted boolean in `src/components/app-shell/ProjectRunButton.tsx`
- **File:** [`src/components/app-shell/ProjectRunButton.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/ProjectRunButton.tsx)
- **Line:** 142
- **Violation:** `!canRun` in `disabled={busy || !canRun}`
- **Action:** Replace negation with explicit boolean comparison or positive guard variable.
- **Fallout Check:** Verify component renders identically under true and false states.

### Step 5: Fix inverted boolean in `src/components/app-shell/RunningPill.tsx`
- **File:** [`src/components/app-shell/RunningPill.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/RunningPill.tsx)
- **Line:** 55
- **Violation:** `!isE2E` in `const isProduction = !isE2E;`
- **Action:** Replace negation with explicit boolean comparison or positive guard variable.
- **Fallout Check:** Verify component renders identically under true and false states.

### Step 6: Fix inverted boolean in `src/components/app-shell/panels/FloatingWindow.tsx`
- **File:** [`src/components/app-shell/panels/FloatingWindow.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/panels/FloatingWindow.tsx)
- **Line:** 116
- **Violation:** `!isHandle` in `if (!isHandle) {`
- **Action:** Replace negation with explicit boolean comparison or positive guard variable.
- **Fallout Check:** Verify component renders identically under true and false states.

### Step 7: Fix inverted boolean in `src/components/app-shell/panels/FloatingWindow.tsx`
- **File:** [`src/components/app-shell/panels/FloatingWindow.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/panels/FloatingWindow.tsx)
- **Line:** 147
- **Violation:** `!hasMovedRef` in `if (!hasMovedRef.current) {`
- **Action:** Replace negation with explicit boolean comparison or positive guard variable.
- **Fallout Check:** Verify component renders identically under true and false states.

### Step 8: Fix inverted boolean in `src/components/app-shell/panels/PanelHost.tsx`
- **File:** [`src/components/app-shell/panels/PanelHost.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/panels/PanelHost.tsx)
- **Line:** 274
- **Violation:** `!isHandle` in `if (!isHandle) {`
- **Action:** Replace negation with explicit boolean comparison or positive guard variable.
- **Fallout Check:** Verify component renders identically under true and false states.

### Step 9: Fix inverted boolean in `src/components/app-shell/panels/PanelHost.tsx`
- **File:** [`src/components/app-shell/panels/PanelHost.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/panels/PanelHost.tsx)
- **Line:** 457
- **Violation:** `!hasAny` in `if (!hasAny && !isDragActive) {`
- **Action:** Replace negation with explicit boolean comparison or positive guard variable.
- **Fallout Check:** Verify component renders identically under true and false states.

### Step 10: Fix inverted boolean in `src/components/app-shell/panels/PanelHost.tsx`
- **File:** [`src/components/app-shell/panels/PanelHost.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/panels/PanelHost.tsx)
- **Line:** 457
- **Violation:** `!isDragActive` in `if (!hasAny && !isDragActive) {`
- **Action:** Replace negation with explicit boolean comparison or positive guard variable.
- **Fallout Check:** Verify component renders identically under true and false states.

### Step 11: Fix inverted boolean in `src/components/app-shell/panels/PanelHost.tsx`
- **File:** [`src/components/app-shell/panels/PanelHost.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/panels/PanelHost.tsx)
- **Line:** 482
- **Violation:** `!hasAny` in `if (!hasAny && !isDragActive) {`
- **Action:** Replace negation with explicit boolean comparison or positive guard variable.
- **Fallout Check:** Verify component renders identically under true and false states.

### Step 12: Fix inverted boolean in `src/components/app-shell/panels/PanelHost.tsx`
- **File:** [`src/components/app-shell/panels/PanelHost.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/panels/PanelHost.tsx)
- **Line:** 482
- **Violation:** `!isDragActive` in `if (!hasAny && !isDragActive) {`
- **Action:** Replace negation with explicit boolean comparison or positive guard variable.
- **Fallout Check:** Verify component renders identically under true and false states.

### Step 13: Fix inverted boolean in `src/components/app-shell/panels/PanelHost.tsx`
- **File:** [`src/components/app-shell/panels/PanelHost.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/panels/PanelHost.tsx)
- **Line:** 527
- **Violation:** `!hasAny` in `if (!hasAny && !isDragActive) {`
- **Action:** Replace negation with explicit boolean comparison or positive guard variable.
- **Fallout Check:** Verify component renders identically under true and false states.

### Step 14: Fix inverted boolean in `src/components/app-shell/panels/PanelHost.tsx`
- **File:** [`src/components/app-shell/panels/PanelHost.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/panels/PanelHost.tsx)
- **Line:** 527
- **Violation:** `!isDragActive` in `if (!hasAny && !isDragActive) {`
- **Action:** Replace negation with explicit boolean comparison or positive guard variable.
- **Fallout Check:** Verify component renders identically under true and false states.

### Step 15: Fix inverted boolean in `src/components/cli/DoctorPanel.tsx`
- **File:** [`src/components/cli/DoctorPanel.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/DoctorPanel.tsx)
- **Line:** 58
- **Violation:** `!mutation.isPending` in `if (!report && !mutation.isPending && !error) {`
- **Action:** Replace negation with explicit boolean comparison or positive guard variable.
- **Fallout Check:** Verify component renders identically under true and false states.

### Step 16: Fix inverted boolean in `src/components/cli/GlobalCliStatusWidget.tsx`
- **File:** [`src/components/cli/GlobalCliStatusWidget.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/GlobalCliStatusWidget.tsx)
- **Line:** 111
- **Violation:** `!query.isPending` in `const unavailable = !status && !query.isPending;`
- **Action:** Replace negation with explicit boolean comparison or positive guard variable.
- **Fallout Check:** Verify component renders identically under true and false states.

### Step 17: Fix inverted boolean in `src/components/diagnostics/SeedGapCheckSection.tsx`
- **File:** [`src/components/diagnostics/SeedGapCheckSection.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/diagnostics/SeedGapCheckSection.tsx)
- **Line:** 49
- **Violation:** `!isInvalid` in `(!isInvalid(report) ? "border-ca-ok text-ca-ok" : "border-ca-ng text-ca-ng")`
- **Action:** Replace negation with explicit boolean comparison or positive guard variable.
- **Fallout Check:** Verify component renders identically under true and false states.

### Step 18: Fix inverted boolean in `src/components/diagnostics/SeedGapCheckSection.tsx`
- **File:** [`src/components/diagnostics/SeedGapCheckSection.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/diagnostics/SeedGapCheckSection.tsx)
- **Line:** 52
- **Violation:** `!isInvalid` in `{!isInvalid(report) ? "all links resolved" : `${report.findings.length} missing`}`
- **Action:** Replace negation with explicit boolean comparison or positive guard variable.
- **Fallout Check:** Verify component renders identically under true and false states.

### Step 19: Fix inverted boolean in `src/components/diagnostics/SeedGapCheckSection.tsx`
- **File:** [`src/components/diagnostics/SeedGapCheckSection.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/diagnostics/SeedGapCheckSection.tsx)
- **Line:** 71
- **Violation:** `!isInvalid` in `) : report && !isInvalid(report) ? (`
- **Action:** Replace negation with explicit boolean comparison or positive guard variable.
- **Fallout Check:** Verify component renders identically under true and false states.

### Step 20: Fix inverted boolean in `src/components/editor/FloatingInspector.tsx`
- **File:** [`src/components/editor/FloatingInspector.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/FloatingInspector.tsx)
- **Line:** 117
- **Violation:** `!hasSelection` in `const lacksSelection = !hasSelection;`
- **Action:** Replace negation with explicit boolean comparison or positive guard variable.
- **Fallout Check:** Verify component renders identically under true and false states.
