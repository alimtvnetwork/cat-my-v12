# Coding Guidelines Digest (Plan 39 steps 1-5)

Source: `spec/02-coding-guidelines/` @ v3.2.0 (2026-04-16). Captures the meta
rules that govern every code change; language deltas layer on top.

## Meta (root + 00-overview)

- **CODE RED priorities** (all mandatory, block merge):
  1. Error management is #1 — wrap business logic in error handling from line 1.
     Follow `spec/03-error-manage/` (read separately).
  2. Booleans use `is`/`has`/`should` prefix, positive names only (`IsActive`,
     never `IsDisabled`). Extract multi-part conditions into named variables.
  3. Zero nested `if` — early returns + guard clauses.
  4. DB: singular table names, PascalCase everywhere, `{Table}Id` PK,
     FK uses exact PK name.
  5. Never hallucinate — ask when unclear.
  6. Function 8-15 lines, file <300 lines, React component <100 lines,
     ≤3 params, 1 return value (Result/wrapper if needed).
- Naming convention matrix: Go/TS/PHP/C# → PascalCase identifiers.
  Rust → snake_case fn/var/mod (RFC 430), PascalCase types.
  **All languages** → PascalCase for DB columns and enum string values.
- Numbering: 01-20 core fundamentals, 21+ app-specific. Do not mix.

## Cross-language (01-cross-language)

- 29 files. Categories: style, naming, architecture (SOLID/DRY/complexity),
  type safety (strict typing, casting elim, null safety, immutability),
  patterns (nesting resolution, lazy eval, regex), testing, slug conventions.
- `11-key-naming-pascalcase.md` — all API/DB keys PascalCase.
- `12-no-negatives.md` — no `!fn()`; use `isInvalid()` etc.
- `13-strict-typing.md` — no `any`/`interface{}`; generics first.
- `20-nesting-resolution-patterns.md` — flatten via early return.
- Abbreviations: first letter only — `Id`, `Url`, `Json`, `Api`, `Http`, `Sql`.
- Boolean principles P1-P6 (prefix, no negatives, named guards, extract,
  no bool params, no mixed polarity).

## TypeScript (02-typescript) — primary stack

- **Generics first**: no `any`, `unknown`, `Record<string, unknown>` in
  business logic. All reusable functions generic. API envelope generic.
- Enums: `enum` syntax with PascalCase values, `Type` suffix (`StatusType`);
  string unions banned. File: `src/lib/enums/{name}.ts`.
- Discriminated unions: extract named interface per variant, generic
  `TypedAction<T, P>` for shared shapes; PascalCase enum values, dot notation.
- Promise/await:
  - Never return-then-await.
  - **CODE RED**: independent promises MUST run in parallel via `Promise.all`.
    Sequential `await` on independent calls = auto-reject.
- ESLint enforcement via custom plugin `coding-guidelines/*`:
  `no-nested-if`, `boolean-naming`, `no-magic-strings`, `max-function-lines`
  (15), `promise-all-independent`, `no-else-after-return`, plus
  `@typescript-eslint/no-explicit-any` and unsafe-\* family as errors.

## AI Optimization (06-ai-optimization)

- `01-anti-hallucination-rules.md`: 30+ explicit "never generate X" rules.
- `02-ai-quick-reference-checklist.md`: 50 pre-output checks — scan first.
- `04-condensed-master-guidelines.md`: <200-line digest for context windows
  (naming matrix, boolean P1-P6, enum rules per language).
- Workflow: (1) scan checklist 02, (2) apply anti-halluc rules 01 during
  gen, (3) verify against common-mistakes 03, (4) for enums consult 05.

## CI/CD Integration (06-cicd-integration)

- Portable linter pack `linters-cicd/` emits SARIF 2.1.0 to any CI.
- Plugin model per language; installable via ZIP one-liner, composite
  Action, or install.sh.
- `06-rules-mapping.md` maps each spec rule → check script → severity;
  CODE RED rules must fail the pipeline.

## What this project uses

Primary stack: TypeScript + React + TanStack Start (see `spec/21-app/`).
No Go/PHP/Rust/C# code in `src/`. So the binding rules for edits here are:

- Cross-language section (all of it).
- TypeScript section (all of it).
- AI-optimization section (workflow + anti-halluc + checklist).
- Error management (`spec/03-error-manage/`) — read in step 8-9.

## Open follow-ups (feed later plan steps)

- Read `spec/02-coding-guidelines/08-file-folder-naming/` and `11-security/`
  (Plan 39 step 6).
- Read language folders 03/04/05/07/09/10 headers only (step 7).
- Full `spec/03-error-manage/` read (steps 8-9).
