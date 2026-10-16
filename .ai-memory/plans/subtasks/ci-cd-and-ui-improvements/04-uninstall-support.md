# Subtask 04: Uninstall Support

**Owner:** lead (me)

## Goal

The installer had no uninstall path (spec gap vs 02-spec/21-app/77-cli-powershell-and-release.md). Added:

- packaging/desktop/uninstall.ps1 — removes %LOCALAPPDATA%\CAT-iVISION, Start Menu + desktop shortcuts, kills running processes; notes Start-tile unpin caveat.
- packaging/desktop/uninstall.sh — removes install dir, .desktop entry, desktop copy; refreshes desktop database.
- install.ps1 -Uninstall switch — same logic inline for a single-entry-point uninstall.
- .github/workflows/release.yml — copies uninstall.ps1/uninstall.sh to the release page; pwsh ParseFile + bash -n validation gates for both.

Verified: bash -n passes on both .sh files; release.yml parses as valid YAML. pwsh validation runs in CI (no pwsh on this VM).

## Status

COMPLETE — awaiting commit (batched with subtasks 05–06).
