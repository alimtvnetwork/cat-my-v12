# Subtask SS-03: Error Wrapper & Swallow Elimination Execution Plan
# File: .ai-memory/plans/subtasks/04-vision-system-and-error-management-instructions/SS-03-error-wrapper-and-swallow-elimination.md
# Reference Spec: 02-spec/21-app/04-vision-system-and-error-management-instructions/03-error-management-and-splitdb-spec.md
# Status: Ready for Execution

## 1. Executive Summary & Objective

The objective of Subtask SS-03 is to systematically eliminate error swallowing, silent catch blocks, and fake fallback returns (`[]`, `null`, `false`, synthesized empty objects) across the frontend application and server proxy functions. 

Every error must be preserved with full fidelity:
1. Surfaced to the operator through reactive UI boundaries (`useErrorStore`).
2. Logged with structured metadata and breadcrumbs via `ClientLogger.error`.
3. Propagated through typed `Result<T>` containers using affirmative booleans (`isSuccess`, `hasError`).
4. Persisted into the `data/errors.db` SplitDB database.

---

## 2. Inventory of Grounded Remediation Targets

Worker 02 identified 7 critical files exhibiting silent error-swallowing behavior:

```text
1. src/lib/observability/cliSessions.functions.ts  (Swallows 404/403/E_BE_UNAVAILABLE -> empty items: [])
2. src/lib/observability/cliSession.functions.ts   (Swallows transport failures -> dummy unknown summary)
3. src/lib/observability/sessions.functions.ts     (Swallows isMissingOrUnavailable -> fake empty page)
4. src/lib/observability/savedViews.ts             (Swallows parse/quota errors -> [] and false; uses { ok })
5. src/lib/stores/run-store.ts                     (Swallows JSON parse and localStorage writes -> null)
6. src/lib/data-source/store.ts                    (Swallows localStorage failures -> silent defaults)
7. src/components/hmi/CameraPreview.tsx            (Swallows video.play() and getUserMedia DOMExceptions)
```

---

## 3. Micro-Batch Implementation Steps

### Step 1: Standardize Typed Result Envelope & Error Codes
- **Target File**: `src/lib/errors/types.ts` & `src/lib/errors/result.ts`
- **Actions**:
  1. Define `AppErrorPayload` interface with `errorCode`, `message`, `severity`, `hasStackTrace`, `stackTrace`, `context`, `timestamp`.
  2. Implement generic `Result<T>` discriminated union with affirmative booleans:
     - `{ isSuccess: true, hasError: false, value: T, error: null }`
     - `{ isSuccess: false, hasError: true, value: null, error: AppErrorPayload }`
  3. Export constructor helpers `createSuccess(value)` and `createFailure(error)`.
  4. Ensure zero usage of banned terms (`ok`, `can`, `should`, `was`).

### Step 2: Refactor `src/lib/observability/cliSessions.functions.ts`
- **Actions**:
  1. Remove catch block returning fake `{ items: [], total: 0, limit: ... }`.
  2. Log structured failure with `ClientLogger.error("[cliSessions.functions] Backend fetch failed", { error, source, limit })`.
  3. Rethrow typed error `CLI_SESSIONS_UNAVAILABLE` so TanStack Start route error boundaries render a visible diagnostic error banner instead of a phantom empty state.

### Step 3: Refactor `src/lib/observability/cliSession.functions.ts`
- **Actions**:
  1. Remove synthesis of fake fallback summary object (`Source: "unknown"`, `Records: []`, `SizeBytes: 0`).
  2. Capture `runId` context and rethrow `EnvelopeError` with HTTP status code and response details.
  3. Guarantee that navigating to an invalid or deleted session run ID surfaces a clear 404 "Session Not Found" page.

### Step 4: Refactor `src/lib/observability/sessions.functions.ts`
- **Actions**:
  1. Eliminate `EnvelopeError.is(err) && err.isMissingOrUnavailable` branch returning empty arrays.
  2. Pipe error to `ClientLogger.error`.
  3. Propagate the error directly to the route loader to trigger the designated fallback component with retry capabilities.

### Step 5: Refactor `src/lib/observability/savedViews.ts`
- **Actions**:
  1. Replace legacy `{ ok: boolean }` return shape in `addSavedView`, `removeSavedView`, and `updateSavedView` with `Result<SavedView>` containing `isSuccess` and `hasError`.
  2. Refactor `safeRead()` to return a `Result<SavedView[]>`:
     - On JSON parse error or corruption, log `ClientLogger.error` and return `{ isSuccess: false, hasError: true, views: [], errorMessage }`.
  3. Refactor `safeWrite()` to return `{ isSuccess: boolean, hasError: boolean }`:
     - If storage quota is exceeded (`QuotaExceededError`), trigger `useErrorStore.getState().captureException` to warn the operator.

### Step 6: Refactor `src/lib/stores/run-store.ts`
- **Actions**:
  1. In `facadeReadJson` and `facadeReadJsonWithMigration`, replace `catch (err) { return null; }` with explicit error logging and diagnostic event emission.
  2. In `facadeWriteJson`, attach `.catch((err) => { ... })` handler that records an unhandled persistence exception to `useErrorStore` so the operator is notified if run counters fail to save.
  3. Replace bare `catch { /* ignore */ }` in legacy migration block with structured logging.

### Step 7: Refactor `src/lib/data-source/store.ts`
- **Actions**:
  1. In `readInitial()`, `readInitialBaseUrl()`, and `readInitialPersistRules()`, remove silent `catch {}` statements.
  2. Add `ClientLogger.warn` breadcrumbs when local storage is disabled or unavailable.
  3. Record storage state transitions into telemetry so that unintentional fallback to `DataSourceType.Seed` is traceable.

### Step 8: Refactor `src/components/hmi/CameraPreview.tsx`
- **Actions**:
  1. In camera setup JSON parser (lines 72-74), log `ClientLogger.warn` when stored controls JSON is corrupt.
  2. On line 143, update `videoRef.current.play().catch(...)` to log warning if video playback is interrupted.
  3. On lines 148-150, replace `.catch(() => { if (!isCancelled) setStatus("denied"); })` with typed `DOMException` inspection:
     - Log exact error name (`NotAllowedError`, `NotFoundError`, `NotReadableError`, `OverconstrainedError`) to `ClientLogger.error`.
     - Set state variable `errorMessage` and update UI banner explaining why the camera stream failed.

---

## 4. Verification & Quality Gates

1. **Static Analysis & Typecheck**:
   - Execute `bun run typecheck:strict` to ensure 100% type safety.
   - Run linter regex to verify zero bare `catch {}` without logging or propagation.
2. **Boolean Standard Verification**:
   - Check all updated files for banned terms (`ok`, `can`, `should`, `was`).
   - Validate that all new booleans are affirmative (`isSuccess`, `hasError`, `isResolved`).
3. **Behavioral Testing**:
   - Simulate backend downtime (`GET /api/cli/sessions` returning 503) and verify that the UI shows an error notification rather than an empty table.
   - Simulate camera permission denial and verify the exact error message appears in the UI and in `ClientLogger`.
