# Session V4 Bugfix Summary

**Date**: 2026-08-10

## Done
- `✅ Done` Fixed the `EnvelopeError: E_BE_UNAVAILABLE: fetch failed` runtime error crash. The root cause was `err instanceof EnvelopeError` evaluating to false inside TanStack Start server functions due to Vite dual-package module instantiation. Mitigated via `err.name === "EnvelopeError"` string matching.
- `✅ Done` Updated `EnvelopeErrorBoundary` UI to parse the `EnvelopeError` and visibly render the exact backend error code (e.g. `E_BE_UNAVAILABLE`) and HTTP status rather than a generic "Component Failed to Load" message.
- `✅ Done` Documented the Vite `instanceof` hazard in `.lovable/memory/v2/plan90/03-vite-instanceof-hazard.md`.

## Pending
- `⏳ Pending` CI/CD lint remediation (`ca-*` tokens, `react-refresh` rules, `no-restricted-syntax`).
- `⏳ Pending` E2E Test execution is failing on some local setups due to missing Python `playwright` dependencies.

## Avoid / Wrong
- `🚫 Avoid, [Relying on instanceof across Vite chunk boundaries]` Never use `instanceof` when catching custom error classes in server functions. The class prototype reference often breaks.
