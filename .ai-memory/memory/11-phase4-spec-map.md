# Phase 4 spec-map reconciliation (Plan 38 step 5)

Prompt folder -> actual repo folder (verified `ls spec/` this turn).

| Prompt reference                   | Repo actual                                                                          | Notes                                |
| ---------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------ |
| `02-spec/12-consolidated-guidelines/` | `02-spec/17-consolidated-guidelines/`                                                   | 33 files present.                    |
| `02-spec/13-cicd-pipeline-workflows/` | `02-spec/12-cicd-pipeline-workflows/`                                                   | Number differs.                      |
| `02-spec/15-wp-plugin-how-to/`        | (absent)                                                                             | Not applicable to this project.      |
| `02-spec/14-update/`                  | `02-spec/14-update/`                                                                    | Present as-is.                       |
| `.ai-memory/cicd-issues/`            | (absent)                                                                             | Recorded, not created speculatively. |
| `.ai-memory/overview.md`             | (absent, substitute `readme.md`)                                                     | Per `06-spec-map.md`.                |
| `.ai-memory/strictly-avoid.md`       | (absent, substitute `02-spec/17-consolidated-guidelines/00-strictly-avoid-quickref.md`) | Per `06-spec-map.md`.                |
| `.ai-memory/user-preferences`        | (absent)                                                                             | Uses `mem://~user` memory instead.   |
| `.ai-memory/plan.md`                 | (absent, substitute latest `.ai-memory/plans/pending/*`)                               | Per `06-spec-map.md`.                |
| `.ai-memory/suggestions.md`          | (absent)                                                                             | No substitute; noted.                |

Version-bump guard: `scripts/bump_minor.py` exists.

Plan 38 step 10 completion-confirmation block is emitted in the chat reply
for v3.213.0 -> v3.214.0, not persisted as a separate file (per user's ban on
per-invocation prompt archive files).
