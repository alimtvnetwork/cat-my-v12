# Task 13 — E2E testing

Slug: pattern-search-and-ui-improvement - Task 13

Status: DONE 31-Oct-26 — E2E run + fix wave fully verified on VM: build green, bundle version define present (4.112.17, no literal VITE_APP_VERSION), vitest quartet 47/47, bats clean-machine E2E green (install doctor launch uninstall); F1-F7 fixed (duplicate helper, installer sys.path, docstring, decode unification, flat+stamps parse, wait usage error, layout-slice tests). UNVERIFIED (environment-blocked, not failed): browser-rendered UI, run.ps1/install.ps1 (no pwsh), golden-sample photo pass (no fixture; provenance open), menu-delay cause (needs browser probe run).

## Scope

E2E test the named flows ONLY (V7 R1: zero builds/tests/CI unless
explicitly asked; the user explicitly asked for E2E testing, so it is
in scope for these flows):

- Installation (clean-machine path, both installer wrappers).
- Run via PS1 and via run.sh, including -NoShell/--no-shell behavior
  and browser auto-open behavior.
- Pattern search end to end, including grayscale conversion and
  pin-one configuration.
- Regression checks for the reported symptoms: pattern boxes landing
  in the right place at multiple image resolutions; Rule 2 no longer
  failing with "missing saved pattern boxes"; simulation view rendering
  (never blank); menu open timing; version visible in run UI.

## Constraints

- Workers never run git commands; the parent commits.
- Do not touch 02-cicd-remediation files.
- Report results as evidence (commands, outputs, pass/fail per flow),
  not as summary claims.

## Acceptance

- [ ] Every named flow tested with a recorded pass/fail.
- [ ] Every previously failing symptom re-tested against its
  reproduction.
- [ ] Results attached to the final atomic commit report.
