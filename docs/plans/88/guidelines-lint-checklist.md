# Guidelines → Linter/Rule Mapping Checklist

Version pin: v3.992.0. One row per guideline family; each maps to the enforcing tool, the rule/script, and the config location.

| #   | Guideline area                                                        | Enforced by                             | Rule / script                                                     | Config location                                                                          | CI gate                                                          |
| --- | --------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | Formatting (indent, quotes, trailing commas, line width)              | Prettier                                | `prettier --check .`                                              | `.prettierrc`, `.prettierignore`                                                         | `package.json` script `format:check`; `.github/workflows/ci.yml` |
| 2   | TypeScript strictness (no implicit any, strict null, no unused)       | tsgo + tsc                              | `tsgo --noEmit` then `tsc --noEmit`                               | `tsconfig.json` (`"strict": true`)                                                       | script `typecheck:strict`; `ci.yml`                              |
| 3   | Lint rules (unused vars, hooks deps, import order, a11y)              | ESLint flat config                      | `eslint . --max-warnings=0`                                       | `eslint.config.js`                                                                       | script `lint`; `ci.yml`                                          |
| 4   | No magic strings / hard-coded IDs, URLs, error codes                  | Custom shell script                     | `scripts/check-magic-strings.sh --strict`                         | `scripts/check-magic-strings.sh`                                                         | script `lint:magic` (chained in `lint`); `ci.yml`                |
| 5   | Version consistency (package.json ↔ CHANGELOG ↔ README)               | Custom node script                      | `scripts/check-version-sync.mjs`                                  | `scripts/`                                                                               | `ci.yml` (release gate)                                          |
| 6   | Stale version references in docs                                      | Custom node script                      | `scripts/update-stale-version-refs.mjs`                           | `scripts/`                                                                               | run pre-release                                                  |
| 7   | Prompt aggregation for `.lovable/prompts/` canonical mirrors          | Custom node script                      | `scripts/aggregate-prompts.mjs`                                   | `scripts/`                                                                               | manual + `ci.yml` check                                          |
| 8   | Visual regression (Rules panel gutter, Properties clipping)           | Playwright                              | `bunx playwright test`                                            | `playwright.config.ts`, `tests/visual/**`                                                | script `visual:test`; `ci.yml` optional job                      |
| 9   | Route architecture (no `src/pages/`, layout `<Outlet/>`, integer IDs) | ESLint custom rule + magic-strings grep | `no-restricted-imports`, path pattern in `check-magic-strings.sh` | `eslint.config.js`, script                                                               | `ci.yml`                                                         |
| 10  | Design tokens only (no `text-white`, `bg-[#hex]` in components)       | ESLint `no-restricted-syntax`           | Tailwind class allow-list                                         | `eslint.config.js`                                                                       | `ci.yml`                                                         |
| 11  | Server/client boundary (`*.server.ts`, no `process.env` client)       | tsgo + ESLint `no-restricted-imports`   | Import-protection rules                                           | `eslint.config.js`, `tsconfig.json` paths                                                | `ci.yml`                                                         |
| 12  | Universal Response Envelope + `AppError` shape (backend v1)           | tsgo (types) + unit tests               | `src/lib/facades/**` type guards                                  | `spec/21-app/backend-implementation-request-v1.md` (contract), tests under `tests/unit/` | `ci.yml`                                                         |
| 13  | Aggregate guideline gate (formatting + types + lint + magic)          | Composite script                        | `bun run guidelines:check`                                        | `package.json`                                                                           | `ci.yml` main job                                                |

## Quick verification

```bash
bun run guidelines:check   # 1, 2, 3, 4
bun run visual:test        # 8
bash scripts/check-version-sync.mjs  # 5
```

## Gaps to close

- Row 10: allow-list rule for Tailwind hardcoded colors is not yet wired; today only convention enforced by review.
- Row 12: envelope/AppError runtime shape has no dedicated test file yet; add under `tests/unit/facades/`.
- Row 6, 7: not yet invoked from `ci.yml`; currently manual.
