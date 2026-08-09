# Pipeline & Research Specs — On-Demand Digest

Read the folder only when the task touches it. All entries are `spec/<n>-<folder>/`.

| #   | Folder                             | One-line summary                                                            | Trigger to read                         |
| --- | ---------------------------------- | --------------------------------------------------------------------------- | --------------------------------------- |
| 05  | `05-split-db-architecture/`        | Multi-SQLite partitioning (one DB per bounded context) + migration patterns | New DB file / cross-context read        |
| 06  | `06-seedable-config-architecture/` | Seedable config ("CW Config"), feature flags, environment layering          | Adding a config key or flag             |
| 08  | `08-docs-viewer-ui/`               | Docs viewer React app (separate project)                                    | Editing the viewer, not this app        |
| 09  | `09-code-block-system/`            | Rich code-block rendering (syntax highlight, copy, focus)                   | Building code display UI                |
| 10  | `10-research/`                     | Comparative studies, tech evaluations                                       | Historical reference only               |
| 11  | `11-powershell-integration/`       | PowerShell scripting conventions, cross-platform automation                 | Writing `.ps1`                          |
| 12  | `12-cicd-pipeline-workflows/`      | CI/CD workflows, deployment automation                                      | Editing `.github/workflows/` or release |
| 13  | `13-generic-cli/`                  | Generic CLI patterns (flags, subcommands, exit codes)                       | Adding a CLI                            |
| 14  | `14-update/`                       | Rename-first deployment, self-update, cross-compile                         | Release/update pipeline                 |
| 16  | `16-generic-release/`              | Release pipeline templates                                                  | Cutting a release                       |
| 21  | `21-app/`                          | App-specific features/workflows/architecture                                | This app's product logic                |
| 22  | `22-app-issues/`                   | Bug RCAs and fix log                                                        | Historical bug lookup                   |
| 23  | `23-app-db/`                       | App data model, table designs, migrations                                   | Adding tables to the app                |
| 24  | `24-app-ui-design-system/`         | App-specific UI tokens & components                                         | UI work on this app                     |

Consolidated summaries (recommended first stop): `spec/17-consolidated-guidelines/` mirrors each folder as a single AI-optimized file (e.g. `05-split-db-architecture.md`, `06-seedable-config.md`, `15-cicd-pipeline-workflows.md`).
