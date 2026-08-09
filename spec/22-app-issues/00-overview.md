# App Issues

**Purpose:** Bug reports and ambiguity findings for the vision-inspection app. One file per issue.

## Scope

This folder is for **bugs, ambiguities, and defects** discovered during development or use of the app. Each file describes:

- What the bug or ambiguity is
- Where it lives (file/module/spec section)
- Root cause
- Fix or resolution status

## Not in scope

- **Audit / consistency reports** live in [`spec/25-app-audit/`](../25-app-audit/00-overview.md). Do not add `consistency-*.md` files here.
- **Forward-looking feature specs** live in [`spec/21-app/`](../21-app/00-overview.md). v2 vendor and discovery specs were merged into `21-app/6x-*`.
- **Cross-cutting error taxonomy** lives in `spec/21-app/40-error-manage.md`.

## Contents

| File                                  | Purpose                                            |
| ------------------------------------- | -------------------------------------------------- |
| `01-vision-inspection-ambiguities.md` | Ambiguity ledger vs the initial instruction bundle |

## Naming

`NN-short-slug.md` where `NN` is the next free two-digit number. Never use `consistency-*.md` here.

## For AI agents

If you are about to write an audit result, spec-vs-code delta, or version consistency check: **stop, and write it under `spec/25-app-audit/` instead.** This folder is bugs only.
