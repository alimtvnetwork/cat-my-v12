---
name: Coding + Error Management Rulebook
description: Distilled operating rules from spec/02-coding-guidelines and spec/03-error-manage; naming, TS style, error architecture, security, CI gates
type: preference
---

# Coding + Error Rulebook (spec/02 + spec/03)

## CORE (apply every action)

- No `any`/`unknown`/`interface{}` in business logic; use generics or concrete types. [02/08-typescript-standards-reference §2.1]
- Zero nested `if`: flatten with early returns. [01-cross-language/04-code-style/01-braces-and-nesting]
- Function body <= 15 lines; <= 3 params (options object for 4+). [01-cross-language/04-code-style/04]
- Booleans: `is`/`has` prefix (rare `should`). Never `can`/`was`/`will`/negative. [01-cross-language/02-boolean-principles/01]
- Never `!fn()`; wrap in a positively named guard. [01-cross-language/12-no-negatives]
- No magic strings/numbers. Enums: PascalCase + `Type` suffix. [02/08 §3]
- No string-union types (`"a"|"b"`), always a proper enum. [02/08 §3.3]
- Identifiers: no underscores/snake_case in logic (DB/WP persistence keys exempt). [01/15-master/01]
- Abbreviations first-letter-caps: `Id`, `Url`, `Api`, `Http`, `Json`; never `ID`/`URL`. [01/15-master/01]
- Every Result/error wrapper access is preceded by an error guard; no silent failure. [01/15-master/03 §6.1]
- Error-bearing fields typed `*AppError`/`Throwable`, never raw `error`/`string`. [03/.../05-usage-and-adapters]
- Pin security-sensitive deps to exact versions; no `^`/`~`/`>=`/`*`/`latest`. [11-security/01-axios/01]
- File soft cap 300 lines (400 with refactor note). [03/.../04-codes-and-policy §8]
- No `else` after `return`/`throw`/`break`/`continue`. Blank line before `return`/`throw`. [01/04-code-style/03]

## TYPESCRIPT / FRONTEND

- `any` prohibited everywhere (incl. `catch`, casts, generics). [02/08 §2.1]
- `unknown` only at parse boundaries (JSON.parse, `catch(err)`, guards); never in props/hook returns/exports. [02/08 §2.2]
- `Record<string, unknown>` banned in API signatures. [02/08 §2.3]
- Reusable functions, API envelopes, collection utils, hook factories MUST be generic. [02/08 §1]
- Discriminated unions: named interfaces + enum discriminator, dot access; no inline string variants. [02/12]
- `catch (err)` bare; narrow via `err instanceof Error`. [02/08 §4.1]
- Use `isDefined()`/`isDefinedAndValid()` from `src/utils/guards.ts`, not raw null checks. [02/08 §9]
- Independent async calls MUST use `Promise.all`. [02/09-promise-await-patterns]
- React Query: explicit `staleTime` (never default 0); `invalidateQueries` in mutation `onSuccess`. [06/03 #18,#20]
- Cache CODE RED: never `cache.set()` on error (delete); every set has explicit TTL; deterministic keys (no `Date.now()`); typed values. [06/02]
- ESLint at `error`: `no-explicit-any`, `no-unsafe-*`; `strict: true`. [02/11]

## ERROR MANAGEMENT (spec/03)

- Three tiers: Delegated Server -> Go `apperror` backend -> Frontend error store + Global Error Modal. [03/00]
- All backend APIs return Universal Response Envelope (`Status/Attributes/Results`). [03/00]
- Query Wrapper: All TS and Python database/IPC queries MUST use standardized wrappers (e.g., `safe_execute` in Python, `beFetch` in TS) that automatically log failures to avoid scattered try/catch boilerplate.
- State Checks: Always use explicit failure checks (e.g., `response.isFail`, `response.IsFailed`). NEVER invert success booleans (e.g., `!response.isSuccess`).
- Frontend connectivity uses HTTP status (2xx) as primary signal, not body fields. [03/01/02]
- Go: errors via `apperror.New()`/`apperror.Wrap()`; never `fmt.Errorf`/`errors.New`. [01/15-master/03]
- Go services return `apperror.Result[T]`, not `(T, error)` tuples. [01/15-master/04]
- Error codes in `codes.go`, ranged by domain (E1xxx config, E2xxx DB, E3xxx WP API, ...). Use `apperrtype` enum + `apperror.NewType()`. [03/03-registry/04]
- Global registry: each project reserves a numeric range (GEN 1000-1999, AB 9000-9499, etc.); check `03/03-error-code-registry/01-registry.md` before allocating; no reuse/collision. [03/03/01]
- PHP: `catch (Throwable $e)` with `use Throwable;`; never `\Throwable`. [01/15-master/03]
- Structured logger (zerolog-style) with fields; camelCase context keys; never swallow: log/return/propagate every error. [03/01/02]
- Verification mandatory: test backend directly (curl) AND check frontend detection before claiming a fix. [03/00 Core Principles]
- CI gate: `check-forbidden-strings.py` + `validate-guidelines.go --max-lines 15` must pass. [03/00 Verification]

## AI + CI/CD

- Run the 78-point AI Quick Reference Checklist on every generated block. [06/02]
- Top AI failures to avoid: camelCase JSON keys (should be PascalCase), uppercase abbreviations, multi-return Go funcs, `fmt.Errorf`, nested `if`, missing boolean prefix, explicit Go `json:` tags, `any`/`interface{}`. [06/03]
- Exceptions require `// SAFETY:` + `// TODO:` with ticket. [02/08 §7]
- CI: `eslint --max-warnings 0`; SonarJS cognitive-complexity <= 10; Axios-version compliance script blocks range symbols and vulnerable versions. [02/11][11-security/01/§4]

## SECURITY & DEPENDENCIES

- Security-critical deps pinned to exact versions in package.json/lockfiles. [11-security/01/§1]
- Dependabot/Renovate configured to ignore pinned security deps (axios, etc.). [11-security/01/§2]
- Version bumps of pinned deps require security-lead signoff + CVE audit. [11-security/01/§5]
- New CVE / supply-chain issue -> new folder under `11-security/` as source of truth. [11-security/00]

## NAMING & FILE STRUCTURE

- Classes/structs/components: PascalCase. Vars/methods: camelCase. Enum type: PascalCase+`Type`. Enum values: PascalCase. [01/15-master/01 §1.1]
- JSON/API keys: PascalCase (`"PluginSlug"`). [06/03 #1]
- Source files with a single primary type: PascalCase matching type (`UserProfile.tsx`); exemptions `index.ts`, `utils.ts`, `main.go`. [01/15-master/01 §1.3]
- DB tables/columns: PascalCase; indexes `Idx`+PascalCase; WP core tables exempt (snake_case). [01/15-master/01 §2]
- Spec/doc files: lowercase kebab-case, numeric prefix. [01/15-master/01 §1.3]

## APP-SPECIFIC (21..24)

- `21-app`, `22-app-issues`, `23-app-db`, `24-app-ui-design-system` are currently empty placeholders. Add rules there as features land; foundational cross-cutting rules stay in ranges 01-20. [21..24/00-overview]
- Placement: 21 = feature/workflow, 22 = bug RCA, 23 = data model, 24 = theming/components/layout.
- Registered but undocumented `CAT` (Control Automation UI) codes reference `spec/21-app/40-error-manage.md` and `spec/24-app-ui-design-system/07-errors-logging.md` as future homes for `E_LAYER_*`/`W_LAYER_*`/`I_UI_*`. [03/03/01 L63]
