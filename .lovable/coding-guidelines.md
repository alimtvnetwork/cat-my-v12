# Coding Guidelines

> This file contains the root coding guidelines. For language-specific specs, see `spec/02-coding-guidelines/`. If there is a conflict, the folder-level spec wins.

## Languages & Runtime

- **Frontend**: TypeScript, React 19, TanStack Start, Tailwind v4
- **Backend**: Python 3.11+, FastAPI
- **Other**: PowerShell/Bash for scripting

## Formatters & Linters

- **TS/React**: Biome / ESLint (`eslint --max-warnings 0`)
- **Python**: ruff, mypy, pytest
- **CSS**: Tailwind v4 (CSS-first)
- **CI**: GitHub Actions runs all linters and fails on any warning.

## Function Length Limits

- Functions MUST NOT exceed 15 lines of business logic.
- Complex functions must be decomposed. Files have a soft cap of 300 lines (400 if a refactor note is present).

## Error Handling

- Follow the 3-tier error architecture (see `.lovable/memory/03-error-manage.md`).
- Never swallow exceptions. Log or propagate them.
- All backend APIs return a Universal Response Envelope (`Status/Attributes/Results`).
- Frontend connectivity uses HTTP status (2xx) as primary signal, not body fields.

## Logging Conventions

- Use structured logging (zerolog-style).
- Keys should be PascalCase or camelCase depending on the domain context, but consistently applied.
- All queries MUST use a centralized query wrapper (e.g., `safe_execute` in Python, `beFetch` in TS) to automatically log errors and reduce scattered `try/catch` logic.

## Naming Rules

- **Enums**: PascalCase and must end with the `Type` suffix (e.g., `StatusType`). Never use string union types.
- **Booleans**: Must use `is` or `has` prefix (e.g., `isFail`). Never invert success booleans (e.g., avoid `!isSuccess`).
- **Variables/Functions**: camelCase.
- **Classes/Components**: PascalCase.

## Test Conventions

- Unit tests mirror `app/` structure inside `tests/unit/`.
- Test files suffix must be `.test.ts`, `.test.tsx`, or `test_*.py`.

## Project-Specific Bans (Strictly Avoid)

- No magic strings/numbers.
- No string-union types (use explicit Enums).
- No scattered `try/catch` for database/IPC operations (use query wrappers).
- See `.lovable/strictly-avoid.md` for more.
