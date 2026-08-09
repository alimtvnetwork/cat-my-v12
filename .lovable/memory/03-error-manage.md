# Error Management (from spec/03-error-manage)

**Priority:** #1 — write error handling from the first line of business logic.

## Three-tier architecture

| Tier | Layer                            | Rule                                                                                                                 |
| ---- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1    | Delegated server (PHP, external) | Return Universal Response Envelope with structured errors                                                            |
| 2    | Go backend                       | Use `apperror.Wrap(err).WithCode(...).WithContext(...)`; return `apperror.Result[T]`, never `(T, error)` in new code |
| 3    | Frontend                         | Central error store + Global Error Modal; never swallow                                                              |

## Hard prohibitions (CODE-RED)

- Empty `catch`, `_ := fn()`, discarded promises → **fail CI**.
- Generic messages ("file not found") — always include path / entity ID / operation.
- `fmt.Errorf` in Go — use `apperror.Wrap`.
- Floating promises in TS — `await` or explicitly `return`.
- Silent failure is unacceptable. If no logs exist, that IS the bug — add logging at the entry point.

## Verification contract

- Every fix logs with context and surfaces the error.
- Confirm the log line fires after the change; without log evidence the fix is not proven.

## Response format

All backend endpoints return:

```json
{ "Status": { "IsSuccess": false, "Code": 4xx|5xx, "Message": "..." },
  "Attributes": { "ErrorCode": "APP-1234", "TraceId": "..." },
  "Results": [] }
```

Error codes live in `spec/03-error-manage/03-error-code-registry/`.
