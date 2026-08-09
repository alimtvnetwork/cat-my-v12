---
title: Seedable Config Digest (App-Scoped)
slug: seedable-config-digest
source: spec/06-seedable-config-architecture/
---

# Seedable Config — Digest for Vision Inspection App

Distilled from `spec/06-seedable-config-architecture/` (00 overview, 01 fundamentals, 02 features, 03 issues, 97/98 acceptance).

## Purpose

Deterministic, versioned defaults that seed every fresh install and every new Task. Config is **layered**: Seed → App (RootDb) → Task (RulesDb) → Runtime UI override.

## Layer Resolution (top wins)

1. Runtime UI override (session-only, not persisted unless "Save" clicked).
2. Task override (`RulesDb.Config` rows, per-Task).
3. App-level (`RootDb.AppSetting`).
4. Seed file (`/seeds/config.default.json`, shipped, read-only).

## Seed File Rules

- Location: `/seeds/config.default.json`.
- Format: PascalCase keys, primitive values only.
- Idempotent: re-applying seed never overwrites Task or App overrides — only fills missing keys.
- Every key documented in `/seeds/config.schema.json` with type + range + description.

## App-Owned Keys (RootDb.AppSetting)

- `WorkerCount` (int, default 8, range 1–32)
- `BatchSize` (int, default 3, range 1–16) — per-worker parallel images
- `CapturePath` (path, default `./data/capture/`)
- `ProcessedPath` (path, default `./data/processed/`)
- `FailedPath` (path, default `./data/failed/`)
- `SaveFormat` (enum: `JSON | CSV | BOTH`, default `JSON`)
- `LogRetentionDays` (int, default 30)

## Task-Owned Keys (RulesDb.Config)

- `ToleranceDefault` (float, 0.0–1.0, default 0.95)
- `MatchPercentThreshold` (int, 0–100, default 85)
- `RegionShapeDefault` (enum: `RECTANGLE | ELLIPSE`, default `RECTANGLE`)
- `AiValidationEnabled` (bool, default false)

## Change Management

- Every seed change ships a migration note in `/seeds/changelog.md`.
- Config schema version stored in `SchemaVersion` of RootDb; mismatch → app refuses to boot, logs `ErrorEvent`.
- No config value read at hot path; workers snapshot config at Task start into memory.

## Forbidden

- Reading env vars for domain config (only infra: DB paths, log level).
- Writing to seed file at runtime.
- Cross-Task config bleed — Task overrides must not leak to RootDb.

## Acceptance (97/98)

- Fresh install boots with zero manual config.
- Reset-to-defaults restores exactly the seed values, never removes user Tasks.
- Config edit in UI is atomic (all-or-nothing transaction per layer).

## Acceptance Checklist

- [ ] Every config key stated here appears in `spec/21-app/27-config-surface.md`.
- [ ] First-boot defaults produce a working system with zero manual edits.
- [ ] Secrets are excluded from seed set and routed through `secrets` connector.
