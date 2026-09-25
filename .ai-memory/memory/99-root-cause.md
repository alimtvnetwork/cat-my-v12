# Root Cause Analysis: E_BE_UNAVAILABLE & Query Failure Mishandling

## 1. Initial Failure (`E_BE_UNAVAILABLE`)

The UI encountered an `E_BE_UNAVAILABLE` runtime error rendering a completely blank screen because the top-level error boundary (`EnvelopeErrorBoundary`) was intercepting the serialized error from React Query but returning `null` incorrectly instead of surfacing a visual indicator or appropriately deferring to the global router handlers.
The fix was deploying strict checks (`error.name === "EnvelopeError"`) to properly differentiate React Query failures and propagating them upward so the Global Error Modal and router error components could ingest them.

## 2. Query Failure Hijacking

During transient backend polling failures, React Query (`useQuery`) would aggressively trigger the global error modal, hijacking the UI every time a short-lived network fault occurred.
To resolve this:

- An explicit suppression parameter (`meta.hasVisibility: false`) was implemented across background/polling requests (such as in `GlobalCliStatusWidget.tsx`).
- The `useAppQuery` and `useAppMutation` wrappers were strictly enforced to intercept errors natively and surface `isFail` boolean properties natively (adhering to the _explicit boolean state checks_ rule).

## 3. String Union Type Erasure

TypeScript was exhibiting implicit any issues and string comparison vulnerabilities due to raw string literal unions (e.g., `UiSeedSource`, `ShortcutScope`).
To enforce type integrity:

- Enums conforming to the `*Type` naming schema and `PascalCase` key standards were generated (`UiSeedSourceType`, `ShortcutScopeBaseType`, `ShortcutScopeType`, `VerdictType`).
- These enums were applied comprehensively across the repository utilizing targeted sub-agents.
