# Backend v1 Diagrams

Frozen: 2026-07-21 (v3.987.0), grounded in `spec/21-app/backend-implementation-request-v1.md` (Status: accepted).

Every downstream Plan 88 spec cites these diagrams as the single source of truth for topology, envelope flow, and facade boundaries. If a spec disagrees with a diagram, the diagram wins until an amendment is landed here first.

| #   | File                                                   | Purpose                                                                                                          | Cited by                                                            |
| --- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 01  | [`01-mode-toggle.md`](./01-mode-toggle.md)             | How `useBackend()` picks Seed vs Backend from `app.backend.mode` + `ui.backend.baseUrl`                          | Step 5 (`27-config-surface.md` PATCH), Step 16-22 (FE typed client) |
| 02  | [`02-request-lifecycle.md`](./02-request-lifecycle.md) | End-to-end HTTP request with `X-Correlation-Id`, envelope mint/consume, log lines                                | Step 6 (`40b-http-envelope.md`), Step 8-15 (BE scaffold)            |
| 03  | [`03-sdk-facade-layers.md`](./03-sdk-facade-layers.md) | Import-boundary rules for `sdk/**`, `BE/app/facades/**`, `src/lib/facades/**`                                    | Step 43-60 (SDK wiring), CI grep gate for `E_BUG_SDK_LEAK`          |
| 04  | [`04-error-propagation.md`](./04-error-propagation.md) | `AppError` mint -> envelope embed -> `useErrorStore` -> `GlobalErrorModal`, with `E_<AREA>_<CONDITION>` families | Step 6, Step 61-90 (E2E error wiring)                               |
| 05  | [`05-launcher-sequence.md`](./05-launcher-sequence.md) | `run.ps1` / `run.sh` startup: BE port bind -> `/healthz` poll -> FE port -> shell handoff                        | Step 7 (`shell/26-dev-launcher.md`), Step 31-42 (launchers)         |

## Conventions used in all diagrams

- Wire keys shown PascalCase (`Status.IsSuccess`, `Attributes.Error.Code`, `CorrelationId`).
- Error codes shown as `E_<AREA>_<CONDITION>` per `40-error-manage.md` §2. Numeric `BE-4xxx` / `CAM-10xx` are retired.
- Folder labels use the frozen layout: `BE/app/facades/`, `BE/app/domain/`, `src/lib/facades/`, `src/lib/domain/`. `BE/sdk-facade/` is retired.
- localStorage key is `ui.backend.baseUrl`. Runtime knob is `app.backend.baseUrl`.
