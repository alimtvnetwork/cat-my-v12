# Subtask: 09-error-capture-splitdb

See plan: .ai-memory/plans/pending/54-vision-system-and-error-management-instructions.md

## Error SplitDB + CLI readout agent — progress

- Batch 1 (migration + writer): `BE/db/migrations/task/0029_task_errors.sql`
  (next number after 0028; `Error` table, PascalCase columns, UNIQUE
  `CorrelationId`, indexes on `CreatedAt`/`Code`, terminal `SchemaVersion`
  row) + `BE/app/db/writers/error.py` (`write_errors` batch insert
  idempotent by `CorrelationId`, `list_errors`/`get_error_by_correlation`
  readers shared by route + CLI, AC-01 Details redaction, full stacks
  kept — no 40-frame truncation, noted as a morning MBUD item).
- NOT touched (other agents own them): `src/components/vision/*`,
  `packaging/desktop/*`. The swallowing-fix agent shares this file — its
  section is separate; this section only covers the SplitDB/CLI work.
- Batch 2 (ingest route): `BE/routes/errors.py` (`POST /errors` accepts
  one object / array / `{items: [...]}`, `GET /errors` with limit + code /
  level / session / correlation filters, `GET /errors/{correlationId}`
  full stack trace) + router mount in `BE/main.py`. A query-param /
  request-correlation shadowing bug found during review was fixed before
  commit. Route folds `context` + diagnostic fields into `Details`
  (redacted at write time); interaction traces stay in browser history.
- Batch 3 (CLI): `BE/cli/processing/commands/errors.py` (`errors list` /
  `show <correlationId>` / `export --format json|csv`), registration in
  `BE/cli/processing/main.py`, `BE/cli/processing/helptext/errors.md`.
  Export shapes mirror the frontend serializers in
  `src/lib/errors/export.ts` (JSON `{exportedAt, count, errors}`; CSV
  `CSV_COLUMNS`, browser-only `id` column empty server-side,
  `CorrelationId` is the server identity).
- Batch 4 (facade): `src/lib/errors/history-facade.ts` rewritten —
  `saveErrorHistory` now also syncs new entries to `POST /errors`
  (Backend mode only, resolved from the persisted backend-mode store;
  Seed mode skips by design, not by swallow); load/save/clear/backend
  failures are reported into the error store as synthetic errors
  (30s cooldown breaks the report loop; failures still logged every
  time). Cycle with `errorStore` documented in the file header.
- NOT built (per program order, no builds/tests in this workstream):
  runtime verification of the route/CLI/facade against a live BE + DB.
  Syntax-checked only (Python `ast.parse`). The end-of-tunnel build-fix
  + E2E wave must exercise: `bin/db-bootstrap.py` applying 0029,
  `POST /errors` round-trip, `processing-cli errors list/show/export`,
  and the facade sync in Backend mode.

## Swallowing-fix agent — progress (separate section, same file)

- Batch 1 — direct capture in non-render paths (commit e540d552, on
  origin via merge acd654b4): `usePin1Rule.ts` loadTarget catch,
  `usePatternMatchingRule.ts` match catch, `useWhiteBoxMarking.ts`
  image-load + duplicate-prune catches, `useStandardWorkbench.ts`
  image-load + file-load catches, `VisualToolWorkpieceCanvas.tsx`
  pixel-cache catch. All route into `useErrorStore.captureError` with
  triggerComponent/triggerAction/context; cancellation-guarded
  (`isCancelled`) in effect paths so unmount noise stays silent.
- Batch 2 — JSON.parse catches (render-path safe): `VisualToolTuningModal.tsx`
  constellationJson + pin1ConfigJson via failures out-param + `useEffect`
  capture (field + ruleId + payloadLength, never raw content);
  `workpiece-rule-analyzer.ts` `parseBoxesFromParams` 4 fields
  (constellationJson, referenceBoxesJson, patternBoxesJson, boxesJson)
  via `queueMicrotask`-deferred capture + once-per-payload dedup Set
  (render-path call sites must not mutate the store mid-render, and a
  re-rendering canvas must not flood the bounded 50-entry history).
- Fallback behavior preserved everywhere: prune loop still continues,
  box-list fallthrough order unchanged, no rethrows added.
- NOT fixed (out of assigned scope, flagged for follow-up):
  `VisualToolTuningModal.tsx` `readSavedRegion` and
  `workpiece-rule-analyzer.ts` `parseStoredRegion` return null on
  corrupt JSON without capture; other catches in the owned files use
  toasts or deliberate fallbacks, not silence.
