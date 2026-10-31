# Task 07 — Installation plus PS1 and run shell files

Slug: pattern-search-and-ui-improvement - Task 07

Status: PENDING (spec done, fix not started).

## Spec

Spec file 03 §4 (browser auto-open), §7 (installation).

## Scope

- PS1 and run shell files must work: both scripts read run.config.json
  (or the config is deleted as dead); -NoShell/--no-shell honored; a
  config flag governs default browser behavior.
- Installation: venv bootstrap (installers assume a venv nothing
  creates); APP_BINARIES_DIR handling documented; doctor gates and exit
  codes preserved; nix zip step fails loud, never silently skips.
- Create the missing local-install.ps1/local-install.sh or remove
  references to them.
- Clean-machine end-to-end install test added to the repo.

## File box (disjoint)

Launcher worker: `run.ps1`, `run.sh`, `run.config.json`,
`scripts/dev/wait-for-http.*`. Installer worker:
`packaging/installers/install.ps1`, `packaging/installers/install.sh`,
`bin/install-*.py`, `BE/app/installer_plan.py`,
`packaging/installers/tests/*`. Installer worker must not touch run
files or `BE/app/installer_path.py` (02-cicd-remediation).

## Acceptance

- [ ] run.ps1 and run.sh both work end to end on their platforms.
- [ ] Browser opens exactly per the documented default/flag behavior.
- [ ] Install on a clean machine passes, including the new E2E test.
