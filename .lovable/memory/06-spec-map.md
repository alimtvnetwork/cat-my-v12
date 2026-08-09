# Spec Section Map

Source: `spec/00-overview.md`, `spec/spec-index.md` (411 files, 13 categories).

## Mandatory — read before any code change

| #   | Folder                             | Why                                                                              |
| --- | ---------------------------------- | -------------------------------------------------------------------------------- |
| 02  | `spec/02-coding-guidelines/`       | Cross-language rules (boolean, negation, complexity, DB naming)                  |
| 03  | `spec/03-error-manage/`            | 3-tier error architecture, `apperror`, response envelope                         |
| 04  | `spec/04-database-conventions/`    | PascalCase singular tables, `{Table}Id` PK/FK, INTEGER PK                        |
| 07  | `spec/07-design-system/`           | Semantic tokens, HSL/oklch, no hardcoded values                                  |
| 17  | `spec/17-consolidated-guidelines/` | AI-optimized summaries; `00-strictly-avoid-quickref.md` = canonical prohibitions |

## On-demand — read only when the task matches

| #   | Folder                             | Read when                     |
| --- | ---------------------------------- | ----------------------------- |
| 01  | `01-spec-authoring-guide/`         | Adding/editing spec docs      |
| 05  | `05-split-db-architecture/`        | Multi-DB SQLite partitioning  |
| 06  | `06-seedable-config-architecture/` | Config seeding, feature flags |
| 08  | `08-docs-viewer-ui/`               | Docs viewer React app         |
| 09  | `09-code-block-system/`            | Code-block rendering          |
| 10  | `10-research/`                     | Comparative studies           |
| 11  | `11-powershell-integration/`       | PowerShell automation         |
| 12  | `12-cicd-pipeline-workflows/`      | CI/CD, deployment             |
| 13  | `13-generic-cli/`                  | Generic CLI patterns          |
| 14  | `14-update/`                       | Self-update / release         |
| 16  | `16-generic-release/`              | Release pipeline              |
| 21  | `21-app/`                          | App-specific features         |
| 22  | `22-app-issues/`                   | Bug RCAs                      |
| 23  | `23-app-db/`                       | App data model                |
| 24  | `24-app-ui-design-system/`         | App UI tokens                 |

## `.lovable/` inventory (Step 1)

- 69 files total (manifest: `/tmp/lovable-manifest.txt`).
- Categories: `coding-guidelines/`, `spec/commands/`, `plans/{pending,done,subtasks}/`, `memory/`, `prompts/` (34 files), `prompt.md` registry.
- Missing (referenced by onboarding prompt but not on disk): `.lovable/strictly-avoid.md`, `.lovable/plan.md`, `.lovable/overview.md`.
  - Substitutes: `spec/17-consolidated-guidelines/00-strictly-avoid-quickref.md`, `.lovable/plans/pending/*`, `readme.md`.
