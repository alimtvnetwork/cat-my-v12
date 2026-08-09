---
title: Split-DB Architecture Digest (App-Scoped)
slug: split-db-digest
source: spec/05-split-db-architecture/
---

# Split-DB Architecture — Digest for Vision Inspection App

Distilled from `spec/05-split-db-architecture/` (00 overview, 01 fundamentals, 02 features, 03 issues, 97/98 acceptance).

## Three Physical Databases (SQLite)

### 1. RootDb (`root.db`)

Scope: global, single-file, one per install.
Owns: `Job`, `Task` (registry rows only), `RunSession`, `User`, `ErrorEvent`, app config.
Never owns: per-Task images, regions, rules, judgments.

### 2. TaskDb (`tasks/<taskId>/task.db`)

Scope: one file per Task; created when a Task is created, deleted with the Task.
Owns: `Image`, `Region`, `Judgment`, hot capture/result data (77 fps writes).
Never owns: cross-Task registries, rule definitions.

### 3. RulesDb (`tasks/<taskId>/rules.db`)

Scope: one file per Task, sibling to TaskDb; edited in Rule Setup mode.
Owns: `Rule`, `RuleOverride`, `RuleVersion` (immutable history).
Split from TaskDb so rule edits during setup do not block hot-path capture writes in TaskDb.

## Rules

- **No cross-DB joins.** Application layer composes results.
- **No cross-DB FKs.** Use string ref `"<dbTag>:<id>"` where a link is needed (e.g. `Judgment.ruleRef = "rules:<uuid>"`).
- **Migrations are per-DB.** Each DB has its own migration folder and version table `SchemaVersion`.
- **Backups are per-Task.** Backing up a Task = zipping `tasks/<taskId>/`.
- **Failure isolation.** Corruption in one TaskDb never blocks other Tasks or RootDb.

## Read/Write Paths

- Capture pipeline (hot): writes only to TaskDb; reads Rule snapshot cached in memory at Task start.
- Rule Setup: writes to RulesDb; on Task start, snapshot loaded into memory, versioned.
- Reporting: reads across TaskDbs via composition worker; no join layer at SQL level.

## Concurrency

- WAL mode on all three.
- One writer per DB; readers unlimited.
- TaskDb writer = capture pipeline; RulesDb writer = setup UI; RootDb writer = app supervisor.

## Failure Modes (from 03-issues)

- Orphan TaskDb (Task deleted from RootDb but folder remains) → nightly reconciler.
- RulesDb newer than snapshot in RunSession → block start, force reload.
- Disk full on TaskDb → capture pipeline halts Task, logs `ErrorEvent` to RootDb, marks Task `DEGRADED`.

## Acceptance (97/98)

- 77 fps sustained TaskDb writes with WAL + batched transactions.
- Zero cross-DB joins in shipped SQL (lint gate).
- Task delete removes exactly one folder; no RootDb dangling refs.

## App-Specific Wiring

- `Job` → many `Task` (RootDb).
- `Task` (RootDb) ↔ `task.db` + `rules.db` folder pair.
- `Judgment.imageRef = "task:<imageId>"`, `Judgment.ruleRef = "rules:<ruleId>"`.
- No `Rule` row in TaskDb; only its ref + snapshotted evaluator input.

## Acceptance Checklist

- [ ] Zero cross-DB joins asserted; enforced by test named in `spec/21-app/45-testing-strategy.md`.
- [ ] Root DB and Task DB responsibilities enumerated with no overlap.
- [ ] Deletion semantics (task folder removal) resolve to a single owner path.
