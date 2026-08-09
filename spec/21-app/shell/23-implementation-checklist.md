# Implementation checklist (blind-AI entry point)

Status: Draft (Plan 28)
Companion: `.lovable/plans/subtasks/28-chromium-shell-spec/ss-05-implementation-checklist.md`

Read this file FIRST at build time. Each phase has ordered rows with:
**action → files touched → acceptance test → rollback**.

## Phase 1 — Scaffold

| #   | Action                           | Files                                         | Acceptance                           | Rollback            |
| --- | -------------------------------- | --------------------------------------------- | ------------------------------------ | ------------------- |
| 1.1 | Init Tauri app                   | `src-tauri/`, `tauri.conf.json`               | `cargo tauri dev` opens window       | `rm -rf src-tauri/` |
| 1.2 | Wire Vite `dist/` as `distDir`   | `tauri.conf.json`                             | Renderer loads built UI via `app://` | revert conf         |
| 1.3 | Add PyInstaller build for worker | `pyinstaller.spec`, `scripts/build-worker.sh` | `dist/worker/worker` runs standalone | remove spec         |

## Phase 2 — IPC

| #   | Action                                   | Files                                          | Acceptance                                   |
| --- | ---------------------------------------- | ---------------------------------------------- | -------------------------------------------- |
| 2.1 | Implement envelope codec (Rust + Python) | `src-tauri/src/ipc/`, `app/ipc/`               | Unit tests in both languages green           |
| 2.2 | Loopback HTTP+WS bind, port readback     | `app/ipc/server.py`, `app/supervisor/boot.py`  | Shell reads `READY {"port":N}`               |
| 2.3 | Bearer token issue + verify              | `src-tauri/src/ipc/auth.rs`, `app/ipc/auth.py` | 401 on bad token; constant-time compare test |
| 2.4 | Preload `window.__SHELL_IPC__`           | `src-tauri/preload.ts`                         | Renderer smoke test via DevTools             |
| 2.5 | Idempotency LRU (60 s, 10k)              | `app/ipc/dedupe.py`                            | Duplicate `cid` returns cached               |

## Phase 3 — Worker + supervisor

| #   | Action                                | Acceptance                        |
| --- | ------------------------------------- | --------------------------------- |
| 3.1 | Spawn worker with env; capture stdout | shell shows READY line            |
| 3.2 | Supervisor `/healthz` probe every 2 s | `E_SHELL_WORKER_CRASH` on 3 fails |
| 3.3 | Graceful shutdown POST `/shutdown`    | worker exits 0 within 5 s         |

## Phase 4 — UI wiring

| #   | Action                                            |
| --- | ------------------------------------------------- |
| 4.1 | Implement every row in `05-ui-to-backend-map.md`. |
| 4.2 | Contract test per row (`tests/contract/`).        |
| 4.3 | Streaming methods use WS with `seq/final`.        |

## Phase 5 — Boot lifecycle

Per `03-boot-lifecycle.md`. Acceptance: log lines for every stage present.

## Phase 6 — Observability

Per `11-observability.md`. Acceptance: missing-log test green.

## Phase 7 — Permissions

Per `07-permissions-and-consent.md`. Acceptance: `tests/contract/test_consent.py` extended for four classes.

## Phase 8 — Feature flags + license

Wire `useLicenseFeatures` handoff; kill switch honored.

## Phase 9 — Packaging

Per `09-packaging.md`. Acceptance: artifacts appear in `target/release/bundle/` per OS.

## Phase 10 — Signing + notarization

Per `10-code-signing.md`. Acceptance: SmartScreen / Gatekeeper accept.

## Phase 11 — Self-update

Per `08-updates-binding.md`. Acceptance: end-to-end upgrade + rollback demo recorded.

## Phase 12 — E2E

Playwright driving the shell binary; scenarios cover every route.

## Phase 13 — Perf gates

Per `20-perf-budget.md`. CI fails on > 20% regression.

## Phase 14 — Release

Per `spec/16-generic-release/`. SBOM + license inventory attached; changelog updated.

## Definition of done

- No row unmarked.
- Every acceptance test cited above is green in CI on all three OSes.
- Blind-AI rescore of `spec/21-app/shell/` ≥ 100/100.
