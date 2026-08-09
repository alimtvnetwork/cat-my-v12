# sample-powershell (reference only)

These two files come from a different project ("WP Plugin Publish") and are kept
verbatim as a style reference for our own launcher:

- `run.ps1` - sample build/run script (flag layout, help formatting, config loading, self-lint).
- `powershell.json` - sample config shape.

They are **not** executed, imported, or dot-sourced by anything in this repo.
The real launcher is `/run.ps1` at the repo root, configured by `/run.config.json`.
See `docs/launcher/README.md`.
