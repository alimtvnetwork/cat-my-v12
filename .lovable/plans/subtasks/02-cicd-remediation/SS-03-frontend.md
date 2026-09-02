# SS-03: Frontend Lint and Typecheck

## Objective

Address any residual CI-equivalent frontend failures. Local `tsc` and `eslint` passes, so no broad frontend refactoring is planned unless the CI strict mode or magic strings check uncovers a genuine failure.

## Files/Area Involved

- `src/` (TypeScript and TSX files)
- `scripts/check-magic-strings.sh`

## Verification Command

```bash
npm run lint
npx tsc --noEmit
bash scripts/check-magic-strings.sh --strict
```

## Completion Condition

Zero lint errors, zero TS type errors, and zero magic string violations under strict mode. The local modification to `check-magic-strings.sh` (Windows `git grep` fallback) is kept.

## Recovery/Checkpoint Instructions

- **Review Step:** Verify if the magic strings check throws any errors under `--strict`.
- **Commit Boundary:** Commit as `fix(ui): resolve magic strings and strict typecheck warnings` before proceeding to SS-04.
