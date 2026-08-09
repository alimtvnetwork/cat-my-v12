# Plan 88 — Guideline Digest (Step 1)

Compiled: 2026-07-21
Sources scanned (folders read; per-file rules distilled from the master consolidations plus `.lovable/memory/24-coding-and-error-rulebook.md`):

- `spec/02-coding-guidelines/**` (00-overview, 01-cross-language/**, 02-typescript/**, 03-golang/\*\* for reference, 06-cicd-integration, 11-security, 21-app, 22-app-issues, 23-app-db, 24-app-ui-design-system, consolidated-review-guide)
- `spec/02-coding-guidelines/21-app/00-overview.md`
- `spec/14-update/**` (self-update, deploy path, build scripts, versioning, install scripts, config file, release pipeline, checksums, code signing, worker push instruction)
- `spec/17-consolidated-guidelines/**` (02 coding, 03 error, 04 enum, 05 split-db, 06 seedable-config, 13 app, 14 app-issues, 16 design system, 17 self-update, 21 lovable folder, 23 generic-cli, 28 distribution-and-runner)
- `spec/03-error-manage/**` (00 overview, 01 error-resolution, 02 error-architecture incl. 04 error-modal + 05 response-envelope + 06 apperror-package + 07 logging, 03 error-code-registry incl. schemas)

Where rules below cite `[24-rulebook]`, they are already enforced by `.lovable/memory/24-coding-and-error-rulebook.md` and are re-stated only for the backend context.

---

## 1. Language & style (applies to BE Python + FE TS)

- No `any` / `unknown` / `interface{}` / `Record<string, unknown>` in business logic; use generics or concrete types. Python: no `Any`, no bare `dict`; use `TypedDict`, `pydantic` models, or generics. [02-ts/08, 24-rulebook]
- Function body <= 15 lines, <= 3 params (options object/dataclass for 4+). No nested `if` — early returns only. No `else` after `return`/`raise`. Blank line before `return`/`raise`. [01-cross-language/04, 24-rulebook]
- Booleans: `is`/`has` prefix (rare `should`); never `can`/`was`/`will`/negative names; never `!fn()` — wrap in a positive guard. [01-cross-language/02, /12]
- No magic values. Enums: PascalCase type + `Type` suffix (`ConnectionStatusType`); PascalCase values. No string-union types. Python: `enum.StrEnum` with PascalCase members. [02-ts/08 §3, 17-cg/04]
- Identifiers camelCase/PascalCase in logic; snake_case allowed ONLY at persistence boundaries (WP DB tables). Abbreviations first-letter-caps: `Id`, `Url`, `Api`, `Http`, `Json`. Never `ID`/`URL`. [01-cross-language/15-master §1.1]
- File soft cap 300 lines (400 with refactor note). One primary type per file, PascalCase filename matching. [03-registry §8]
- `catch`/`except`: bare identifier, narrow with `isinstance`. Python: `except Exception as err` (never bare `except:`). Never swallow. [02-ts/08 §4.1, 03-em]

## 2. Error management (MANDATORY, #1 priority) [03-em, 17-cg/03, revised per Step 2 gap log]

- Three tiers: Delegated Server (PHP/vendor SDK) -> Go/Python backend with `apperror`/`AppError` -> Frontend `useErrorStore` + `GlobalErrorModal`.
- Every response uses Universal Response Envelope (locked in `spec/21-app/40b-http-envelope.md`, Step 6):
  ```json
  { "Status": { "IsSuccess": bool, "HttpCode": <2xx|4xx|5xx>, "Message": "..." },
    "Attributes": { "Error": { "Code": "E_BE_...", "Message": "...", "Context": {...}, "CausedBy": {...} }, "CorrelationId": "<ulid>" },
    "Results": [ ... ] }
  ```
  PascalCase keys, always. Envelope helpers: `envelope.ok(data)`, `envelope.fail(appError)`.
- `AppError` wire shape: `{ Code, Message, Context, CausedBy }` PascalCase, one level of `CausedBy`, NO `Stack` on the wire (dev stack stays in server logs, capped at 40 frames, secrets redacted). Matches locked `40-error-manage.md` §2.
- Error codes: `E_<AREA>_<CONDITION>` SCREAMING*SNAKE, drawn from the central enum in `spec/21-app/40-error-manage.md` §5. Reserved families for this plan: `E_BE*_`, `E*CAM*_`, `E*SDK*_`, `E*SEC*_`. Numeric `BE-4xxx`/`CAM-10xx` ranges are RETIRED.
- No silent failure: every catch either logs+returns an envelope error or re-raises `AppError.wrap(err).with_code(...).with_context(...)`. Violation code: `E_BUG_SILENT_SWALLOW`.
- Backend uses `Result[T]` (success/failure union) for service methods; handlers translate to envelope.
- Frontend: HTTP 2xx is the transport signal; envelope `Status.IsSuccess` drives UX. Every failed envelope goes through `lookupErrorCode(Attributes.Error.Code)` and lands in `useErrorStore`.
- Correlation IDs: BE MUST accept + echo `X-Correlation-Id`; typed client MUST generate a ULID per request.
- Logging: structured JSON (`requestId`, `correlationId`, `method`, `path`, `httpCode`, `errorCode`, `durMs`), camelCase field names, no PII, no secrets.
- Verification: every error path has a test that asserts (a) envelope shape (b) `Attributes.Error.Code` (c) log line fires with the correlation id.

## 3. Frontend rules specific to plan 88

- TanStack Query with explicit `staleTime` per query; mutations must define `onError` and `onSuccess` (invalidate keys).
- All backend calls funnel through `useBackend()`. Components never call `fetch` directly. ESLint rule: `no-restricted-imports` + `no-restricted-syntax` for `fetch(` outside `src/lib/backend/**`.
- Seed and Backend clients implement the SAME `BackendClient` interface. No `if (mode === 'seed')` branches in components.
- Backend base URL persisted under `ui.backend.baseUrl` in `localStorage` (matches `27-config-surface.md` UI-local allowlist); runtime knob `app.backend.baseUrl` rehydrates from it on boot. Invalid URL -> fall back to Seed with a toast + `E_BE_INVALID_BASE_URL`.

## 4. Backend rules specific to plan 88 (Python FastAPI)

- Package layout per SS-02 and locked `52-sdk-facade-pattern.md` §2. `BE/main.py` = app factory only; routes in `BE/app/routes/*`; services in `BE/app/services/*`; repos in `BE/app/repos/*`; SDK access ONLY through `BE/app/facades/<vendor>_facade.py` with domain wrappers `BE/app/domain/cat_<concept>.py`. Pre-freeze `BE/sdk-facade/` layout is RETIRED.
- Uvicorn bound to `127.0.0.1` in dev; CORS restricted to `http://localhost:*`.
- Every route: (1) validate input with pydantic model; (2) delegate to a service returning `Result[T]`; (3) return `envelope.ok(...)` or raise `AppError`; global exception handler emits envelope + log.
- ruff + mypy strict for `BE/`. No `Any`, no `# type: ignore` without `# SAFETY:` + `# TODO:` + ticket.

## 5. SDK facade rule (locked `52-sdk-facade-pattern.md`)

- Raw SDK drops go under `sdk/<vendor>/<version>/` untouched, with a hashed manifest.
- Backend: SDK only via `BE/app/facades/<vendor>_facade.py` (`<Vendor>Facade`) + `BE/app/domain/cat_<concept>.py` (`Cat<Concept>`).
- Frontend: SDK only via `src/lib/facades/<Vendor>Facade.ts` + `src/lib/domain/Cat<Concept>.ts`.
- Lint gate: grep-based CI check forbids `sdk/**` imports outside those four facade folders. Violation: `E_BUG_SDK_LEAK`.

## 6. Distribution / run scripts (spec/14-update + 17-cg/28 + new `shell/26-dev-launcher.md`)

- `run.ps1` and `run.sh` at repo root:
  - Flags: `--be-port` (default 8787), `--fe-port` (default 5173), `--no-shell`, `--help`.
  - Env contract: `BE_PORT`, `FE_PORT`, `UI_BACKEND_BASE_URL`.
  - Start BE, poll `/healthz` (30s timeout), start FE, wait for port, launch shell with `?backend=<url>` unless `--no-shell` (Chromium extension vs dev harness pending `shell/01-adr-shell-choice.md` re-read at Step 21).
  - Trap EXIT / `finally` to kill child processes; idempotent re-run.
- Version pinning: bump minor after every completed task; update `README.md` pin, `CHANGELOG.md`, `RELEASE_NOTES.md`.
- `BE/pyproject.toml` version tracked by `scripts/check-version-sync.mjs`.

## 7. Enum & PascalCase JSON reminders

- All wire JSON uses PascalCase keys (`PluginSlug`, `RequestId`, `CorrelationId`). FE mappers convert to camelCase internally. Enum values on the wire are PascalCase strings.

## 8. What to actively AVOID (top-13 AI failure modes)

1. camelCase JSON keys on the wire (must be PascalCase).
2. Uppercase abbreviations (`URL`, `ID`) in identifiers.
3. Multi-return Python funcs — use `Result[T]`.
4. `fmt.Errorf` / `raise Exception("...")` — use `AppError`.
5. Nested `if` — flatten.
6. Missing boolean prefix.
7. Explicit Go `json:` tags forgotten.
8. `any` / `interface{}` / `dict` in signatures.
9. Silent `except`/`catch`.
10. `fetch(` outside the backend client.
11. Numeric error ranges (`BE-4xxx`, `CAM-10xx`) — retired, use `E_<AREA>_<CONDITION>`.
12. `Stack` field on the wire — dev-only, server logs.
13. `BE/sdk-facade/` or `src/lib/sdk-facade/` paths — retired, use `BE/app/facades/` + `src/lib/facades/` with `Cat<Concept>` wrappers.

## 9. Conflicts noticed

- None between coding + error + app guidelines for this plan. If discovered during implementation, prefer the more specific folder-level spec (`spec/21-app/**` > `spec/17-consolidated-guidelines/**` > `.lovable/*.md`) and log the conflict in `docs/plans/88/spec-gaps.md` (Step 2).

---

## Signal that Step 1 landed

- This file exists at `docs/plans/88/guideline-digest.md`.
- Every subsequent step in Plan 88 that mentions "per guidelines" resolves to a rule in this digest.
- Step 2 will diff this digest against `spec/21-app/backend-implementation-request-v1.md` to produce `spec/gaps.md`.
