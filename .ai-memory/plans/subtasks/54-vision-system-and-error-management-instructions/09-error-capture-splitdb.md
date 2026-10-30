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
