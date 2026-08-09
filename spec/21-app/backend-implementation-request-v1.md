# Backend Implementation Request v1

Status: accepted
Frozen: 2026-07-21 (v3.986.0)
Owner: app team
Created: 2026-07-21
Related command: `.lovable/spec/commands/40-backend-mode-toggle-and-sdk-facade.md`
Related plan: `.lovable/plans/pending/88-backend-implementation-v1-150-steps.md`
Gap log driving this revision: `docs/plans/88/spec-gaps.md`

## Purpose

Introduce a real backend (`BE/` folder at repo root) that the current frontend can talk to, while preserving the existing seeded UI mode for offline / demo use. Enforce a facade layer between the app and the (future) camera SDK on BOTH frontend and backend. Wire full error management per `spec/21-app/40-error-manage.md` and the incoming `spec/21-app/40b-http-envelope.md` sub-spec.

## Non-negotiables

1. Two UI modes: `SEED` (current in-memory fixtures) and `BACKEND` (typed HTTP client to `BE/`). Persisted config knob: `app.backend.mode` (see §Config).
2. User only ever configures the backend BASE URL prefix. Endpoints, routes, verbs, payload shapes are cemented in the typed client generated from the backend contract.
3. Backend base URL:
   - Default `http://localhost:8787`.
   - Editable from Home (compact widget) and Settings (Backend Connection group with Test connection button).
   - Persisted in `localStorage` under `ui.backend.baseUrl` (matches `27-config-surface.md` UI-local allowlist; NOT `app.backend.baseUrl`).
   - Validated by `isValidBackendPrefix(url)` regex `^https?://[^/]+(/[^/].*)?$`, no trailing slash.
   - Non-loopback hosts require explicit confirm in Settings and raise `E_SEC_UNAPPROVED_EGRESS` per `44-security-privacy.md` §1 until confirmed.
4. SDK handling (per locked `52-sdk-facade-pattern.md`):
   - Raw SDK drops live under `sdk/<vendor>/<version>/` at repo root, read-only, hashed manifest, never edited.
   - Backend consumes SDK ONLY through `BE/app/facades/<vendor>_facade.py` exposing `<Vendor>Facade` classes; domain wrappers live in `BE/app/domain/cat_<concept>.py` as `Cat<Concept>`.
   - Frontend consumes browser-side SDK bits (if any) ONLY through `src/lib/facades/<Vendor>Facade.ts` with `src/lib/domain/Cat<Concept>.ts` wrappers.
   - Lint gate: `sdk/**` imports outside those facade folders raise `E_BUG_SDK_LEAK`.
5. Error management (`spec/21-app/40-error-manage.md` + `40b-http-envelope.md`) is mandatory:
   - Backend returns the Universal Response Envelope `{ Status, Attributes, Results }` with PascalCase keys.
   - `AppError` on the wire has fields `{ Code, Message, Context, CausedBy }` (PascalCase). `Code` follows `E_<AREA>_<CONDITION>` SCREAMING*SNAKE per 40 §2. Families reserved for this project: `E_BE*_`(backend),`E*CAM*_`(camera facade),`E*SDK*_`(vendor SDK adapter),`E*SEC*_` (security posture).
   - No `Stack` on the wire. Dev-only stack lives in server logs, capped at 40 frames, sensitive values redacted.
   - Only one level of `CausedBy` per 40 §2.
   - Frontend surfaces via `useErrorStore` + `GlobalErrorModal`. No silent catches (`E_BUG_SILENT_SWALLOW`).
   - Correlation IDs: BE MUST accept and echo `X-Correlation-Id`; typed client MUST generate one per request; logged in `41-logging.md` structured line alongside `Status.Code`, envelope `Code`, and latency.
6. Launcher: `run.ps1` (Windows) and `run.sh` (POSIX) at repo root start backend + frontend together per new `spec/21-app/shell/26-dev-launcher.md`. Env contract: `BE_PORT` (default 8787), `FE_PORT` (default 5173), `UI_BACKEND_BASE_URL`. Chromium extension shell scope pending re-read of `shell/01-adr-shell-choice.md`; if that ADR blocks a production extension shell, `chromium-shell/` is downgraded to a dev-only harness and the request is amended.
7. Coding guidelines: strict TS, no `any`, PascalCase JSON keys, enum types with `Type` suffix, no magic strings, function bodies <= 15 lines, no nested `if`. See `.lovable/memory/24-coding-and-error-rulebook.md` and `docs/plans/88/guideline-digest.md`.

## Config surface additions (feed the Step 5 patch to `27-config-surface.md`)

- `app.backend.mode` — enum `SEED` | `BACKEND`, App+Runtime, default `SEED`.
- `app.backend.baseUrl` — string, App+Runtime, default `http://localhost:8787`, validated as above.
- `network.backendPort` — int, Machine, default `8787`.
- UI-local mirror: `ui.backend.baseUrl` in `localStorage` (rehydrates the runtime knob on boot).

## Architecture (high level)

- Frontend (TanStack Start) -> `src/lib/backend/` typed client -> HTTP + `X-Correlation-Id` -> `BE/` FastAPI server -> `BE/app/facades/<vendor>_facade.py` -> `sdk/<vendor>/<version>/`.
- Seed mode short-circuits the typed client with in-memory fixtures behind the SAME `BackendClient` interface, so components never branch on mode.

## Deliverables (v1)

- `BE/` scaffold (Python FastAPI) with `BE/app/facades/` and `BE/app/domain/` seams pre-wired.
- `src/lib/backend/` typed client + `SeedBackend` implementation of the same interface, plus `useBackend()` hook.
- `src/lib/facades/` + `src/lib/domain/` TS mirrors of the facade rule.
- Home Backend-Mode widget + Settings Backend Connection group (Test connection -> `GET /healthz`).
- `run.ps1`, `run.sh`, and (pending ADR re-read) `chromium-shell/` dev harness.
- Mermaid diagrams under `docs/diagrams/backend-v1/` (Step 4).
- New locked specs: `spec/21-app/40b-http-envelope.md`, `spec/21-app/shell/26-dev-launcher.md`; patches to `27-config-surface.md`, `20-folder-structure.md`, `30-ui-overview.md`, `39-settings-screen.md`, `41-logging.md`, `44-security-privacy.md`.

## Out of scope (v1)

- Real camera capture (arrives with SDK drop; only the facade seams are stubbed).
- Auth (assumed same-machine desktop; token/localhost binding deferred to v2).
- Multi-tenant / remote BE hosting (guarded by egress warn but not designed here).

## Revision notes (2026-07-21)

Frozen after applying `docs/plans/88/spec-gaps.md` action items 1–4. Corrections vs the draft: (a) error codes switched from numeric `BE-4xxx` / `CAM-10xx` to `E_<AREA>_<CONDITION>` families; (b) AppError wire fields switched to PascalCase `{Code, Message, Context, CausedBy}` with no `Stack`; (c) SDK facade folders relocated from `BE/sdk-facade/` and `src/lib/sdk-facade/` to `BE/app/facades/` + `BE/app/domain/` and `src/lib/facades/` + `src/lib/domain/`; (d) `localStorage` key renamed to `ui.backend.baseUrl`; (e) config knobs, correlation-ID contract, egress warn, and env contract for launcher promoted into the request body; (f) Chromium extension shell flagged as pending ADR re-read.
