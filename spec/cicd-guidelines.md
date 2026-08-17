# CI/CD & Automation Guidelines Checklist

This document serves as a strict checklist and specification for setting up and fixing CI/CD pipelines, as well as the standard run scripts (`run.ps1`/`run.sh`), for this repository. Any AI agent operating on DevOps or CI/CD tasks MUST read and follow these guidelines.

## 1. Specification Files to Create / Maintain

All CI/CD definitions and requirements must be documented in the `spec` folder before making changes to `.github/workflows` or other CI systems.

- [ ] `spec/20-devops/01-cicd-standards.md`
  - Defines the core CI/CD principles: mandatory formatters (`prettier`, `eslint`), test runners (`vitest`, `pytest`), and failure conditions.
- [ ] `spec/20-devops/02-run-script-architecture.md`
  - Defines how local orchestration scripts (like `run.ps1`) map identical commands to the CI environment so that local builds perfectly match CI builds.
- [ ] `.lovable/spec/tasks/10-cicd-pipeline-setup.md`
  - A concrete task spec defining exactly what the GitHub Actions workflows must accomplish (e.g., parallel matrix jobs for FE and BE, caching `bun` and `uv` dependencies).
- [ ] `.lovable/cicd-issues/XX-<issue-name>.md`
  - Any time a CI/CD pipeline fails, an AI must log the failure here before attempting a fix.

## 2. CI/CD Implementation Checklist

When building or fixing the CI/CD pipelines (e.g., `.github/workflows/ci.yml`), enforce the following steps:

- [ ] **Dependency Caching:** The pipeline MUST cache `~/.bun/install/cache` for Frontend and `.venv` or `~/.cache/uv` for Backend to reduce build times.
- [ ] **Toolchain Matching:** Ensure the CI runner uses the exact versions specified in `run.config.json` and `bun.lock`.
- [ ] **Linting & Formatting:** Run `bunx eslint` and `bun run lint` before any tests. The pipeline must fail immediately if there are style violations.
- [ ] **Type Checking:** Run `npx tsc --noEmit` and `uv run pyright` (or `mypy`) as separate parallel jobs.
- [ ] **Test Execution:**
  - Frontend: Execute `bunx vitest run`
  - Backend: Execute `uv run pytest`
- [ ] **Artifact Generation:** (Optional) If it is a release branch, the pipeline should zip the application (using rules from `run.ps1`) and attach it as a GitHub release artifact.

---

## 3. Dynamic Script Architecture (`run.ps1` & `run.config.json`)

Currently, `run.ps1` contains hardcoded ports (`5173`, `8787`) and explicit command arrays (`uv run`, `bun run dev`). The architecture MUST be upgraded so that **the JSON configuration dictates the script behavior.**

### Expected `run.config.json` Structure
The JSON file should be the single source of truth for both local development and CI execution.

```json
{
  "projectName": "Control Automation",
  "feDir": ".",
  "beDir": "BE",
  "fePort": 5173,
  "bePort": 8787,
  "host": "127.0.0.1",
  "pythonVenv": ".venv",
  "commands": {
    "feInstall": "bun install",
    "feDev": "bun run dev --port {fePort}",
    "feBuild": "bun run build",
    "feTest": "bunx vitest run",
    "feTypecheck": "bunx tsc --noEmit",
    "beInstall": "uv sync",
    "beDev": "uv run uvicorn BE.main:app --host {host} --port {bePort}",
    "beTest": "uv run pytest"
  },
  "shell": {
    "enabled": true,
    "paths": [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    ]
  }
}
```

### Expected `run.ps1` Implementation Rules

When modifying `run.ps1`, any AI must adhere to the following logic:

1. **Parse Configuration First:**
   ```powershell
   $config = Get-Content -Raw -Path "run.config.json" | ConvertFrom-Json
   $bePort = $config.bePort
   $fePort = $config.fePort
   ```
2. **Dynamic Command Injection:**
   Never hardcode `"bun run dev"`. Instead, read `$config.commands.feDev` and substitute placeholders dynamically.
   ```powershell
   $feCmd = $config.commands.feDev.Replace("{fePort}", $fePort.ToString())
   ```
3. **Graceful Error Handling & Waiting:**
   Use the existing `Wait-For-Http` logic to ensure dependencies (like the backend) are fully online before the frontend starts, parsing the health endpoint `http://localhost:$bePort/healthz` from the config.
4. **CI Mode Toggle:**
   The script must accept a `-CI` flag. If `-CI` is passed:
   - Do NOT launch the Chromium shell.
   - Run `$config.commands.feBuild` instead of `feDev`.
   - Run `$config.commands.feTest` and `$config.commands.beTest`.
   - Exit with code `1` if any step fails.
5. **Process Cleanup (Trap/Finally):**
   Ensure all spawned processes (Node, UV/Python) are captured in a job array and aggressively killed in the `finally {}` block. There should be no zombie processes left blocking ports.
