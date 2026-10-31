# Task 13 — E2E testing

Slug: pattern-search-and-ui-improvement - Task 13

Status: PENDING (fix waves not started).

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
