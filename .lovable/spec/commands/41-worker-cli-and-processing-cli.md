# Command 41: Worker CLI + Processing CLI + PowerShell + CI/CD Release

Captured: 2026-07-21
Source: user chat (verbatim below)

## Verbatim user request

> Hey, design proper worker, uh, as worker CLI and processing CLI and make sure that every one of the logs are captured properly, uh, so that it can be diagnosed. And every log needs to be saved into the file system, so that can be observed from the main app. Make sure both are connected. So first write the spec, design communication schemas so that they could communicate. The database, uh, you should follow the split DB concept and also the CD配置 DB concept, which is inside the spec folder, folder five, folder six, very carefully, and also the database conventions. Okay. And also following the coding guideline. I will give you fifty steps to improve this. Okay? Improve this and do this properly. Do you understand what I'm saying? Can you please help me with this? And also add PowerShell file, run our PowerShell, and also make CI/CD, uh, publishable with, uh, proper, let's say, release page and install command using PowerShell that I could run and download the files and check it in my machine. Make sure that this is done properly, uh, using the PowerShell install script that should go into the release page. Make sure of that. So I will give you fifty steps to implement and do all these things. Do you understand what I'm saying? let's take 100 steps

## Directive expansion

1. Two separate CLI binaries: `worker-cli` (camera capture / device orchestration) and `processing-cli` (rule evaluation / results generation), sitting alongside the existing `BE/` FastAPI service.
2. Both CLIs stream every log line to the filesystem in a location the main app can tail/read, plus stdout/stderr for foreground diagnosis.
3. Design IPC/communication schemas between the two CLIs and between each CLI and the main app (envelope-compatible, per `spec/03-error-manage/`).
4. Databases MUST follow `spec/05-split-db-architecture/` (root DB / task DB / rules DB split) and `spec/06-seedable-config-architecture/` (seedable config layering). No shared monolithic DB.
5. Follow `spec/02-coding-guidelines/**` and `.lovable/coding-guidelines/coding-guidelines.md`. Follow `spec/04-database-conventions/`.
6. PowerShell wrappers to launch each CLI locally.
7. CI/CD publishes to a GitHub release page per `spec/12-cicd-pipeline-workflows/` and `spec/16-generic-release/`.
8. Release includes a PowerShell install script (curl-to-shell equivalent) per `spec/12-cicd-pipeline-workflows/04-install-script-generation.md` and `spec/16-generic-release/03-install-scripts.md`.
9. Plan is exactly 100 steps.

## Authoritative spec references

- `spec/21-app/12-runtime-processes.md`, `14-worker-pattern.md`, `15-capture-pipeline.md`, `16-processing-pipeline.md`, `17-parallelism-guarantees.md`, `40-error-manage.md`, `41-logging.md`, `42-observability.md`
- `spec/05-split-db-architecture/**`, `spec/06-seedable-config-architecture/**`, `spec/04-database-conventions/**`
- `spec/03-error-manage/**` (Universal Envelope, error registry, resolution workflow)
- `spec/11-powershell-integration/**`, `spec/12-cicd-pipeline-workflows/**`, `spec/13-generic-cli/**`, `spec/16-generic-release/**`, `spec/02-coding-guidelines/**`

## Downstream artefacts

- Spec: `spec/21-app/74-worker-cli.md`, `75-processing-cli.md`, `76-cli-log-and-ipc.md`, `77-cli-powershell-and-release.md`
- Plan: `.lovable/plans/pending/90-worker-and-processing-cli.md`
