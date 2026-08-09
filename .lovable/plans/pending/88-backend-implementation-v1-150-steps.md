# Backend Implementation v1 — 150-step plan

Slug: backend-implementation-v1-150-steps
Steps: 150
Status: pending
Created: 2026-07-21

## Context

Introduce a real backend under `BE/` alongside the existing seeded UI, with a Seed/Backend mode toggle on Home + Settings, a typed client, an SDK facade layer on both sides, full error management per `spec/03-error-manage`, and a `run.ps1`/`run.sh` + Chromium extension shell launcher. Prior planning turns produced Plans 84/87 already completed; unresolved pending plans (29, 35, 36, 40, 41, 44, 49–52, 58–63, 79–83, 85) remain and are NOT absorbed into this plan; they continue their own lifecycles.

Captured inputs:

- Command: `.lovable/spec/commands/40-backend-mode-toggle-and-sdk-facade.md`
- Issue: `.lovable/issues/38-home-lacks-backend-mode-toggle-and-sdk-facade.md`
- Spec: `spec/21-app/backend-implementation-request-v1.md`

Depth links:

- SS-01 Mermaid diagrams: `./subtasks/88-backend-implementation-v1-150-steps/SS-01-mermaid-diagrams.md`
- SS-02 BE scaffold: `./subtasks/88-backend-implementation-v1-150-steps/SS-02-be-scaffold.md`
- SS-03 FE typed client: `./subtasks/88-backend-implementation-v1-150-steps/SS-03-fe-typed-client.md`
- SS-04 Run scripts + Chromium shell: `./subtasks/88-backend-implementation-v1-150-steps/SS-04-run-scripts-and-chromium-shell.md`

## Steps

