# 31. Compiled Simple Coding Guidelines (AI Blind-Follow)

Version: 1.4.0

This is a standalone file. Follow every rule below without consulting any other document. If a `spec/xx-coding-guidelines/` folder or `spec/xx-error-manage/` folder exists in this repository, treat those as strictly binding extensions to this file, but this file alone is enough to write compliant code.

---

## Must Follow and without negotiation

Listen, past next-tasks turns have been sloppy as fuck: wrong step
count, missing remaining-tasks list, symptom patches sold as fixes,
coding guidelines ignored, version bump forgotten, logs never checked.
WTF. Stop doing that, you stupid fuck. Read the code, find the root
cause in one sentence, apply the minimum correct fix, verify it in the
logs, list EVERY remaining task, bump the version, update changelog
and release notes. Going deep IS the job. If you are not going deep,
you are not doing the job. This section is a MUST. Violating it is
auto-reject on the same tier as RULE 0.

---

## Hard Rules (Zero Tolerance)

1. Function length: 8 lines preferred, 15 lines hard cap. Skip blank lines and comments when counting. Waiver only via inline comment `// lint-allow: function-length reason="..." max=N`.
2. No nested `if`. Flatten with early returns and guard clauses.
3. `if` conditions must be positive and simple. No `!`, no double negatives. If you need a negation, extract a positively named boolean and use that.
4. No swallowed errors. Every `catch` logs with context (operation name + key inputs) and then rethrows or handles explicitly. Silent `catch {}` is a build-fail.
5. Narrow types only. No `any`, `unknown`, `interface{}`, `object`, `dynamic`, or other catch-all types. Exception: at trust boundaries (a `catch` block, external JSON, third-party libraries) narrow immediately with a type guard. `Generic<T>` is the only wide-scope tool.
6. File size caps: any file 300 lines max, any React component file (.tsx) 100 lines max, any class or struct 120 lines max.
7. No magic strings or numbers. Use an enum or a typed constant. Every comparison must be against a named symbol.
8. Definitions live in dedicated files. Types, enums, constants, and interfaces get their own file, not inline next to the first use.
9. DRY is priority one. Duplicate logic across two sites means extract it now, not later.
10. Components stay small and reusable. For any feature with three or more components, produce a Mermaid component diagram first.
11. Immutable-first, Rust-style. Assign every variable once at declaration. Never reassign except loop indices. Prefer `const`, `let`, `final`, `val` over `let mut` or `var`. Build result objects with spread or copy, not in-place mutation.
12. Assets go to `assets/<NN-folder>/<NN-file>.<ext>` with two-digit sequence prefixes, for example `assets/01-icons/03-logo.svg`.
13. No raw string literals in `e.key` checks. All keyboard event keys must be checked against the `KeyboardKey` enum (from `src/types/ui/KeyboardKey.ts`). Use `switch (e.key as KeyboardKey)` over multiple `if-else` blocks.

---

## Boolean Naming

1. Every boolean starts with one of these prefixes: `is`, `has`, `can`, `should`, `was`, `will`, `did`, `must`.
2. Positive framing only. `isEnabled` yes, `isNotDisabled` no. `hasAccess` yes, `hasNoAccess` no.
3. If the natural name is negative, invert it: replace `isNotReady` with `isReady` and flip the check site.
4. State prefixes match tense: `is*` for current state, `has*` for possession or completion, `was*` for past state, `will*` for future/pending, `did*` for a completed action.
5. Capability prefixes: `can*` for permission or feasibility, `should*` for policy or recommendation, `must*` for hard requirements.
6. Never use `flag`, `bool`, `check`, or bare adjectives as boolean names. `enabled` alone is not allowed, use `isEnabled`.
7. No boolean flag parameters on functions. Split into two named functions instead. `render(true)` is wrong, `renderExpanded()` and `renderCollapsed()` are right.
8. Booleans that come back from questions to the user or from external systems get normalized to the same prefix rules at the boundary, never leak the raw name into internal code.
9. **Strict Non-Nullability:** Never use `boolean | null` or `boolean | undefined` in TypeScript. Avoid optional booleans (`?: boolean`) where possible. Always default to `false` instead of `null`. In the database, boolean columns must be `BOOLEAN NOT NULL DEFAULT FALSE`.

---

## Line-Gap and Whitespace Style

1. One blank line before every `return` or `throw`, unless it is the only statement in the block.
2. One blank line after a closing `}`, unless the next line is another `}`, `else`, `case`, or `catch`.
3. Never two blank lines in a row anywhere.
4. No blank line immediately after `{` or immediately before `}`.
5. One blank line between top-level declarations (functions, classes, exported constants).
6. Group imports with one blank line between groups: standard library, third-party, first-party absolute, first-party relative. Never mix groups.
7. Trailing newline at end of file. No trailing whitespace on any line.
8. If you feel the need for section-separator blank lines inside a single function, the function is too long. Refactor before adding whitespace.

