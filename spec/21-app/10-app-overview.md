---
title: Vision Inspection App — Overview
slug: app-overview
source: spec/21-app/01-initial-instructions.md
note: >
  The folder-convention `00-overview.md` is reserved for the placement rule
  (see spec-authoring guide). This file holds the product-level overview
  per Plan 04 Step 9.
---

# Vision Inspection Automation — Overview

## Scope

A local-first machine-vision inspection app that captures images from an industrial camera at up to 77 fps, evaluates configurable rules against operator-defined regions, and produces PASS/FAIL judgments with per-image evidence and per-Task summaries.

## Users

- **Operator** — runs Jobs/Tasks, reviews live counters and judgments.
- **Engineer** — authors Tasks: cameras, triggers, lighting, regions, rules, tolerances.
- **Reviewer** (future) — validates ambiguous NGs through the AI Review stub.

## Non-Goals (this pass)

- No backend code and no UI code (SPEC ONLY — Acceptance #7 of source).
- No cloud sync, no multi-site aggregation, no auth server.
- No hardware bridge — camera SDK integration is spec'd, not implemented.
- No AI Validation implementation (contract only, per `AI-02`).

## Stack (Provisional — pending `AI-01` in issues log)

- **Backend:** Python (long-running supervisor + worker pool + SDK capture process).
- **UI:** React + Tailwind v4, delivered inside a Chromium-embed shell (Python+CEF / Tauri / Electron — TBD).
- **Storage:** SQLite in Split-DB layout (RootDb + per-Task TaskDb + RulesDb), files on local disk.
- **Config:** Seedable JSON with 4-layer resolution (see `04-seedable-config-digest.md`).
- **Target OS:** Windows primary, Linux secondary (`AI-06`).

## Locked Domain

Job → Task → Image → Region → Rule → Judgment → Result. Vocabulary frozen in `00-glossary.md`.

## Data Split

- `RootDb`: registry (Job, Task, RunSession, ErrorEvent, AppSetting).
- `TaskDb` (per Task): hot capture path (Image, Region, Judgment) at 77 fps writes.
- `RulesDb` (per Task): Rule, RuleOverride, RuleVersion (setup-time edits, versioned snapshot).

## Runtime Shape

1. **SDK Capture Process** — writes images to `pending/` (atomic `.part` → final rename).
2. **Dispatcher** — hands pending images to workers.
3. **Worker Pool** — `WorkerCount=8` × `BatchSize=3` (defaults, `AI-03`); evaluates Rules against Regions, writes Judgment rows to TaskDb, moves images to `processed/` or `failed/`.
4. **UI** — Run Monitor renders live counters; Rule Setup edits RulesDb (writer-exclusive) without blocking capture.

## Acceptance (source file, condensed)

1. 77 fps capture sustained.
2. Zero cross-DB joins.
3. Task delete removes exactly one folder.
4. Fresh install boots with zero manual config.
5. Rule Setup produces canonical JSON that workers consume as-is.
6. Every NG carries a machine code + human reason.
7. **No backend/UI code lands in this authoring pass.**

## Open Ambiguities

See `spec/22-app-issues/01-vision-inspection-ambiguities.md` (`AI-01`…`AI-08`).

## Reading Order for New Contributors

1. `00-glossary.md`
2. `00-authoring-rules.md`
3. `02-db-conventions-digest.md`
4. `03-split-db-digest.md`
5. `04-seedable-config-digest.md`
6. `05-image-index.md`
7. This file
8. Then Phase B (`10-system-context.md` →).

## Acceptance Checklist

- [ ] 77 fps capture target restated and linked to 15/17.
- [ ] Every acceptance bullet has an owning spec + test reference.
- [ ] Reading order for new contributors resolves without dead links.
