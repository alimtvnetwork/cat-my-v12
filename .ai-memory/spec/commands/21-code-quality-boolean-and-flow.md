# Command 21, Boolean and control-flow readability

Scope: `src/**` (TS/TSX).
When it applies: any refactor touching conditionals or predicates.

## Verbatim (paraphrased from voice input)

> "Read the boolean condition, how it needs to be written. No logic
> change. Make sure that things are more meaningful, readable functions
> and everything else."

## Requirements

- Predicates named `is*`, `has*`, `can*`, `should*` (PascalCase-friendly
  identifiers, camelCase functions).
- No implicit truthy checks on non-boolean values; compare explicitly
  (`value !== null`, `value.length > 0`).
- Early-return over nested `if/else`; ternaries only when both arms are
  short expressions.
- No inline negation of complex expressions; extract to a named
  predicate.
- No `!!` coercion; use `Boolean(...)` or an explicit comparison.
- Switch on discriminated unions with exhaustive `never` fallthrough
  guard.

## Non-goals

- No behavioural change. Pure readability.
