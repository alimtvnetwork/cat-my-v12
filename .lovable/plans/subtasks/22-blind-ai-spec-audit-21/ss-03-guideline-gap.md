# SS-03 Coding-guideline + error-management gap

Parent: 22-blind-ai-spec-audit-21
Slug: guideline-gap
Status: pending
Created: 2026-07-14

## Purpose

Confirm and document that the repository has NO coding-guidelines folder and NO error-management folder outside `spec/21-app/40-error-manage.md`.

## Evidence

- `spec/coding-guidelines/` — absent (verified).
- `coding-guidelines/` (repo root) — absent (verified).
- `.lovable/coding-guidelines.md` — absent (verified).
- `spec/XX-error-manage/` folder — absent; only single file `spec/21-app/40-error-manage.md`.

## Blind-AI implication

A blind AI cannot infer coding style, naming, logging, retry, or error-classification rules without a canonical guideline folder. Every audit issue file must either:

1. Point to a section of `40-error-manage.md`, or
2. Raise `E_SPEC_GUIDELINE_MISSING` and demand a `spec/coding-guidelines/` folder be created (Python + TypeScript at minimum, since the codebase mixes both).

## Recommended remediation (out of scope of this audit but recorded)

Create:

- `spec/coding-guidelines/01-python.md`
- `spec/coding-guidelines/02-typescript.md`
- `spec/coding-guidelines/03-logging.md`
- `spec/coding-guidelines/04-error-manage/` (folder, one file per error family)

Audit output (`spec/25-app-audit/02-scope.md`) must call out this absence as the single largest blind-AI blocker.
