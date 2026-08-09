# Error Management, Acceptance Criteria

**Version:** 3.3.0  
**Updated:** 2026-07-17

---

## AC-01: Structured Error Response

**GIVEN** any CLI backend encounters an error during request processing  
**WHEN** the error response is generated  
**THEN** it contains: `Code` (numeric), `Message` (human-readable), `Details` (technical), and `Stack` (up to 40 frames)  
**AND** the error code falls within the tool's assigned range per the Error Code Registry

**Edge Cases:**

- **GIVEN** the error originates from a third-party library **WHEN** the stack trace is captured **THEN** both the library frames and the application frames are included with clear delineation
- **GIVEN** the error code is not registered in the Error Code Registry **WHEN** it is returned **THEN** a fallback generic code within the tool's range is used and a warning is logged
- **GIVEN** the error `Details` field contains sensitive data (file paths, credentials) **WHEN** the response is generated **THEN** sensitive values are redacted before sending to the client

---

## AC-02: Frontend-Backend Verification Protocol

**GIVEN** the frontend receives an error response from the backend  
**WHEN** the error is displayed in the error modal  
**THEN** the user can see the backend error code, the frontend component that triggered the request, and the timestamp  
**AND** "Copy All" copies both frontend and backend context

**Edge Cases:**

- **GIVEN** the clipboard API is unavailable **WHEN** "Copy All" is clicked **THEN** a fallback textarea is shown with the content pre-selected
- **GIVEN** the backend returns an error with no `Code` field **WHEN** the frontend processes it **THEN** a synthetic code `GEN-1000` is assigned and a parsing warning is logged

---

## AC-03: Retrospective Document Structure

**GIVEN** a production bug has been resolved  
**WHEN** a retrospective document is created  
**THEN** it contains: Root Cause, Timeline, Resolution Steps, Prevention Measures, and Related Error Codes

---

## AC-04: Verification Pattern Application

**GIVEN** a developer implements a fix for a known error pattern  
**WHEN** they consult the verification patterns documentation  
**THEN** they find step-by-step verification instructions specific to the error category

---

## AC-05: Debugging Guide Coverage

**GIVEN** a developer encounters a backend error  
**WHEN** they follow the language-specific debugging guide  
**THEN** they can identify common issues and each issue links to the relevant specification

---

## AC-06: Quick Resolution

**GIVEN** a common error scenario  
**WHEN** the developer consults the cheat sheet  
**THEN** they find a 3-step resolution procedure: Identify → Diagnose → Fix  
**AND** each step includes the exact command or code to run

---

## Cross-References

- [Overview](./00-overview.md)

---

## AC-07: Floating notice viewport safety (Plan 71)

**GIVEN** any fixed floating notice (e.g. `WorkerHealthBanner`) is rendered
**WHEN** the viewport is too narrow for the card to fit fully on-screen
**THEN** the notice is hidden entirely instead of drawing clipped chrome
**AND** the `useViewportSafe(ref)` hook at `src/hooks/useViewportSafe.ts` is the single measurement source.

**Verification:** `tests/visual/header-and-worker-notice.spec.ts` asserts, at widths 360, 480, 768, 1024, 1280, 1600, that the banner is either absent or fully within the viewport rectangle.

---

## AC-08: Global Error Modal producer paths (Plan 71)

**GIVEN** an error surfaces via (a) the worker health notice "Details" button, (b) a React Query `onError` callback without `meta.suppressGlobalError`, (c) a `showToastError(...)` call site, or (d) an uncaught `window.error` / `unhandledrejection` event
**WHEN** the error is produced
**THEN** it is committed to `useErrorStore` with a registry-mapped code (`src/lib/errors/registry.ts` `lookupErrorCode`) and the `GlobalErrorModal` can be opened via the toast "View Details" action or the banner "Details" button.

**Verification:** unit tests `src/lib/errors/__tests__/registry-lookup.test.ts`, `errorStore.test.ts`, `history-facade.test.ts`; Playwright: banner "Details" opens a `role="dialog"`.

---

## AC-09: Reload-safe error history (Plan 71)

**GIVEN** errors were committed in a previous session
**WHEN** the app reloads
**THEN** up to the last 50 entries are rehydrated into `useErrorStore` via the SDK facade (`src/lib/errors/history-facade.ts` → `ProjectRepositoryFacade`) so the History tab is populated on first paint.

**Verification:** `src/lib/errors/__tests__/history-facade.test.ts` (5 tests) and manual reload of `/errors`.
