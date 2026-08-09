# Phase 4 spec-map reconciliation (Plan 38 step 5)

Prompt folder -> actual repo folder (verified `ls spec/` this turn).

| Prompt reference                   | Repo actual                                                                          | Notes                                |
| ---------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------ |
| `spec/12-consolidated-guidelines/` | `spec/17-consolidated-guidelines/`                                                   | 33 files present.                    |
| `spec/13-cicd-pipeline-workflows/` | `spec/12-cicd-pipeline-workflows/`                                                   | Number differs.                      |
| `spec/15-wp-plugin-how-to/`        | (absent)                                                                             | Not applicable to this project.      |
| `spec/14-update/`                  | `spec/14-update/`                                                                    | Present as-is.                       |
| `.lovable/cicd-issues/`            | (absent)                                                                             | Recorded, not created speculatively. |
| `.lovable/overview.md`             | (absent, substitute `readme.md`)                                                     | Per `06-spec-map.md`.                |
| `.lovable/strictly-avoid.md`       | (absent, substitute `spec/17-consolidated-guidelines/00-strictly-avoid-quickref.md`) | Per `06-spec-map.md`.                |
| `.lovable/user-preferences`        | (absent)                                                                             | Uses `mem://~user` memory instead.   |
| `.lovable/plan.md`                 | (absent, substitute latest `.lovable/plans/pending/*`)                               | Per `06-spec-map.md`.                |
| `.lovable/suggestions.md`          | (absent)                                                                             | No substitute; noted.                |

Version-bump guard: `scripts/bump_minor.py` exists.

Plan 38 step 10 completion-confirmation block is emitted in the chat reply
for v3.213.0 -> v3.214.0, not persisted as a separate file (per user's ban on
per-invocation prompt archive files).
