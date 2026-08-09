# processing-cli doctor

Read-only preflight. Verifies each DB tier (`root`, `task`, `rules`)
matches its on-disk migration set (`bin/db-bootstrap.py`). Reports
per-tier drift via envelope `Results` and raises
`E_CLI_PREFLIGHT_FAILED` when any tier is unhealthy.

Bundle-schema / IPC-dir writability probes land with Step 68
(`processing-cli` acceptance #8). This substrate release ships DB
preflight parity with `worker-cli doctor` so PowerShell wrappers
(Steps 111+) can gate on a single exit-code convention.