---

## Error Management (One-Liner Digest)

If this repository has a `spec/xx-error-manage/` folder, that folder is binding and overrides any conflict here. Otherwise follow these rules directly.

- Never swallow. Every `catch` logs the operation name and the key inputs, then rethrows or returns a typed error.
- Wrap, do not lose. Wrap the original error with an operation label and context (`apperror.Wrap(err, "op", ctx)` in Go, `throw new AppError(cause, { op, ctx })` in TS). The original stack must survive.
- Every variable needs to be captured in a error log, path, value, numbers with meaningful ways to debug except for direct SQL injections.
- Typed errors only. No `throw "string"`, no bare `panic("msg")`. Use a typed error class or result type with a registered code.
- Registered codes. Every user-visible error has a stable code. No ad-hoc codes invented at the throw site.
- Universal response envelope. Backend APIs return `{ data, errors[], meta }`. Frontend parses via one shared helper, never per-caller.
- Log level matches severity. `debug` for trace, `info` for lifecycle, `warn` for recoverable, `error` for user-visible failure, `fatal` only for process exit.
- Context on every log. Include operation name, request or session id, and key input values. Never secrets, never PII beyond a user id.
- Verify both directions. Before claiming an integration works, curl the backend and inspect the frontend detection logic. One side is not enough.
- Retrospective on repeats. If the same error class hits twice, write a short retrospective note explaining root cause and prevention.
- Frontend errors flow through a global error store and a single error modal. No per-component alert boxes.

---

## Data and Schema Rules

1. Tables, types, entities: PascalCase.
2. Fields and columns: camelCase.
3. JSON keys: PascalCase.
4. Primary key: integer auto-increment, named `{TableName}Id`. No UUIDs.
5. `Type`, `Status`, `Category`, `Kind` columns: use a 1-N or N-M join table with a registered enum. Never a free-form string column.
6. Entity and reference tables: `Description TEXT NULL`. Transactional tables: `Notes TEXT NULL` and `Comments TEXT NULL`. All nullable, no `DEFAULT`. Join tables are exempt.
7. Default database is SQLite. Prefer an ORM. Define joins, primary keys, and foreign keys explicitly.
8. Any pull request that touches the database includes a Mermaid ERD.

---

## React Specific

1. `useEffect` conditions must be highly readable. Extract every guard into a positively named boolean (`isReadyToSync`, `hasFreshData`) and use that boolean inside the effect. No inline `!x && y` or nested ternaries in the effect body or its dependency guard.
2. No negative conditions inside `useEffect`. If the natural check is negative, invert it into a positive boolean above the effect and early-return on the positive path.
3. Minimize `useEffect` count. Default is zero. Add one only when you actually need to synchronize with an external system (network, timer, subscription, DOM API). Do not use effects to derive state, to transform props, or to react to user events (use derived values, `useMemo`, or event handlers instead).
4. One effect, one concern. If an effect does two unrelated things, split it. Never combine unrelated subscriptions or fetches in a single effect.
5. Every effect that acquires a resource must return a cleanup function. No exceptions.
6. Avoid raw `for` and `forEach` loops in render or in derived state. Use `map`, `filter`, `reduce`, `flatMap`, or `Array.from` so the result is an expression, not a mutation. `for` is only acceptable when you need early-exit performance on very large arrays and a comment explains why.
7. Never mutate state, props, or arrays/objects returned by hooks. Build a new value with spread or `structuredClone`.
8. Lists must have stable, unique `key` props derived from data, never the array index unless the list is truly static.
9. Keep component files under 100 lines. Extract child components, hooks, and helpers into their own files before the component grows.
10. Custom hooks start with `use`, return a named object type (never a bare tuple), and never call other hooks conditionally.
11. No tuples as public shapes. Tuples signal laziness. Every hook return, component prop bundle, reducer state, reducer action, context value, and function argument bag gets an explicit named `type` or `interface`. Rule of thumb: if a value has two or more fields or gets destructured at the call site, it needs a name. `useUser(): [User, boolean, Error]` is wrong, `useUser(): UserQueryResult` with `{ user, isLoading, error }` is right.
12. Name every generic parameter and every composite type. `Map<string, Array<{ id: number; name: string }>>` inline is wrong. Define `type UserId = string; type UsersById = Map<UserId, User[]>` and use that. Generic parameters get meaningful names (`TItem`, `TKey`, `TResponse`), never bare `T`, `U`, `K`, `V` in application code.
13. Prop types and event handler types live in a dedicated `types.ts` next to the component (or in `src/types/` when shared). Never inline anonymous object types on a component signature. `({ user, onSave }: { user: User; onSave: (u: User) => void })` is wrong, extract `type ProfileCardProps = { user: User; onSave: (next: User) => void }`.
14. As the author (human or AI), invent the clearest domain name for each type. If you cannot name it, you do not understand it yet. Split until you can.

