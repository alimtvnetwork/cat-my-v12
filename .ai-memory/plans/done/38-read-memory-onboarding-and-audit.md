# Read-memory onboarding + repo hygiene audit

Slug: read-memory-onboarding-and-audit
Steps: 10
Status: pending
Created: 2026-07-16

## Context

User invoked the "read memory" onboarding prompt plus the 10-step maximal-enforcement plan directive. This plan encodes the onboarding traversal against this project's ACTUAL layout (guidelines under `02-spec/17-consolidated-guidelines/`, done plans under `.ai-memory/plans/done/`) and audits the prompt-vs-repo gaps the onboarding surfaces (missing `.ai-memory/overview.md`, `.ai-memory/strictly-avoid.md`, `.ai-memory/user-preferences`, `.ai-memory/plan.md`, `.ai-memory/suggestions.md`, `.ai-memory/cicd-issues/`).

Captured command: `.ai-memory/02-spec/commands/13-read-memory-onboarding.md`.
Related prior pending work (unchanged, not absorbed): plans 29, 32, 33, 35, 36, 37.

## Steps

1. Phase 1 core read: `.ai-memory/memory/index.md` and every file it references (01-code-red, 02-naming, 03-error-manage, 04-design-system, 05a/b/c/d, 06-spec-map, 07-lovable-folder-guide, 08, 09, 10). Note missing-but-referenced files: `.ai-memory/overview.md`, `.ai-memory/strictly-avoid.md`, `.ai-memory/user-preferences`, `.ai-memory/plan.md`, `.ai-memory/suggestions.md`.
2. Phase 1 substitute-read (per `06-spec-map.md`): `02-spec/17-consolidated-guidelines/00-strictly-avoid-quickref.md` in place of `.ai-memory/strictly-avoid.md`; `readme.md` in place of `.ai-memory/overview.md`; latest `.ai-memory/plans/pending/*` in place of `.ai-memory/plan.md`.
3. Phase 2 consolidated guidelines: read every file under `02-spec/17-consolidated-guidelines/` in numeric order (project uses 17, not the prompt's 12). Record the actual file count.
4. Phase 3 spec authoring: read every file under `02-spec/01-spec-authoring-guide/` in numeric order, including `10-mandatory-linter-infrastructure.md`.
5. Phase 4 task-map reconciliation: build a table mapping the prompt's Phase 4 folders (e.g. `02-spec/13-cicd-pipeline-workflows/`) to this repo's actual folders (`02-spec/12-cicd-pipeline-workflows/`, `02-spec/14-update/`, no `15-wp-plugin-how-to/`). Store as `.ai-memory/memory/11-phase4-spec-map.md`.
6. CI/CD issues sweep: check for `.ai-memory/cicd-issues/`. If absent, record the absence in the memory note from step 5 and DO NOT create the folder speculatively. If present, read every `xx-*.md` inside.
7. Prompt-registry reconciliation: verify `.ai-memory/prompt.md` already aliases "read memory" (it does, to `prompts/32-read-memory.md`). Per user memory ban on per-invocation prompt archive files, do NOT add a new numbered mirror; only update the canonical `prompts/32-read-memory.md` body if the prompt text itself changed.
8. Folder-structure audit: confirm `.ai-memory/plans/done/` is used (not `completed/`) per command `08-plan-lifecycle-done-folder.md`; confirm `.ai-memory/memory/` (no trailing `s`); confirm `.ai-memory/02-spec/commands/` holds captured commands. Record any drift as issues under `.ai-memory/issues/`.
9. Version-bump guard: verify `scripts/bump_minor.py` exists and is wired into the change workflow so "any code change bumps the minor version" is enforceable. If not wired, capture an issue file, do not fix in this plan.
10. Emit the fixed completion-confirmation block (memory files read, guideline files read, spec-authoring files read, CODE-RED top 3-5, naming summary, error-handling one-liner, active plan pointer, top 3-5 strict avoidances) and stop. No code edits this plan.

## Verification

- Every file listed in `.ai-memory/memory/index.md` opened at least once (grep the tool log for each filename).
- `02-spec/17-consolidated-guidelines/` file count matches the number reported in the completion block.
- `.ai-memory/memory/11-phase4-spec-map.md` exists and lists prompt-vs-repo folder deltas.
- No new files under `01-prompts/` from this plan.
- No plan file duplicated across `pending/` and `done/`.
- Completion confirmation block posted verbatim in the shape defined by the onboarding prompt.

## Appended from prior pending tasks

- 29-denial-burst-threshold-tuning
- 32-sg-31-01-pattern-edge
- 33-plan-29-denial-burst-tuning-read-phase
- 35-ui-ux-photoshop-layers-overhaul
- 36-ui-app-shell-and-src-v3-port
- 37-home-dexter-ui-repair

(Left in place; not merged into this onboarding plan.)