1. Read `spec/02-coding-guidelines/**`, `spec/02-coding-guidelines/21-app/**`, `spec/14-update/**`, `spec/17-consolidated-guidelines/**`, `spec/03-error-manage/**` end-to-end; write a one-page digest to `docs/plans/88/guideline-digest.md`.
2. Read `spec/21-app/**` (overview, folder-structure, error-manage, logging, security, sdk-facade-pattern); log gaps into `docs/plans/88/spec-gaps.md`.
3. Freeze the Backend Implementation Request v1 by moving `spec/21-app/backend-implementation-request-v1.md` from `draft` to `accepted` in its frontmatter.
4. Author Mermaid diagrams per SS-01 under `docs/diagrams/backend-v1/`.
5. Add index page `docs/diagrams/backend-v1/README.md` embedding each `.mmd` with `lov-artifact` tags.
6. Confirm backend language = Python FastAPI (matches `app/`, `worker/`); record decision in `docs/plans/88/decisions.md`.
7. Create `BE/` skeleton per SS-02 (files, empty modules, `pyproject.toml`).
8. Add `BE/README.md` describing layout, run commands, and facade rule.
9. Implement `BE/config.py` with pydantic settings: `host`, `port=8787`, `env`, `logLevel`.
10. Implement `BE/envelope.py` with `Envelope`, `ok(data)`, `fail(code, message, details)`.
11. Implement `BE/errors/codes.py` with numeric ranges from `spec/03-error-manage/03-error-code-registry`.
12. Implement `BE/errors/apperror.py`: `AppError`, `Result[T]`, `wrap()`.
13. Implement `BE/errors/handlers.py`: FastAPI exception handlers that emit envelope + structured log.
14. Wire logging config (JSON, camelCase fields) in `BE/main.py`.
15. Implement `BE/main.py` app factory with CORS restricted to `http://localhost:*`.
16. Implement `GET /health` route returning envelope with `status=ok`, `uptimeSec`, `version`.
17. Implement `GET /meta` returning `version`, `capabilities`, `sdkFacadeVersion`.
18. Add `BE/routes/rules.py` stubs: list/get/create/update/delete returning envelope; back with in-memory dict.
19. Add `BE/routes/samples.py` returning the same sample list currently seeded on FE.
20. Add `BE/sdk-facade/__init__.py` with `SdkFacade` protocol and version constant.
21. [x] Add `BE/sdk_facade/camera.py` `InMemoryCameraFacade` aligned to `sdk/daheng-galaxy-sdk-manual.md` §2 (Daheng MERCURY2). Protocol expanded: `list_devices/open/close/start_stream/stop_stream/grab/set_exposure/set_gain/set_roi/set_pixel_format/set_trigger/execute_software_trigger/read_line_status/set_line_output`. Enums: `PixelFormat`, `TriggerMode/Source/Activation`. Dataclasses: `DeviceInfo`, `Roi`, `Frame`. Errors: `E_CAM_NOT_CONNECTED` (unknown serial / grab-before-stream), `E_CAM_CAPTURE_FAILED` (`grab` refuses to fabricate pixels), `E_BE_BAD_REQUEST` (param out-of-range with node/min/max/inc), `E_BE_CONFLICT` (second open). `SDK_FACADE_VERSION` bumped `0.2.0-protocol` -> `0.3.0-protocol`. Tests: `BE/tests/test_camera_facade.py` (23 cases) + updated `test_sdk_facade.py`, `test_meta.py`, `test_skeleton.py`. **88/88 pytest passing.**
22. Add `BE/sdk-facade/storage.py` `StorageFacade` stub for later.
23. Add `BE/tests/test_health.py`, `test_envelope.py`, `test_error_handlers.py`; ensure `pytest` green.
24. Add `BE/tests/test_rules_crud.py` covering envelope shape + error paths.
25. Add `pyproject.toml` scripts: `be-dev`, `be-test`, `be-lint` (ruff).
26. Add `ruff.toml` in `BE/` enforcing function length + no bare except.
27. Add `mypy.ini` in `BE/` strict for `BE/` package.
28. Create `sdk/` folder at repo root with `README.md` explaining "raw drops only, never edited".
29. Add `.gitattributes` entry ensuring `sdk/**` is committed as-is (binary safe).
30. Create `src/lib/backend/types.ts` per SS-03 with `BackendClient` interface and `Envelope<T>`.
31. Create `src/lib/backend/http.ts` fetch wrapper with envelope decode + error mapping.
32. Create `src/lib/backend/httpClient.ts` implementing `BackendClient` against `BE/` routes.
33. Create `src/lib/backend/seedClient.ts` implementing `BackendClient` from existing fixtures.
34. Create `src/lib/backend/mode.ts` zustand store with persist to `localStorage`.
35. Create `src/lib/backend/provider.tsx` (`BackendProvider`, `useBackend()`).
36. Mount `BackendProvider` in `src/routes/__root.tsx` above the query provider.
37. Add `isValidBackendPrefix(url)` positive-guard util under `src/lib/backend/validate.ts`.
38. Register backend-related error codes in `src/lib/errors/registry.ts` (net, envelope-parse, invalid-url, unreachable).
39. Wire fetch failures through `showToastError` + `useErrorStore` with `View Details` action.
40. Add unit tests: `src/lib/backend/__tests__/httpClient.test.ts` using msw.
41. Add unit tests: `src/lib/backend/__tests__/seedClient.test.ts`.
42. Add unit tests: `src/lib/backend/__tests__/mode.test.ts` for persistence.
43. Migrate one existing seeded read (rules list) to `useBackend().rules.list()` behind both clients.
44. Migrate samples read to `useBackend().samples.list()`.
45. Ensure Seed mode produces byte-identical UI to current homepage — snapshot with Playwright.
46. Build the Home "Mode" section: segmented `Seed | Backend` control at the bottom strip.
47. When `Backend` selected, reveal inline input for base URL prefix + Save button; validate live.
48. Persist changes immediately; show a tone-coded status pill (`connected` / `unreachable` / `seed`).
49. Add health-probe hook `useBackendHealth()` polling `/health` every 15s only in Backend mode.
50. Mirror the same toggle + URL editor in Settings under a new "Backend" section.
51. Add "Reset to default (http://localhost:8787)" button in Settings.
52. Add "Copy diagnostics" button that dumps mode, baseUrl, last health, last error to clipboard.
53. Ensure no component branches on mode; all reads go through `useBackend()`.
54. Add Playwright test: toggle to Backend, set bad URL, expect error card + fallback to Seed.
55. Add Playwright test: toggle to Backend with running BE (mocked), expect `connected` pill.
56. Author `run.sh` per SS-04.
57. Author `run.ps1` per SS-04.
58. Add `scripts/dev/wait-for-http.sh` and `.ps1` helpers used by both launchers.
59. Add trap/finally cleanup killing child processes on exit in both scripts.
60. Add `--no-shell` flag to skip Chromium launch (CI / server use).
61. Scaffold `chromium-shell/` MV3 extension per SS-04 (manifest, background, popup).
62. Add `chromium-shell/icon.png` (generate 128x128 minimal mark).
63. Package extension: `nix run nixpkgs#zip -- -r public/app-shell.zip .` from `chromium-shell/`.
64. Add a download button on Home ("Install desktop shell") that fetches `/app-shell.zip` via blob.
65. Document install steps (chrome://extensions → Load unpacked) in `chromium-shell/README.md`.
66. Add `run.sh --help` / `run.ps1 -Help` printing all flags.
67. Add repo-root `README.md` section "Local dev (BE+FE+Shell)" linking the scripts.
68. Add CI job `be-tests` running `pytest` in `BE/`.
69. Add CI job `be-lint` running `ruff` + `mypy` in `BE/`.
70. Add CI job `fe-backend-tests` running the new vitest suites.
71. Wire `.githooks/pre-commit` to run `ruff --fix` on staged `BE/**.py`.
72. Add error code range reservation for backend (`BE-4000..4999`) to registry + docs.
73. Author `spec/03-error-manage/01-error-resolution/03-retrospectives/05-backend-v1-bootstrap.md` (placeholder to fill on completion).
74. Add `docs/plans/88/verification.md` listing every step's proof artifact.
75. Add contract test: envelope schema in FE matches `BE/envelope.py` output (generated JSON fixture).
76. Emit OpenAPI from FastAPI at `/openapi.json`; commit snapshot to `BE/openapi.snapshot.json`.
77. Add script `scripts/check-openapi-drift.sh` comparing live to snapshot; wire into CI.
78. Generate TS types from OpenAPI into `src/lib/backend/generated/` via `openapi-typescript`.
79. Replace hand-written types in `types.ts` with re-exports from generated where safe.
80. Add `BE/routes/rules.py` full CRUD backed by an in-memory repo abstraction.
81. Introduce `BE/repos/rules_repo.py` with `RulesRepo` protocol + `InMemoryRulesRepo`.
82. Add `BE/repos/samples_repo.py` mirroring current FE seed data.
83. Add settings toggle "Persist rules server-side" (default on in Backend mode).
84. Add optimistic update pattern in FE mutations via TanStack Query `onMutate`.
85. Ensure every mutation defines `onError` that routes into `useErrorStore` unless `meta.suppressGlobalError`.
86. Add `BE/middleware/request_id.py` generating `X-Request-Id`; include in envelope `Attributes.TraceId`.
87. Propagate `X-Request-Id` from FE via `http.ts` (generate ulid if missing).
88. Log every request with method, path, status, durMs, requestId.
89. Add rate-limit stub middleware (allow all in dev) with hook points for later.
90. Add `BE/security/cors.py` centralizing CORS config; reject non-localhost origins by default.
91. Add `.env.example` at `BE/` documenting env vars.
92. Add Windows service-mode notes in `BE/README.md` (future work marker).
93. Add integration test: FE (vitest + msw against generated types) round-trips a rule create.
94. Add Playwright e2e: with `--no-shell`, launch BE + FE, toggle Backend, create a rule, reload, verify persistence.
95. Add screenshot baselines for Home Mode strip (Seed, Backend-connected, Backend-error).
96. Add screenshot baseline for Settings Backend section.
97. Update `.lovable/memory/index.md` Core with: "Backend mode + SDK facade rule (Command 40)".
98. Add `mem://features/backend-mode.md` describing toggle behavior + storage keys.
99. Add `mem://features/sdk-facade.md` describing raw `sdk/` vs facade layers rule.
100. Add lint rule (eslint no-restricted-imports) forbidding `src/**` from importing `sdk/**`.
101. Add ruff custom check (or grep in CI) forbidding `BE/**` from importing `sdk` directly outside `BE/sdk-facade/`.
102. Add `docs/diagrams/backend-v1/07-error-envelope-sequence.mmd` covering retries.
103. Add `docs/diagrams/backend-v1/08-mode-fallback.mmd` for invalid URL fallback.
104. Add `AGENTS.md` section pointing future agents at Command 40 + this plan.
105. Verify `run.sh` on a clean sandbox: BE up on 8787, FE on 5173, health green in <10s.
106. Verify `run.ps1` on Windows notes doc (manual verify checklist since sandbox is POSIX).
107. Add graceful shutdown to BE (SIGTERM handler, flush logs).
108. Add `/health/deep` returning envelope with subchecks (repo, sdkFacade) — all `ok` for v1.
109. Wire FE `useBackendHealth()` to prefer `/health/deep` when available.
110. Add capability negotiation: FE reads `/meta.capabilities` to hide features BE does not expose.
111. Gate the Rules "Server-side persist" toggle behind `capabilities.rulesRepo === 'server'`.
112. Add `BE/tests/test_meta.py` asserting capability contract.
113. Add FE test asserting a missing capability hides its UI affordance.
114. Add `security/security-memory` note: backend runs bound to 127.0.0.1 only in dev.
115. Add explicit bind to `127.0.0.1` in `run.sh`/`run.ps1` uvicorn args.
116. Add `--host` flag documented but warned against for non-dev.
117. Add `BE/main.py` startup banner logging bound host + port + version.
118. Add FE "About" dialog showing FE version, BE version (from `/meta`), and mode.
119. Add Playwright test: "About" dialog matches BE `/meta.version`.
120. Delete any dead code paths for direct-fetch calls in FE that bypass `useBackend()`.
121. Grep the repo for `fetch(` in `src/**` outside `src/lib/backend/**` and route them or justify.
122. Add ESLint rule to forbid raw `fetch(` outside `src/lib/backend/**`.
123. Add ADR `docs/adr/0001-backend-mode-and-facade.md` recording the decision.
124. Cross-link ADR from the spec request and this plan.
125. Add release-notes section for v3.984.0 describing Mode toggle + BE scaffold (draft, unshipped).
126. Add `scripts/check-version-sync.mjs` handling for `BE/pyproject.toml` version pinning.
127. Bump repo version by minor once Steps 1–125 land; update `README.md` version pin.
128. Move plan file to `.lovable/plans/completed/88-backend-implementation-v1-150-steps.md` on final green.
129. Flip frontmatter `Status: completed` in the moved file.
130. Update `assets/issues/` link block if new screenshots are captured during verification.
131. Save any user-provided SDK drops under `sdk/<vendor>/<version>/` per Command 40.
132. Add `sdk/README.md` listing current drops (start empty).
133. Extend `BE/sdk-facade/camera.py` with per-vendor adapter registry keyed by SDK name.
134. Add unit test for facade registry resolving to a stub adapter when SDK missing.
135. Add contract test ensuring facade methods are stable across adapters.
136. Wire FE camera UI (existing Camera setup surface) to call `useBackend().camera.listDevices()`.
137. In Seed mode return two fake devices ("Seed Cam A", "Seed Cam B") so UI keeps working.
138. In Backend mode with no SDK, surface `CAM-1000` friendly message via error store.
139. Add Playwright test for both camera behaviors (seed vs backend-no-sdk).
140. Author user-facing docs `docs/user/switching-backend-mode.md` (screens + steps).
141. Author `docs/user/installing-desktop-shell.md` covering the Chromium extension.
142. Author `docs/dev/backend-contract.md` referencing OpenAPI snapshot.
143. Verify all coding-guideline lints pass (no `any`, no nested if, function <=15 lines) on new FE code.
144. Verify all backend files respect ruff + mypy strict.
145. Run full test suite (`bun run test`, `pytest -q` in `BE/`); attach reports under `tests/reports/plan-88/`.
146. Run Playwright visual suite; commit new baselines under `tests/visual/__screenshots__/plan-88/`.
147. Update `.lovable/memory/index.md` Memories with links to new memory files.
148. Announce completion in `docs/plans/88/verification.md` with checkmarks per step.
149. Perform the plan move (Step 128) + version bump (Step 127) as the final commit sequence.
150. Post a short summary in chat listing what shipped, what deferred, and the new commands/memories.

## Verification

Per-step proof lives in `docs/plans/88/verification.md`. Aggregate signals: `pytest` green in `BE/`, `bun run test` green, Playwright suites green with new baselines, `/health` returns envelope on localhost, Mode toggle round-trips a rule create+reload in Backend mode, seed mode remains byte-identical to today's home screen, no `src/**` file imports from `sdk/**`, no `BE/**` file imports `sdk` outside `BE/sdk-facade/`, ADR + spec + memory all cross-linked.

## Appended from prior pending tasks

None absorbed. Existing pending plans (29, 35, 36, 40, 41, 44, 49, 50, 51, 52, 58, 59, 61, 62, 63, 79, 80, 81, 82, 83, 84, 85) keep their own lifecycles.
