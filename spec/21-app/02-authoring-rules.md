# Authoring Rules — Vision Inspection App Specs

> **Parent:** [21-app/04-overview.md](./04-overview.md)
> **Source of truth:** [`.lovable/coding-guidelines/coding-guidelines.md`](../../.lovable/coding-guidelines/coding-guidelines.md)
> **Scope:** Rules every file under `spec/21-app/**` must follow. These are the guardrails future code will be measured against, so specs must match them exactly.

## Hard Rules (mirrored from coding-guidelines.md)

1. **Function length tiers** — target ≤8, hard cap 15, waiver window 16–25 (`# lint-allow: function-length reason="..." max=N`), framework-only ceiling 60. Any pseudocode in specs must not exceed 15 lines.
2. **No nested `if`.** Flatten with early returns.
3. **Positive conditions only** — no `!`, no negations. Boolean names begin with `is`/`has`.
4. **Narrow types.** `any`/`unknown`/`interface{}` allowed only at trust boundaries (catch, JSON parse, third-party) and must be narrowed immediately.
5. **No swallowed errors.** Every catch logs with context per §Error & Logging.
6. **Files ≤ 80–100 lines.** Split larger specs into siblings (`10-*`, `11-*`, …).
7. **No magic strings/numbers.** Use Enums or named Constants.
8. **Definitions in dedicated files** — no inline enum literals in narrative prose.
9. **DRY** — reference sibling specs by relative link instead of restating.
10. **React components** small and reusable; multi-component features require a Mermaid component diagram in the spec.
11. **Every `Type` / `Kind` / `Status` / `Category`** is a typed Enum + 1-N/N-M join table — never inline strings.
12. If a `spec/**/error-manage/` folder exists, its rules override any local convention.

## Data & Schema Rules

- Tables / Entities → **PascalCase** (`Task`, `Image`, `Region`, `Rule`, `Judgment`).
- Fields / columns → **camelCase** (`taskId`, `capturedAt`, `isOk`).
- JSON keys **and** JSON string values → **PascalCase** (`"Status": "Ok"`).
- Every primary key: `int auto-increment`, named `{TableName}Id` (`TaskId`, `ImageId`).
- Category-like columns → smallest appropriate integer FK to a lookup table.
- Default DB engine → **SQLite**. Prefer an ORM. PK/FK declared explicitly.
- Every DB spec MUST include a **Mermaid ERD** and cite `spec/04-database-conventions/` + `spec/05-split-db-architecture/`.

## Error & Logging

- Catch → log → rethrow or handle. Never silent.
- Log level matches severity; every log line carries operation name + key inputs.
- Every Rule failure emits a `code`, machine `reason`, and human `message` (see Step 37: `40-error-manage.md`).

## Spec-file structure invariants

Every leaf spec file under `spec/21-app/` MUST have:

1. Front-matter: `Version`, `Updated`, `Status`, `AI Confidence`, `Ambiguity`.
2. `## Overview` — one paragraph, plain-language.
3. Body sections in stable order.
4. `## Cross-References` — relative links to prerequisite specs.
5. `## Verification` — how the section is checked (linter, test, review).

## Forbidden in this pass

- **Any backend code.** No Python, no SQL DDL, no worker skeletons. Diagrams and JSON examples are allowed; runnable code is not.
- **Any UI code.** Screens are described, wireframed, and JSON-contracted only.
- **Vendor product names** used as identifiers (IP hygiene from project memory).

## Conflict resolution

Folder-level spec (`spec/**/error-manage/`, `spec/05-split-db-architecture/`, `spec/04-database-conventions/`) beats a local rule. Call out the conflict in the affected file's `## Cross-References` block.

## Acceptance Checklist

- [ ] Every new spec under `spec/21-app/` conforms to the naming/charset rules stated here or emits `E_NAME_INVALID_CHARSET`.
- [ ] PascalCase enum policy in this file matches `.lovable/memory/09-enums-and-results-shape.md` verbatim; drift = `E_SPEC_TAXONOMY_CONTRADICTION`.
- [ ] Coding-guideline pointer resolves to `spec/coding-guidelines/{python,typescript,sql}.md`; missing folder = `E_SPEC_GUIDELINE_MISSING`.
