# Python Coding Guidelines

Status: locked
Owner: Plan 22 Step 49 remediation
Applies to: `app/**/*.py`, `tests/**/*.py`, Python scripts under `scripts/`

## Required references

- `.lovable/coding-guidelines/coding-guidelines.md`
- `spec/21-app/40-error-manage.md` Appendix A
- `spec/21-app/52-sdk-facade-pattern.md`
- `.lovable/memory/09-enums-and-results-shape.md`

## Runtime rules

1. Keep normal functions at 15 lines or fewer. Use the project waiver only when a framework signature forces more lines.
2. Use positive, simple `if` conditions. Do not write nested `if` statements.
3. Boolean names must start with `is` or `has`.
4. Use typed dataclasses, enums, or narrow protocols at module boundaries.
5. Do not pass vendor SDK handles outside a facade.

## Error and logging rules

1. Every boundary error uses one wire code from `spec/21-app/40-error-manage.md` Appendix A.
2. Exception class names are PascalCase. The wire `code` value remains SCREAMING_SNAKE.
3. Every `except` block logs once with `CorrelationId`, `operation`, `code`, and the primary subject id.
4. Retryable errors must state retry budget and remaining attempts in the log context.
5. Unknown vendor exceptions are surfaced as typed adapter errors at the facade boundary, never swallowed.

## Facade rules

| Area              | Required facade             | Forbidden leak                                 |
| ----------------- | --------------------------- | ---------------------------------------------- |
| Pylon capture     | `PylonCaptureSdkFacade`     | `pypylon` camera, result, or array objects     |
| Spinnaker capture | `SpinnakerCaptureSdkFacade` | `PySpin` system, camera, image, node objects   |
| Vimba capture     | `VimbaCaptureSdkFacade`     | `vmbpy` system, camera, frame, feature objects |
| Discovery         | `VendorDiscoveryFacade`     | raw transport-layer descriptors                |
| Audit retention   | `AuditRetentionFacade`      | raw SQLite cursors outside persistence modules |
| Audit persistence | `AuditPersistenceFacade`    | raw event rows without schema validation       |

## Acceptance checklist

- [ ] New Python module cites its owning spec anchor.
- [ ] Public functions expose typed inputs and typed returns.
- [ ] Every emitted `E_*`, `W_*`, or `I_*` code is registered in Appendix A.
- [ ] Vendor buffers are copied before SDK release.
- [ ] Tests cover success, typed failure, retry exhaustion, and correlation logging.
