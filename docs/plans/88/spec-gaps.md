# Plan 88 — Spec Gap Log (Step 2)

Diff of `spec/21-app/backend-implementation-request-v1.md` and the Plan 88
guideline digest against the locked `spec/21-app/**` corpus. Locked specs win
on every conflict; the request and the digest MUST bend to match.

Legend: **GAP** = missing coverage that needs a new/updated locked spec.
**CONFLICT** = request contradicts a locked spec and must be revised.
**ALIGN** = already covered; wire the request to the existing anchor.

---

## 1. Error contract

- **CONFLICT — Error code shape.** Digest and prior chatter used numeric
  ranges (`BE-4000..4999`, `CAM-1000..1099`). Locked `spec/21-app/40-error-manage.md`
  §2 mandates `E_<AREA>_<CONDITION>` SCREAMING*SNAKE codes drawn from a central
  enum. Rewrite ranges as `E_BE*_`and`E*CAM*_` families. Update digest.
- **CONFLICT — AppError field names.** Request lists `{code, message, details,
stack}`. Locked 40 §2 requires PascalCase `{Code, Message, Context, CausedBy}`,
  no stack on the wire, one level of `CausedBy`. Envelope MUST use PascalCase.
- **GAP — Universal Response Envelope.** Request specifies `{Status,
Attributes, Results}`. Locked 40 §3 only says "Server fn → UI: typed Response
  with `Code` in body". Needs a new locked sub-spec (proposed
  `spec/21-app/40b-http-envelope.md`) that pins the envelope, its `Status`
  enum, and how `AppError` embeds inside `Attributes.Error`.
- **ALIGN — Silent-swallow ban.** Request's "no silent catches" matches
  40 §3 `E_BUG_SILENT_SWALLOW`. Frontend `useErrorStore` and
  `GlobalErrorModal` are the UI-side of 40 §3 boundary rule.

## 2. SDK facade layout

- **CONFLICT — Folder naming.** Request says `BE/sdk-facade/` and
  `src/lib/sdk-facade/`. Locked `52-sdk-facade-pattern.md` §2 mandates the
  seam live under `app/capture/**/*_device_io.py`, `app/**/facades/**`, or a
  `*_facade.py` module, with `<Vendor>Facade` classes and `Cat<Concept>`
  domain wrappers. Backend scaffold MUST use `BE/app/facades/<vendor>_facade.py`
  and `BE/app/domain/cat_<concept>.py`, not `BE/sdk-facade/`.
- **GAP — Frontend facade rule.** 52 covers backend Python only. Need a locked
  addendum for the TypeScript side: `src/lib/facades/<vendor>Facade.ts` +
  `src/lib/domain/Cat<Concept>.ts`, lint rule `E_BUG_SDK_LEAK` mirrored in
  TS via an ESLint rule or codegen guard.
- **GAP — `sdk/` drop folder.** Not documented in
  `spec/21-app/20-folder-structure.md`. Add: read-only vendor drop, hashed
  manifest, only importable from facade modules.

## 3. Config surface

- **GAP — Backend mode + base URL.** `spec/21-app/27-config-surface.md`
  master knob table has no `app.backend.mode` (Seed|Backend) or
  `app.backend.baseUrl`. Add both:
  - `app.backend.mode` — enum `SEED`|`BACKEND`, App+Runtime, default `SEED`.
  - `app.backend.baseUrl` — string, App+Runtime, default `http://localhost:8787`,
    validated `^https?://[^/]+(/[^/].*)?$` (no trailing slash).
- **GAP — Persistence.** Request pins `localStorage` key `app.backend.baseUrl`.
  27 says only `ui.*` keys may live in `localStorage`. Either rename to
  `ui.backend.baseUrl` or extend 27 §"UI-local persistence" allowlist. Prefer
  rename for consistency.

## 4. UI surfaces

- **GAP — Home mode chip.** `30-ui-overview.md` §1 lists Home as "Jobs &
  Tasks" only. Add a compact Seed/Backend toggle + base-URL summary tile in
  the Home header. Screen owner file gains a §"Backend Mode Widget" section.
