# spec/21-app/shell — Chromium Shell (Overview)

Status: Draft (Plan 28)
Owner: spec/21-app
Applies to: desktop distribution of the Vision Inspection App
Resolves: AI-01 (see `01-adr-shell-choice.md`)

## Purpose

The Chromium Shell packages the React/HTML/CSS UI (built by Vite) and the
Python inspection worker into a single desktop application delivered per
supported OS. The shell owns process lifecycle, IPC transport, permissions,
self-update, and crash recovery. The renderer is a locked-down Chromium
WebView; the worker is a supervised Python child process.

## Scope

In scope:

- Runtime process model (shell, renderer, worker, supervisor).
- IPC transport, envelope, and versioning (see `04-ipc-contract.md`).
- Full mapping of every UI action to a backend method (see `05-ui-to-backend-map.md`).
- Boot / shutdown lifecycle and migration ordering.
- Packaging, code signing, notarization, and self-update binding to `spec/14-update/*`.
- Security, permissions, observability, and error taxonomy.
- Testing strategy, perf budgets, supply chain, uninstall.

Out of scope:

- Web-hosted or mobile delivery.
- Browser-extension delivery.
- Cloud-only variants of the backend.

## Audience

Blind AI implementers, release engineers, and QA. Every chapter must be
readable end-to-end without pulling context from source code.

## Success criteria

1. A signed, notarized installable artifact exists per OS (Windows, macOS, Linux).
2. Cold start P95 ≤ budget defined in `20-perf-budget.md`.
3. IPC round-trip P95 ≤ budget defined in `20-perf-budget.md`.
4. Self-update proven end-to-end: check → download → verify → migrate → restart → rollback.
5. Every UI surface listed in `05-ui-to-backend-map.md` has a corresponding
   backend method with contract tests.
6. No renderer path bypasses the IPC bearer token or origin lock.

## Reading order

1. `01-adr-shell-choice.md` — ADR AI-01: which shell and why.
2. `02-runtime-architecture.md` — processes, threads, ownership.
3. `03-boot-lifecycle.md` — boot to ready, shutdown.
4. `04-ipc-contract.md` — transport, envelope, errors.
5. `05-ui-to-backend-map.md` — exhaustive UI → backend rows.
6. `06-security-model.md` → `22-uninstall.md` — per-topic depth.
7. `23-implementation-checklist.md` — ordered blind-AI action list.
8. `diagrams/` — visual companions.

## High-level diagrams

- `./diagrams/01-context.mmd` — user, shell, worker, external systems.
- `./diagrams/02-process-model.mmd` — process/thread map.

## Change log

- 2026-07-14 — Draft created (Plan 28, v2.97.0).
- 2026-07-14 - Cross-links added: see `24-open-questions.md` for unresolved decisions and `25-glossary.md` for term definitions (Plan 28 Step A, v3.3.0).
