# Vite Server Function `instanceof` Hazard

- **Date**: 2026-08-10
- **Context**: TanStack Start Server Functions (`createServerFn`).

## The Problem

When catching custom Error classes (like `EnvelopeError`) thrown by shared libraries (like `beFetch`) inside a server function handler, `instanceof EnvelopeError` evaluates to `false`.
This happens because Vite dynamically extracts and bundles server functions into distinct virtual modules, creating a dual-package hazard where the class prototype referenced in the `catch` block differs from the one instantiated in the library.

## The Solution

Never rely on `instanceof` for cross-boundary error catching in SSR/server functions. Instead, rely on the `name` property explicitly set in the Error constructor:

```typescript
// WRONG
if (err instanceof EnvelopeError) { ... }

// RIGHT
const isEnvelope = err instanceof EnvelopeError || (err instanceof Error && err.name === "EnvelopeError");
if (isEnvelope) { ... }
```

This ensures the error is correctly identified regardless of module boundaries.