- **GAP — Settings backend section.** `39-settings-screen.md` renders knobs
  from 27; once 27 gains the two new keys they auto-surface, but 39 needs a
  named "Backend Connection" group with a "Test connection" affordance
  (calls `GET /healthz`).
- **ALIGN — Error surfacing.** UI toast/banner behavior in
  30-ui-overview §4 and 40 §3 already covers `GlobalErrorModal` semantics.

## 5. Shell / launcher / packaging

- **CONFLICT — Chromium extension shell.** `spec/21-app/shell/01-adr-shell-choice.md`
  (locked) pins a specific shell — must re-read before writing Step 21+.
  Request's "Chromium extension shell under `chromium-shell/`" may need to be
  reframed as a dev-only launcher, not a production packaging choice.
  Action: read `shell/01` and `shell/09-packaging.md` at Step 21 kickoff and
  either revise the request or downgrade `chromium-shell/` to a dev harness.
- **GAP — `run.ps1` / `run.sh`.** Locked `shell/09-packaging.md` covers
  install/package, not `dev up`. Add `shell/26-dev-launcher.md` (new) that
  pins the two scripts, their env contract (`BE_PORT`, `FE_PORT`,
  `APP_BACKEND_BASE_URL`), and readiness probes.
- **GAP — Port defaults.** Request pins `:8787` for BE. Not registered in
  27 or shell/14-file-layout. Add `network.backendPort` knob.

## 6. Security & privacy

- **ALIGN — Local-first posture.** `44-security-privacy.md` §1 allows local
  IPC; a localhost BE fits the "UI → Supervisor" trust boundary in §2.
- **GAP — Non-localhost base URL.** If operator sets `app.backend.baseUrl` to
  a non-loopback host, that becomes explicit opt-in egress under 44 §1.
  Settings editor MUST warn and require confirm, else `E_SEC_UNAPPROVED_EGRESS`.
- **ALIGN — No auth in v1.** Matches 44 §1 single-operator posture.

## 7. Observability & logging

- **ALIGN — Correlation IDs.** 40 §3 already requires correlation IDs at the
  Worker→Dispatcher boundary. Extend to HTTP: BE MUST accept and echo
  `X-Correlation-Id`; typed client MUST generate one per request.
- **GAP — Envelope logging fields.** `41-logging.md` needs a line item for
  the HTTP envelope: log `Status`, `Code` (from Attributes.Error), latency,
  correlation id. No payload bodies.

## 8. Coding rulebook

- **ALIGN — PascalCase JSON.** Matches `spec/21-app/24-results-jsonl.md` §2
  and `.lovable/memory/24-coding-and-error-rulebook.md`.
- **ALIGN — Function length + no nested if.** Matches 24 rulebook.
- **CONFLICT — Guideline digest error codes.** `docs/plans/88/guideline-digest.md`
  states "Reserved backend error range: BE-4000..4999 and CAM-1000..1099".
  Replace with the `E_BE_*` / `E_CAM_*` families from 40 §5 in Step 3.

---

## Action items feeding Steps 3–7

1. Revise `docs/plans/88/guideline-digest.md`: strike numeric ranges, adopt
   `E_<AREA>_<CONDITION>` and PascalCase envelope fields.
2. Revise `spec/21-app/backend-implementation-request-v1.md` before marking
   `accepted`: PascalCase AppError, folder layout under `BE/app/facades/`,
   `ui.backend.baseUrl` localStorage key, Chromium shell scope clarified.
3. Draft new locked specs at Step 4/5 kickoff:
   - `spec/21-app/40b-http-envelope.md` (envelope + AppError over HTTP).
   - `spec/21-app/27-config-surface.md` PATCH: add `app.backend.mode`,
     `app.backend.baseUrl`, `network.backendPort`.
   - `spec/21-app/shell/26-dev-launcher.md` (run.ps1/run.sh).
   - `spec/21-app/20-folder-structure.md` PATCH: add `sdk/`, `BE/`, and
     `src/lib/facades/` seams.
4. Confirm `spec/21-app/shell/01-adr-shell-choice.md` allows or forbids a
   Chromium extension dev shell before Step 21.

No code changes this step. Diagrams (Step 4) and the request-freeze (Step 3)
depend on the resolutions above.
