# processing-cli version

Emit the `{Name, Version, Commit, BuildDate}` identity envelope for
`processing-cli`. Side-effect free. Never touches the DB, IPC directories,
or the rule bundle.

Reads (env-first, pyproject fallback for `Version`):

- `PROCESSING_CLI_VERSION` overrides `Version` (CI stamps at release build).
- `PROCESSING_CLI_COMMIT` overrides `Commit` (default: `"unknown"`).
- `PROCESSING_CLI_BUILD_DATE` overrides `BuildDate` (default: `"unknown"`).

Anchors: `spec/21-app/75-processing-cli.md` §Subcommands (`version`);
mirrors `spec/21-app/74-worker-cli.md` §"version" contract.
