"""Package marker for the `BE.cli` namespace.

Hosts `worker-cli` and `processing-cli` entry points plus their shared
`common/` substrate (config loader, paths, logger, IPC). Kept empty per
`spec/02-coding-guidelines/00-overview.md` (package-marker `__init__`
only, no re-exports, no side effects).

See:
- spec/21-app/74-worker-cli.md
- spec/21-app/75-processing-cli.md
- spec/21-app/76-cli-log-and-ipc.md
- .lovable/memory/26-split-db-cli-cheatsheet.md
"""
