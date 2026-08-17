# Generic CI/CD & Automation Guidelines Checklist

This document serves as a strict, universal checklist and specification for setting up and fixing CI/CD pipelines, as well as the standard run scripts (e.g., `run.ps1`/`run.sh`), for **any project**. Any AI agent operating on DevOps or CI/CD tasks MUST read and follow these guidelines to ensure consistency across different tech stacks and repositories.

## 1. Specification Files to Read & Maintain

Before making any changes to `.github/workflows` or automation scripts, you **must read** the following architecture documents. These contain the foundational constraints and mechanisms for deployment, automation, and CI/CD pipelines.

### PowerShell & Orchestration (`spec/11-powershell-integration`)
- [ ] `spec/11-powershell-integration/00-overview.md`
- [ ] `spec/11-powershell-integration/02-script-reference.md`
- [ ] `spec/11-powershell-integration/03-integration-guide.md`

### CI/CD Pipeline Workflows (`spec/12-cicd-pipeline-workflows`)
- [ ] `spec/12-cicd-pipeline-workflows/00-overview.md`
- [ ] `spec/12-cicd-pipeline-workflows/01-ci-pipeline.md`
- [ ] `spec/12-cicd-pipeline-workflows/02-release-pipeline.md`
- [ ] `spec/12-cicd-pipeline-workflows/04-install-script-generation.md`
- [ ] `spec/12-cicd-pipeline-workflows/05-changelog-integration.md`

### CLI & Build (`spec/13-generic-cli`)
- [ ] `spec/13-generic-cli/00-overview.md`
- [ ] `spec/13-generic-cli/11-build-deploy.md`
- [ ] `spec/13-generic-cli/18-batch-execution.md`

### Update Mechanisms (`spec/14-update`)
- [ ] `spec/14-update/04-build-scripts.md`
- [ ] `spec/14-update/17-release-pipeline.md`
- [ ] `spec/14-update/18-install-scripts.md`

### Release Engineering (`spec/16-generic-release`)
- [ ] `spec/16-generic-release/00-overview.md`
- [ ] `spec/16-generic-release/02-release-pipeline.md`
- [ ] `spec/16-generic-release/03-install-scripts.md`

### Context / Issue Logging
- [ ] `cicd-issues/<issue-name>.md`
  - Any time a CI/CD pipeline fails, an AI must log the failure here (including error traces and environment context) before attempting a fix.

---

## 2. CI/CD Implementation Checklist

When building or fixing the CI/CD pipelines (e.g., `.github/workflows/ci.yml`), enforce the following steps universally:

- [ ] **Dependency Caching:** The pipeline MUST cache dependencies based on the project's lockfiles (e.g., `package-lock.json`, `bun.lockb`, `poetry.lock`, `go.sum`). This minimizes build times.
- [ ] **Toolchain Matching:** Ensure the CI runner uses the exact tool versions specified in the project's configuration (e.g., `.nvmrc`, `.python-version`, or the generic `run.config.json`).
- [ ] **Linting & Formatting:** Run the project's defined linting and formatting commands first. The pipeline must fail immediately if there are style violations, preventing bad code from proceeding to tests.
- [ ] **Type Checking / Static Analysis:** If the language supports it (e.g., TypeScript, Python with mypy, Go), run static analysis as a parallel job before or alongside testing.
- [ ] **Test Execution:** Execute the project's testing suites (unit, integration, e2e) as defined in the configuration file.
- [ ] **Artifact Generation:** (Optional) If it is a release branch, the pipeline should compile/zip the application using rules defined in the run script and attach it as a release artifact.

---

## 3. Dynamic Script Architecture (e.g., `run.ps1` & `run.config.json`)

To prevent hardcoded commands and ports, the execution architecture MUST be dynamic. The local run script (e.g., `run.ps1` or `run.sh`) must act as a generic orchestrator, while a **JSON configuration file** serves as the single source of truth for both local development and CI execution.

### Expected Configuration Structure (Reference: `run.config.json`)
The JSON file should define all services, ports, and lifecycle commands.

```json
{
  "projectName": "Generic Project Name",
  "frontend": {
    "dir": "path/to/frontend",
    "port": 3000
  },
  "backend": {
    "dir": "path/to/backend",
    "port": 8080
  },
  "host": "127.0.0.1",
  "commands": {
    "install": "package-manager install",
    "dev:frontend": "command to start frontend dev server --port {fePort}",
    "dev:backend": "command to start backend server --port {bePort}",
    "build:frontend": "command to build frontend",
    "test:frontend": "command to run frontend tests",
    "test:backend": "command to run backend tests",
    "lint": "command to run linter"
  }
}
```

### Expected Run Script Implementation Rules (Reference: `run.ps1` / `run.sh`)

When writing or modifying the orchestration scripts, any AI must adhere to the following logic:

1. **Parse Configuration First:**
   The script must read the configuration file (e.g., `run.config.json`) into memory and extract variables (ports, directories, commands).
2. **Dynamic Command Injection:**
   Never hardcode commands (e.g., `npm run dev`). Instead, read the command string from the JSON and dynamically substitute any necessary placeholders (like `{fePort}`).
3. **Graceful Error Handling & Waiting:**
   When orchestrating multiple services, the script must wait for dependencies to become healthy before proceeding. Use generic HTTP or TCP polling mechanisms to ensure a backend is fully online before a frontend attempts to connect to it.
4. **CI Mode Toggle:**
   The script must accept a `-CI` (or `--ci`) flag. When running in CI mode:
   - Skip launching local browsers or interactive shells.
   - Run the build, lint, and test commands from the JSON instead of the dev server commands.
   - Exit with code `1` immediately if any step fails.
5. **Process Cleanup (Trap/Finally):**
   Ensure all spawned processes are captured in a job/PID array. The script must aggressively kill these processes in the `finally {}` or `trap` block on exit. There should be no zombie processes left blocking ports.
