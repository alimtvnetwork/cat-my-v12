---
title: DB Conventions Digest (App-Scoped)
slug: db-conventions-digest
source: spec/04-database-conventions/
---

# DB Conventions — Digest for Vision Inspection App

Distilled from `spec/04-database-conventions/` (files 00–07). Authoritative source wins on conflict.

## Naming (01-naming-conventions.md)

- Tables: **PascalCase**, singular (`Job`, `Task`, `Image`, `Region`, `Rule`, `Judgment`).
- Columns: **camelCase** (`jobId`, `capturedAt`, `judgmentCode`).
- Primary keys: `id` (uuid v7 preferred; else auto-increment int64).
- Foreign keys: `<referenced>Id` (e.g. `jobId` → `Job.id`).
- Timestamps: `createdAt`, `updatedAt` (UTC ISO-8601). Never `created_at`.
- Booleans: affirmative only — `isActive`, `hasResult`. **Never** `notActive`, `disabled`.
- Enums: PascalCase type name, UPPER_SNAKE members (`JudgmentCode.OK|NG|REVIEW`).

## Schema Design (02-schema-design.md)

- One aggregate per table; no polymorphic FKs.
- Nullable only when domain-nullable; otherwise `NOT NULL` with explicit default.
- Money/time series in dedicated columns, never JSON blobs.
- Every table carries `createdAt`, `updatedAt`; append-only tables add `capturedAt`.

## ORM & Views (03-orm-and-views.md)

- Reads through named views; writes through repositories.
- No raw SQL in UI/Domain layers.
- Views expose camelCase, no `SELECT *`.

## Testing (04-testing-strategy.md)

- Every migration ships with an up + down; both tested.
- Seed data lives in `/seeds/<db>/*.sql`, idempotent.

## Relationships (05-relationship-diagrams.md)

- Diagrams stored as Mermaid `erDiagram` blocks alongside each DB spec.

## REST Format (06-rest-api-format.md)

- Responses: `{ data, error, meta }`. Errors carry `code` + `message` + `hint`.
- Pagination: cursor (`nextCursor`), never offset for hot tables.

## Split-DB Pattern (07-split-db-pattern.md)

- Physical split: **RootDb**, **TaskDb** (per Task), **RulesDb** (per Task).
- No cross-DB joins; the app layer composes.
- FKs never cross DB boundaries; use `<db>:<id>` string refs when needed.

## App-Specific Rules

- Tables new to this app: `Job`, `Task`, `Image`, `Region`, `Rule`, `RuleOverride`, `Judgment`, `RunSession`, `ErrorEvent`.
- `Judgment.code` is enum `JudgmentCode`; `Judgment.reason` free text for REVIEW/NG.
- `Image.uri` points to blob store; DB stores metadata only.
- `Region.shape` enum: `RECTANGLE | ELLIPSE | POLYGON` (v1 rectangle + ellipse only).

## Forbidden

- snake_case, plural table names, negated booleans, cross-DB FKs, `SELECT *` in views, raw SQL in UI.

## Acceptance Checklist

- [ ] PascalCase discriminants and camelCase columns follow memory 09.
- [ ] All schemas defined here appear in migrations under `spec/21-app/26-migrations.md` or `supabase/migrations/`.
- [ ] Split-DB boundary rules cross-link to 06.
