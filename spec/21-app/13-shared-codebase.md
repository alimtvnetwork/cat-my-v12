---
title: Shared Codebase — Vision Inspection App
slug: shared-codebase
source: spec/21-app/12-runtime-processes.md
---

# Shared Codebase

A single Python package `app/` consumed by Supervisor, Capture, Dispatcher, Worker, and CLIs. No duplicated rule logic; no per-process forks of shared modules.

## Layout

```text
app/
  __init__.py
  supervisor/            # entry: python -m app.supervisor
  capture/               # entry: python -m app.capture
  dispatcher/            # entry: python -m app.dispatcher
  worker/                # entry: python -m app.worker
  cli/                   # entry: python -m app.cli (batch/test/monitor)
  core/                  # SHARED — imported by every entry above
    domain/              # Job, Task, Image, Region, Rule, Judgment (dataclasses, no I/O)
    rules/               # rule evaluators; single source of truth
    io/                  # DB adapters (RootDb, TaskDb, RulesDb), file naming, atomic rename
    config/              # 4-layer resolver (seed → app → task → runtime)
    ipc/                 # message schemas + socket transport
    logging/             # structured logger factory
    errors/              # error codes + 3-tier surface (see Step 37)
  contracts/             # JSON schemas: rule-instruction, judgment, ipc messages
  tests/                 # unit + contract; excluded from bundled runtime
```

## Ownership Rules

- **`core/` is import-only from entry points.** Entry points never import each other.
- **`core/rules/` is the single rule engine.** Worker calls it; CLI batch-test calls the same functions with the same inputs. If the two ever disagree, the engine is the bug.
- **`core/io/` is the only place SQLite is opened.** No entry point speaks SQL directly.
- **`contracts/` is language-agnostic.** JSON Schemas ship with the app; UI validates against the same files.
- **No circular imports.** `domain` → depended on by everything; `rules` → depends only on `domain`; `io` → depends on `domain`; `config` → standalone; `ipc` → depends on `domain`.

## Forbidden

- Duplicating rule math in the UI. UI shows results; it does not re-compute.
- Reading env vars for domain values inside entry points — always via `core/config`.
- Passing raw SQLite connections across module boundaries — always via `core/io` repositories.
- Long-running work inside `contracts/` (schemas only).

## Packaging

- Ships as one wheel `app-<version>-py3-none-any.whl`.
- Chromium shell bundles the wheel + a Python runtime (`AI-01` decides shell details).
- CLI is available for engineers to replay `images/failed/` against a candidate rule change (Step 45 testing strategy).

## Version Discipline

- `app.__version__` is the single source; RootDb `SchemaVersion` and each RulesDb/TaskDb `SchemaVersion` are compared against it at Supervisor boot. Mismatch → refuse to start, log `ErrorEvent`, surface in UI banner.

## Cross-Refs

- Process entry points → Step 11.
- Rule engine detail → Step 33 `33-rule-catalog.md`.
- JSON instruction contract → Step 32 `36-json-instruction-output.md`.

## Acceptance Checklist

- [ ] Shared module list has no import cycles.
- [ ] Every shared symbol used by workers is re-exported at the package root.
- [ ] Vendor-specific code is behind a facade per `spec/21-app/52-sdk-facade-pattern.md`.