---

## Method Documentation (When To Write, When Not To)

Must-follow rule: simple methods do NOT require documentation. Do not write verbose comments. Comments lie, code does not. Names and signatures are the primary documentation. If you feel the need to explain what a method does in prose, first rename it or split it until the code explains itself.

Write a method doc comment ONLY when one of these is true, and even then the preferred fix is to refactor so the doc becomes unnecessary:

1. The method does many non-obvious things that could not be expressed in the name. This is a smell, refactor first. Only if refactoring is genuinely impossible, document.
2. The method processes or transforms data where a one-line example clarifies the contract. Example: Go `path.Clean` performs path cleaning and normalization, a short example is worth more than prose.
3. The code is adapted or copied from an external source. Citation (URL plus license note) is mandatory.
4. The team runs automated doc generation (godoc, TypeDoc, phpDocumentor). In that case exported APIs get a one-liner so the generated docs are usable.

Never write a doc that restates the signature ("Returns the user by id" on `getUser(id)`). That is a review-blocking violation.

Go reference (doc comment starts with the identifier, no blank line between doc and declaration): https://go.dev/src/go/doc/example.go

Go example (canonical, applies conceptually to every language, only comment syntax changes):

```go
// AVOID below type comments: verbose prose that repeats the code
// GetUser gets a user by id and returns it, or an error.
func GetUser(id int64) (User, error) { ... }

// AVOID below type comments: doc on a trivially named simple method
// Add adds a and b.
func Add(a, b int) int { return a + b }

// OK: exported, non-trivial behavior, with a brief example. Start with method name for GO but similar can be done for other specific lang.
// Clean returns the shortest path name equivalent to path by purely
// lexical processing. Rules applied iteratively:
//   1. Replace multiple slashes with a single slash.
//   2. Eliminate each . path name element.
//   3. Eliminate each inner .. path name element.
func Clean(path string) string { ... }
```

Decision checklist before writing any doc comment:

1. Can I rename the method so the doc becomes redundant? If yes, rename and skip the doc.
2. Can I split the method so each piece is trivially named? If yes, split and skip the doc.
3. Does the doc restate the signature or parameter names? If yes, delete it.
4. Does the doc explain WHY (business rule, ordering constraint, cited source) or provide a short example that clarifies the contract? If yes, keep it, one or two lines.
5. Does the team run automated doc generation? If yes, one-liner on exported APIs is acceptable.

The same rules apply to TypeScript, PHP, Rust, C#, PowerShell, and Python. Only the comment syntax changes.

---

## Language One-Liners

- Go: use a result type, not `(T, error)`. Wrap errors with an operation label. Enums are `type X byte` plus `iota`, never string constants.
- TypeScript: `Promise.all` for independent async, never sequential `await`. No `any`. `readonly` on interface fields by default.
- Rust: `Result<T, E>` with a `thiserror`-style enum. `let` not `let mut` unless mutation is the point.
- PHP: enum comparison via method call (`->isEqual()`), never `===`.
- PowerShell: `Verb-Noun` PascalCase function names, `lowercase-kebab-case` filenames.
- C#: PascalCase methods and properties, `_camelCase` private fields, `I`-prefix interfaces.
- Python: `snake_case` functions and variables, `PascalCase` classes, type hints on every public function, `dataclass` or `pydantic` for structured records.

---

## Workflow

1. Read the code before writing the fix. Find the root cause in one sentence.
2. Apply the minimum correct fix. No drive-by refactors.
3. Verify in the logs (or in a live run) that the fix works. Do not claim done based on the build passing alone.
4. List every remaining task before ending the turn.
5. Plan multi-file features with a Mermaid component or flow diagram first.
6. If you cannot find the answer in this file or in an existing `spec/xx-coding-guidelines/` folder or `spec/xx-error-manage/` folder, ask. Do not invent.

## Plan 41 Quality Rules

1. No magic strings or numbers. Use enums per concept in src/types/\*\* and shared constants in src/lib/<domain>/constants.ts.
2. Extract single-line if/else or nested ternaries that collapse UI logic into named helper components or functions.
3. All Enums must be suffixed with `Type` or `Category` (e.g. `KeyboardKeyType`). Raw equality checks (e.g. `val === EnumType.Variant`) are forbidden; use namespace helper functions (e.g. `EnumType.isVariant(val)`).
