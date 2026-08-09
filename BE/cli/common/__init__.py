"""Shared substrate for `worker-cli` and `processing-cli`.

Modules that will live here (per plan 90 phases 1-3):
- `exit_codes` (this step): canonical process exit codes.
- `config_loader`, `paths`, `logger`, `log_session`, `log_index`,
  `log_reader`, `log_retention`, `ipc` (later steps).

Package-marker only. No re-exports, no side effects, per
`spec/02-coding-guidelines/00-overview.md`.
"""
