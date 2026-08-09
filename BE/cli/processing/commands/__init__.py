"""Plan 90 Step 58 - processing-cli subcommand package.

Each module registers exactly one subcommand via `configure(parser)` and
`handle(ns, ctx) -> dict | list`, matching the Worker CLI convention in
`BE/cli/worker/subcommands/`. Kept flat: no nested groups until spec/21-app/75
grows a "processing-cli rules ..." tree (Step 67+).
"""
