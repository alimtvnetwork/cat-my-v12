# Command 24: CI/CD must run lint, typecheck, unit, e2e on every plan step

Captured: 2026-07-17 (voice)

## Verbatim

"Make sure the CI/CD follows the proper integration of the coding checking, script checking, scripts linter, linter scripts. All should be connected with the CI/CD so that there is no broken stuff."

## Scope

Applies to every plan step that touches source, docs, or config.

## Rule

1. Every plan step ends with the sandbox running (in this order): `bunx tsgo --noEmit`, project lint (e.g. `bun run lint`), unit tests (`bunx vitest run` for touched files), and the relevant Playwright suite when UI or route changed. A step is not "done" until each of those exits zero.
2. The repo must expose one CI entrypoint (`bun run ci` or the CI workflow file) that chains: install, typecheck, lint, unit, e2e. Any new script goes into that entrypoint the same commit it is introduced.
3. Any lint/format/typecheck script referenced in `.lovable/memory/05*` must be wired to the CI entrypoint. If a linter is added later, add it to the entrypoint the same commit.
4. The AI writes "CI: green (typecheck / lint / unit / e2e)" in the step's completion note. Missing evidence means the step reopens.
5. On a red pipeline the AI stops implementation, reports the failing stage verbatim, and either fixes the regression in the same turn or files an issue under `.lovable/issues/`.

## When to apply

Every coding turn, every plan step move from pending to done.
