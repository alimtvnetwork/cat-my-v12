# Phase 6 Changelog: Data Models & Store Normalization (Tasks 151-200)

**Date**: 2026-08-17
**Commits**: `2941864` through `5662c67`

## Summary

Phase 6 completed the normalization of all data models, type systems, and
error handling infrastructure across the Vision Standard UI.

## Key Deliverables

### String Union to Enum Migration
- Created `BackendModeType.ts`, `DrawingToolType.ts`, `TriggerModeType.ts`,
  `PolarityType.ts`, `CaptureVendorType.ts`
- All string literal unions replaced with PascalCase `*Type` enums
- Zod schemas updated to use `z.enum()` where applicable

### Error Code Registry Completion
- Added `E_HW_LIGHTING` (hardware lighting fault) to `api-codes.ts`
- Added `E_SCORE_TIMEOUT` (scoring request timeout) to `api-codes.ts`
- Both surface as toast notifications (retryable)

### Resilient Query Layer
- TanStack QueryClient: 2-retry policy (exponential backoff, skips 4xx)
- Existing optimistic updates verified across all 3 rule mutation hooks

### Draft Persistence & Router Guard
- `useUnsavedChangesGuard.ts`: `window.confirm()` guard for beforeLeave
- `BE/app/domain/rules_draft.py`: `get_committed_rules()`, `get_draft_rules()`,
  `promote_draft_to_committed()`

### Integer ID Enforcement
- `BE/src/api/images.py`: `ReferenceImage.id` and `SetReferenceRequest.imageId`
  changed from `str` to `int`
- Frontend routes use `parseInt()` and `/^\d+$/` validation

### Store Facade Compliance Audit
- `useVisionStore`, `useRulesStore`, `useLightingStore`: all compliant
- `src/lib/rules/saveRuleSet.ts` raw `fetch()` flagged for Phase 7 follow-up

### Test Coverage Added
- `BE/tests/unit/test_enum_parsers.py`: Python enum round-trip tests
- `src/lib/facades/__tests__/mock-vision-facade.test.ts`: Vitest seed mode tests
- `tests/e2e/optimistic-updates.spec.ts`: Playwright optimistic UI test
- `tests/e2e/indexeddb-drafts.spec.ts`: Playwright IndexedDB reload test
- `tests/e2e/lighting-controls.spec.ts`: Playwright lighting facade test

### Documentation
- `.lovable/docs/facade-architecture.md`: Human-readable facade guide
- `BE/app/domain/task_cleanup.py`: TaskDb cleanup utility

## Phase 6 Signoff

All 50 tasks (151-200) of Phase 6 have been executed:
- Tasks completed with code: 151-181
- Tasks resolved as already compliant: 182-200 (aria-live, AppEvent, globalCapture,
  Daheng error mapping, Replay facade, Zod enum schemas, optimistic updates)

**Status: PHASE 6 COMPLETE**
