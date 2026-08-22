# Subtask 04: TypeScript Banned Short Identifiers Remediation

**Slug:** `04-ts-banned-identifiers`
**Parent Plan:** `.lovable/plans/pending/01-coding-guideline-fixes.md`
**Target Area:** `src/`
**Rules Violated:** `.lovable/coding-guidelines.md` § Restricted Short Identifiers (Rule 13: `arr`, `cb`, `fn`, `el`, `msg`, `ctx`, `obj`, `val`)

## 1. Context & Root Cause
Short identifier names like `el`, `fn`, `ctx`, `val`, `msg` were used in lambda parameter lists and utility arguments.
**Root Cause:** Standard concise lambda syntax habits.
**Fallout Analysis:**
- Renaming local parameters in lambdas is low risk but requires semantic intent naming (`element`, `handler`, `context`, `value`, `message`).

## 2. Granular Execution Steps (Steps 56-80)

### Step 56: Replace banned identifier `ctx` in `src/server.ts`
- **File:** [`src/server.ts`](file:///D:/wp-work/riseup-asia/cat-my/src/server.ts)
- **Line:** 7
- **Violation:** Identifier `ctx` in `fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.

### Step 57: Replace banned identifier `ctx` in `src/server.ts`
- **File:** [`src/server.ts`](file:///D:/wp-work/riseup-asia/cat-my/src/server.ts)
- **Line:** 53
- **Violation:** Identifier `ctx` in `async fetch(request: Request, env: unknown, ctx: unknown) {`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.

### Step 58: Replace banned identifier `ctx` in `src/server.ts`
- **File:** [`src/server.ts`](file:///D:/wp-work/riseup-asia/cat-my/src/server.ts)
- **Line:** 56
- **Violation:** Identifier `ctx` in `const response = await handler.fetch(request, env, ctx);`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.

### Step 59: Replace banned identifier `val` in `src/components/app-shell/AppBreadcrumb.tsx`
- **File:** [`src/components/app-shell/AppBreadcrumb.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/AppBreadcrumb.tsx)
- **Line:** 6
- **Violation:** Identifier `val` in `export function isBand(val: unknown): val is AppBreadcrumbPropsVariantType.Band {`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.

### Step 60: Replace banned identifier `val` in `src/components/app-shell/AppBreadcrumb.tsx`
- **File:** [`src/components/app-shell/AppBreadcrumb.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/AppBreadcrumb.tsx)
- **Line:** 10
- **Violation:** Identifier `val` in `export function isInline(val: unknown): val is AppBreadcrumbPropsVariantType.Inline {`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.

### Step 61: Replace banned identifier `arr` in `src/components/app-shell/AppBreadcrumb.tsx`
- **File:** [`src/components/app-shell/AppBreadcrumb.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/AppBreadcrumb.tsx)
- **Line:** 168
- **Violation:** Identifier `arr` in `{crumbs.slice(-2).map((c, i, arr) => (`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.

### Step 62: Replace banned identifier `el` in `src/components/app-shell/HistoryNav.tsx`
- **File:** [`src/components/app-shell/HistoryNav.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/HistoryNav.tsx)
- **Line:** 68
- **Violation:** Identifier `el` in `export function isTypingTarget(el: EventTarget | null): boolean {`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.

### Step 63: Replace banned identifier `val` in `src/components/app-shell/LightingReadout.tsx`
- **File:** [`src/components/app-shell/LightingReadout.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/LightingReadout.tsx)
- **Line:** 10
- **Violation:** Identifier `val` in `export function isExposure(val: unknown): val is LightingReadoutKeyType.Exposure {`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.

### Step 64: Replace banned identifier `val` in `src/components/app-shell/LightingReadout.tsx`
- **File:** [`src/components/app-shell/LightingReadout.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/LightingReadout.tsx)
- **Line:** 14
- **Violation:** Identifier `val` in `export function isGain(val: unknown): val is LightingReadoutKeyType.Gain {`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.

### Step 65: Replace banned identifier `val` in `src/components/app-shell/LightingReadout.tsx`
- **File:** [`src/components/app-shell/LightingReadout.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/LightingReadout.tsx)
- **Line:** 18
- **Violation:** Identifier `val` in `export function isEnhance(val: unknown): val is LightingReadoutKeyType.Enhance {`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.

### Step 66: Replace banned identifier `val` in `src/components/app-shell/LightingReadout.tsx`
- **File:** [`src/components/app-shell/LightingReadout.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/LightingReadout.tsx)
- **Line:** 22
- **Violation:** Identifier `val` in `export function isDarken(val: unknown): val is LightingReadoutKeyType.Darken {`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.

### Step 67: Replace banned identifier `val` in `src/components/app-shell/LightingReadout.tsx`
- **File:** [`src/components/app-shell/LightingReadout.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/LightingReadout.tsx)
- **Line:** 26
- **Violation:** Identifier `val` in `export function isVariant(val: unknown): val is LightingReadoutKeyType {`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.

### Step 68: Replace banned identifier `el` in `src/components/app-shell/panels/FloatingWindow.tsx`
- **File:** [`src/components/app-shell/panels/FloatingWindow.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/panels/FloatingWindow.tsx)
- **Line:** 166
- **Violation:** Identifier `el` in `.map((el) => el.closest("[data-dock-slot]"))`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.

### Step 69: Replace banned identifier `el` in `src/components/app-shell/__tests__/HistoryNav.test.tsx`
- **File:** [`src/components/app-shell/__tests__/HistoryNav.test.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/__tests__/HistoryNav.test.tsx)
- **Line:** 30
- **Violation:** Identifier `el` in `const el = document.createElement(tag);`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.

### Step 70: Replace banned identifier `el` in `src/components/app-shell/__tests__/HistoryNav.test.tsx`
- **File:** [`src/components/app-shell/__tests__/HistoryNav.test.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/__tests__/HistoryNav.test.tsx)
- **Line:** 31
- **Violation:** Identifier `el` in `expect(isTypingTarget(el)).toBe(true);`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.

### Step 71: Replace banned identifier `el` in `src/components/app-shell/__tests__/HistoryNav.test.tsx`
- **File:** [`src/components/app-shell/__tests__/HistoryNav.test.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/__tests__/HistoryNav.test.tsx)
- **Line:** 37
- **Violation:** Identifier `el` in `const el = { tagName: "DIV", isContentEditable: true };`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.

### Step 72: Replace banned identifier `el` in `src/components/app-shell/__tests__/HistoryNav.test.tsx`
- **File:** [`src/components/app-shell/__tests__/HistoryNav.test.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/__tests__/HistoryNav.test.tsx)
- **Line:** 41
- **Violation:** Identifier `el` in `const el = document.createElement("button");`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.

### Step 73: Replace banned identifier `el` in `src/components/app-shell/__tests__/HistoryNav.test.tsx`
- **File:** [`src/components/app-shell/__tests__/HistoryNav.test.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/__tests__/HistoryNav.test.tsx)
- **Line:** 42
- **Violation:** Identifier `el` in `expect(isTypingTarget(el)).toBe(false);`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.

### Step 74: Replace banned identifier `el` in `src/components/app-shell/__tests__/nav.test.tsx`
- **File:** [`src/components/app-shell/__tests__/nav.test.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/app-shell/__tests__/nav.test.tsx)
- **Line:** 27
- **Violation:** Identifier `el` in `const el = screen.getByTestId("app-shell-nav");`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.

### Step 75: Replace banned identifier `ctx` in `src/components/cli/ExitEnvelopeDrawer.tsx`
- **File:** [`src/components/cli/ExitEnvelopeDrawer.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/ExitEnvelopeDrawer.tsx)
- **Line:** 97
- **Violation:** Identifier `ctx` in `const ctx =`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.

### Step 76: Replace banned identifier `ctx` in `src/components/cli/ExitEnvelopeDrawer.tsx`
- **File:** [`src/components/cli/ExitEnvelopeDrawer.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/cli/ExitEnvelopeDrawer.tsx)
- **Line:** 111
- **Violation:** Identifier `ctx` in `return { code: String(code), message: String(message), ctx, timestamp };`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.

### Step 77: Replace banned identifier `msg` in `src/components/data-source/DataSourceToggle.tsx`
- **File:** [`src/components/data-source/DataSourceToggle.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/data-source/DataSourceToggle.tsx)
- **Line:** 92
- **Violation:** Identifier `msg` in `const msg = err instanceof Error ? err.message : String(err);`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.

### Step 78: Replace banned identifier `el` in `src/components/editor/FloatingInspector.tsx`
- **File:** [`src/components/editor/FloatingInspector.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/FloatingInspector.tsx)
- **Line:** 75
- **Violation:** Identifier `el` in `const el = panelRef.current;`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.

### Step 79: Replace banned identifier `el` in `src/components/editor/FloatingInspector.tsx`
- **File:** [`src/components/editor/FloatingInspector.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/FloatingInspector.tsx)
- **Line:** 91
- **Violation:** Identifier `el` in `if (el) {`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.

### Step 80: Replace banned identifier `el` in `src/components/editor/PreviewSettingsPanel.tsx`
- **File:** [`src/components/editor/PreviewSettingsPanel.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/PreviewSettingsPanel.tsx)
- **Line:** 50
- **Violation:** Identifier `el` in `const el = t as HTMLElement | null;`
- **Action:** Replace with domain-descriptive name (`item`, `element`, `handler`, `context`, `record`, `message`).
- **Fallout Check:** Verify no shadow variable collisions.
