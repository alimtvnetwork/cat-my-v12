---
Slug: cli-error-inspection-and-bug-export
Status: pending
Created: 2026-10-31
Parent: 04-vision-system-and-error-management-instructions
Owner: Worker 02
---

# Subtask 06: Error Inspection CLI & Standalone Bug Export Engine

## 1. Overview & Objective

Provide a rich command-line diagnostic tool (`error-cli`) and matching PowerShell automation wrapper (`scripts/ps/Invoke-ErrorCli.ps1`) for querying, inspecting, and resolving persisted runtime errors from `error.db`. Implement an offline, self-contained Bug Exporter engine that bundles UI recorder sessions, screenshot frames, logs, environment metadata, and an AI-optimized Root Cause Analysis report (`AI_BUG_REPORT.md`) into a standalone ZIP package for automated agent remediation.

Owning Specifications:
- `02-spec/21-app/04-vision-system-and-error-management-instructions/02-error-management-and-splitdb-spec.md` §6
- `02-spec/21-app/76-cli-log-and-ipc.md` (CLI conventions, streaming JSON output)
- `02-spec/11-powershell-integration/03-integration-guide.md` (PowerShell wrapper standards)

---

## 2. Target File Boundaries & Deliverables

### Deliverables Catalog:
1. `BE/cli/error/__init__.py` - Package initialization.
2. `BE/cli/error/main.py` - CLI entrypoint, argument parsing, command dispatching.
3. `BE/cli/error/formatters.py` - Terminal tabular rendering and NDJSON / JSON streaming output.
4. `BE/app/domain/bug_exporter.py` - Standalone bug archive generator producing zipped bundles.
5. `scripts/ps/Invoke-ErrorCli.ps1` - Standardized PowerShell wrapper with `-WhatIf` and exit code propagation.
6. `BE/pyproject.toml` - Register `error-cli = "BE.cli.error.main:main"` in `[project.scripts]`.
7. `BE/tests/cli/test_error_cli.py` - CLI integration tests.
8. `BE/tests/domain/test_bug_exporter.py` - Export archive integrity tests.

---

## 3. Detailed Technical Contracts

### 3.1 CLI Command Specification: `BE/cli/error/main.py`

#### Commands & Arguments:
```bash
# 1. List errors
error-cli list [--limit N] [--subsystem S] [--severity V] [--unresolved] [--json]

# 2. View error details
error-cli view <ErrorId> [--json]

# 3. Mark error as resolved
error-cli resolve <ErrorId>

# 4. List recorded bug sessions
error-cli bugs list [--status S] [--limit N] [--json]

# 5. View bug session details
error-cli bugs view <BugId> [--json]

# 6. Export standalone bug report ZIP
error-cli bugs export <BugId> --out <dest_directory_or_file>
```

#### Exit Codes (per 02-spec/21-app/74-worker-cli.md standard):
- `0`: Success.
- `2`: Invalid argument / schema validation error.
- `3`: Record not found (e.g. unknown `ErrorId` or `BugId`).
- `4`: Internal database or filesystem operational fault.

### 3.2 Bug Exporter Specification: `BE/app/domain/bug_exporter.py`

```python
from __future__ import annotations

import io
import json
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from BE.app.db.writers.error_writer import query_error_events
from BE.db.connections import get_error_conn
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

@dataclass(frozen=True)
class ExportOutcome:
    isSuccess: bool
    zipPath: str
    fileCount: int
    totalBytes: int

def export_bug_package(
    *,
    bug_id: str,
    output_dir: Path | str,
    conn=None,
) -> ExportOutcome:
    """Generate a self-contained bug archive ZIP for AI and developer remediation."""
    target_conn = conn or get_error_conn()
    cur = target_conn.execute(
        "SELECT BugId, Title, Description, SessionJson, ScreenshotsJson, "
        "LogExcerptJson, EnvironmentJson, CreatedAt FROM RecordedBug WHERE BugId = ?",
        (bug_id,),
    )
    row = cur.fetchone()
    if row is None:
        raise AppError(ErrorCode.E_BE_NOT_FOUND, f"RecordedBug '{bug_id}' not found")

    # Extract fields
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    zip_path = out_dir / f"{bug_id}_report.zip"

    # Assemble ZIP structure:
    # - AI_BUG_REPORT.md
    # - README.md
    # - session.json
    # - environment.json
    # - screenshots/ (extracted from base64 or referenced files)
    ...
```

#### Contract for `AI_BUG_REPORT.md`:
Generated inside the ZIP bundle with structured markdown:
```markdown
# AI Diagnostic Bug Report: {bug_id}
## 1. Executive Summary
- **Title**: {title}
- **Recorded At**: {timestamp}
- **Environment**: {os}, {viewport}, {app_version}

## 2. Interaction Sequence
{numbered_list_of_user_actions}

## 3. Impacted Stack Trace
```text
{stack_trace}
```

## 4. Affected Files & Line Anchors
- `{file_path}`

## 5. Remediation Directive for Subagents
{actionable_remediation_steps}
```

### 3.3 PowerShell Wrapper Contract: `scripts/ps/Invoke-ErrorCli.ps1`
Follow the exact conventions of `scripts/ps/Invoke-WorkerCli.ps1`:
- Support `[CmdletBinding(SupportsShouldProcess = $true)]`.
- Resolve Python executable using `Common.psm1` `Resolve-PythonExe -CliName error-cli`.
- When `$PSCmdlet.ShouldProcess("error-cli $args")` returns false (under `-WhatIf`), log and exit 0.
- Forward arguments `$args` verbatim.
- Forward exit code `$LASTEXITCODE`.

---

## 4. Step-by-Step Implementation Sequence

1. **Step 1**: Register `error-cli = "BE.cli.error.main:main"` in `BE/pyproject.toml`.
2. **Step 2**: Implement `BE/app/domain/bug_exporter.py` with ZIP packaging and `AI_BUG_REPORT.md` generation.
3. **Step 3**: Implement `BE/cli/error/main.py` and `BE/cli/error/formatters.py` with table and JSON formatters.
4. **Step 4**: Author PowerShell wrapper `scripts/ps/Invoke-ErrorCli.ps1`.
5. **Step 5**: Write CLI tests in `BE/tests/cli/test_error_cli.py`.
6. **Step 6**: Write exporter unit tests in `BE/tests/domain/test_bug_exporter.py`.
7. **Step 7**: Verify execution: `python -m BE.cli.error.main --help` and `scripts/ps/Invoke-ErrorCli.ps1 --help`.

---

## 5. Verification Contracts & Quality Gates

1. **CLI Execution Gate**:
   - `error-cli list --json` exits with code 0 and outputs valid JSON.
   - `error-cli view non_existent_id` exits with code 3 (not found).
2. **ZIP Bundle Verification**:
   - Extracted archive contains `AI_BUG_REPORT.md`, `README.md`, `session.json`, and `environment.json`.
   - `zipfile.is_zipfile(zip_path)` returns True.
3. **PowerShell Wrapper Invariant**:
   - `.\scripts\ps\Invoke-ErrorCli.ps1 -WhatIf list` executes safely, prints execution plan, and returns exit code 0.
