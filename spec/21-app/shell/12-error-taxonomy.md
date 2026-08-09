# Error taxonomy (shell scope)

Status: Draft (Plan 28)
Registry: all codes here MUST also appear in `spec/21-app/40-error-manage.md`.

## Severity levels

- `I_*` — informational, expected success or state transition.
- `W_*` — warning, non-blocking anomaly.
- `E_*` — error, request or operation failed.

## Boot / lifecycle

| Code                            | Severity | When                                         | Actor       | Remediation                            |
| ------------------------------- | -------- | -------------------------------------------- | ----------- | -------------------------------------- |
| `I_SHELL_FIRST_RUN`             | info     | fresh install detected                       | system      | none                                   |
| `I_SHELL_READY`                 | info     | `/healthz` returns 200 during boot           | system      | none                                   |
| `I_SHELL_UPGRADED`              | info     | migrations applied, new version live         | system      | none                                   |
| `I_SHELL_SHUTDOWN`              | info     | clean exit                                   | user/system | none                                   |
| `E_SHELL_BOOT_FAILED`           | error    | migrations, worker spawn, or `/healthz` fail | system      | check `<log-dir>/shell.log`; reinstall |
| `E_SHELL_PREVIOUS_UNCLEAN_EXIT` | warn     | last shutdown non-zero                       | system      | informational                          |
| `E_SHELL_WORKER_CRASH`          | error    | supervisor detected crash                    | system      | auto-respawn; escalate after 3         |

## IPC

| Code                           | Severity | When                       |
| ------------------------------ | -------- | -------------------------- |
| `E_SHELL_IPC_UNAUTHORIZED`     | error    | bad or missing bearer      |
| `E_SHELL_IPC_VERSION_MISMATCH` | error    | major IPC version drift    |
| `E_SHELL_IPC_CLOCK_SKEW`       | warn     | client `ts` off by > 5 min |
| `E_SHELL_IPC_TIMEOUT`          | error    | 5 s (or long-op) exceeded  |
| `E_SHELL_IPC_BACKPRESSURE`     | error    | per-method queue full      |

## Update

| Code                             | Severity | When                                    |
| -------------------------------- | -------- | --------------------------------------- |
| `I_SHELL_UPDATE_AVAILABLE`       | info     | new manifest found                      |
| `I_SHELL_UPDATE_SKIPPED_OFFLINE` | info     | no network at poll                      |
| `E_SHELL_UPDATE_UNSIGNED`        | error    | signature verification failed           |
| `E_SHELL_UPDATE_FAILED`          | error    | apply or migrations failed; rolled back |

## Permissions (see `07-permissions-and-consent.md`)

| Code                       | Severity |
| -------------------------- | -------- |
| `I_SEC_PERMISSION_GRANTED` | info     |
| `I_SEC_PERMISSION_DENIED`  | info     |
| `I_SEC_PERMISSION_REVOKED` | info     |
| `E_SEC_PERMISSION_MISSING` | error    |

## Reporting rules

- Every `E_*` MUST include `cid`, `actor`, `context`, and `remediation`.
- Every `I_*` MUST include `cid` when triggered by a request.
- No error is swallowed. If a callee returns without logging, the caller MUST
  log a `W_SHELL_SILENT_CALLEE_<name>` and treat as a bug.
