# Ambiguity 01 - "code need to follow guidelines"

Status: resolved
Opened: 2026-07-21 (v3.987.0)
Blocking: Plan 88 Step 5 (and any code-touching step) until resolved.

## Verbatim user message

> code need to follow guidelines

## Why it is ambiguous

The message does not name (a) which code, (b) which guidelines file, or (c) what action to take. Multiple plausible readings, each producing a very different diff:

1. **Retro-audit existing code** against `.lovable/coding-guidelines/coding-guidelines.md` + `spec/coding-guidelines/**` and fix violations. Scope: whole `src/`, or a specific folder? Which guideline files are authoritative on conflict? (`.lovable/coding-guidelines/coding-guidelines.md` v1.4.0 exists; `spec/coding-guidelines/` has TS/Python/SQL + `01-cross-language/`, `02-typescript/`, `08-file-folder-naming/`; both are in scope per the "Additional Instruction" block of the standard prompt.)
2. **Retro-audit the Plan 88 artifacts I just wrote** (`spec/21-app/backend-implementation-request-v1.md`, `docs/plans/88/guideline-digest.md`, `docs/diagrams/backend-v1/*.md`). These are markdown, not code, so guideline compliance mostly means naming/PascalCase/`E_<AREA>_<CONDITION>` consistency (already applied in Step 3).
3. **Bind future code to the guidelines** as a lint/CI gate before Step 8 scaffolds `BE/` and `src/lib/backend/`. Add ruff/mypy/eslint config referencing the guideline rules so violations fail the build.
4. **Update the guidelines themselves** because the current version misses something the user has in mind.

## Guideline files that exist

- `.lovable/coding-guidelines/coding-guidelines.md` (v1.4.0, blind-follow compiled)
- `spec/coding-guidelines/typescript.md`, `python.md`, `sql.md`
- `spec/coding-guidelines/00-overview.md`, `01-cross-language/`, `02-typescript/`, `03-golang/`, `04-php/`, `05-rust/`, `06-ai-optimization/`, `06-cicd-integration/`, `07-csharp/`, `08-file-folder-naming/`
- Plan-88 distillation: `docs/plans/88/guideline-digest.md`

## Questions to unblock

1. **Target?** Existing `src/**` code, the Plan 88 artifacts, future `BE/**` scaffold, or the guideline docs themselves?
2. **Scope?** Whole repo, one folder, one file, or "block Step 8 until lint gates are wired"?
3. **Action?** Audit + patch, add CI enforcement, or just re-confirm the digest is authoritative?
4. **Conflict rule?** On conflict between `.lovable/coding-guidelines/coding-guidelines.md` and `spec/coding-guidelines/**`, which wins? (Default per repo convention would be folder-level `spec/**` wins.)

## Blocked artefact

Plan 88 Step 5 (`27-config-surface.md` PATCH) is paused. Any commit made against Step 5 while this is open MUST carry `Status: blocked-by-ambiguity` linking here.

## Resolution flow

When you answer, I will `mv` this file into `.lovable/ambiguous-questions/02-ambiguity-resolved/01-code-need-to-follow-guidelines.md`, append a `## Resolution` section, then execute.

## Resolution

Target: Entire codebase.
Scope: Whole repo.
Action: Audit codebase, fix query wrappers, Enums, and booleans.
Conflict rule: Follow `spec/03-error-manage` and `.lovable/memory` guidelines directly.
