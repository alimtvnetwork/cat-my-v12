"""Plan 90 Step 53 - packaged help text for worker-cli subcommands.

Loaded at runtime via `importlib.resources` from
`BE.cli.common.helptext.intercept`. Every registered subcommand in
`BE.cli.worker.main.build_dispatcher` MUST have a matching `<name>.md`
file in this package; the interceptor raises `E_CLI_USAGE` otherwise.
"""
