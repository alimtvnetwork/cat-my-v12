# Subtask 03: Frontend Error Sync & Zero Swallow

## Status: Completed

## Implemented
1. In `src/lib/errors/history-facade.ts`:
   - Fall back to `DEFAULT_BACKEND_URL` (`http://127.0.0.1:8787`) so all captured errors actively push to `POST /errors`.
2. In `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx`:
   - Fixed `handleSaveRuleSet`: `const committed = await saveRuleSet(envelope); onSaved(committed);`.
   - In catch block: captures error with `useErrorStore.getState().captureError(...)`.
