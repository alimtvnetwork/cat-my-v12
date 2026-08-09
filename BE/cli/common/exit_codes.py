"""Canonical CLI process exit codes.

Source of truth: `spec/21-app/74-worker-cli.md` §Acceptance criteria #6
(also binding on `processing-cli` per `spec/21-app/75-processing-cli.md`).

The generic CLI spec (`spec/13-generic-cli/03-dispatch.md`) uses 0/1 for
success/failure; the app-specific spec 74 overrides with the richer
0/2/3/4/5 scheme. See `.lovable/memory/26-split-db-cli-cheatsheet.md`
§11 for the resolution.

Ranges reserved elsewhere:
- 9500-9599: PowerShell wrapper self-errors
  (`spec/11-powershell-integration/04-error-codes.md` + memory §12).
  Child-process codes below are always preserved by wrappers via
  `$LASTEXITCODE`.

Do NOT add codes without a spec entry. Do NOT reuse a value. Do NOT
switch to a plain `Enum`: dispatchers pass the value to `sys.exit(...)`
and rely on the integer identity.
"""

from __future__ import annotations

from enum import IntEnum


class ExitCode(IntEnum):
    """Process exit code contract for every CLI in this repo.

    Bound to `spec/21-app/74-worker-cli.md` §Acceptance #6. Any change
    here requires a spec bump AND a coordinated PowerShell wrapper
    update (memory §12).
    """

    Ok = 0
    """Successful invocation. Universal Envelope on stdout has
    `Status.IsSuccess == True`."""

    Usage = 2
    """Argument parsing / unknown subcommand / bad flag combo. Emitted
    by the dispatcher before the handler runs. Human message goes to
    stderr; stdout stays empty so `ConvertFrom-Json` in PowerShell
    wrappers does not choke on a non-envelope payload."""

    DomainError = 3
    """Handler ran, produced a Universal Envelope with `IsFailed`, and
    the failure is a domain-level `AppError` (validation, not-found,
    conflict, rule violation). Envelope is on stdout."""

    IoError = 4
    """Filesystem / DB / IPC failure: log root unwritable, DB migration
    missing, IPC directory unreachable, checksum mismatch on an input
    artifact. Maps to `E_LOG_ROOT_UNWRITABLE`, `E_IPC_WRITE_FAILED`,
    `E_CLI_CHECKSUM_MISMATCH`, and the `E_BE_*` IO family."""

    VendorError = 5
    """SDK / vendor adapter failure: Daheng Galaxy SDK unavailable,
    device offline mid-stream, unsupported host. Maps to the
    `E_CAM_*` family and `E_CLI_UNSUPPORTED_HOST`."""


__all__ = ["ExitCode"]
