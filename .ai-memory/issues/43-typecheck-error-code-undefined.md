# 4-Part Root Cause Analysis (RCA): Typecheck TS2322 Error in `src/types/errors.ts`

> **Issue ID:** #43  
> **Target Repository:** `alimtvnetwork/cat-my-v12`  
> **Failed Run:** [GitHub Actions Run #35417450944](https://github.com/alimtvnetwork/cat-my-v12/actions/runs/35417450944)  
> **Commit SHA:** `2219652`  
> **Date:** 2026-09-19

---

## 1. Why It Happened (Symptom)

The GitHub Actions CI pipeline failed at the `Frontend lint + typecheck + tests` job during the `Typecheck (tsc)` step:

```text
src/types/errors.ts(240,5): error TS2322: Type 'string | undefined' is not assignable to type 'string'.
  Type 'undefined' is not assignable to type 'string'.
error: script "typecheck" exited with code 2
##[error]Process completed with exit code 2.
```

Because `Typecheck (tsc)` is a blocking gate configured ahead of build and test execution, the pipeline immediately halted.

---

## 2. How It Happened

In commit `2219652` (`fix(ci): align root readme with spec §9, fix linter encoding and nested if, and document 4-part RCA #42`), an automated refactoring turn modified `buildCapturedError()` in `src/types/errors.ts` to eliminate an unbraced single-line `if` statement (`if (typeof o.code === "string") base.code = o.code;`) and avoid nested `if` statements.

The refactored line was written as:

```typescript
base.code = typeof o.code === "string" ? o.code : undefined;
```

However, `CapturedError.code` is typed as a non-optional `string` (initialized in `base` from the parameter `code = "E_UNKNOWN"`). Because `code` is strictly typed as `string`, assigning `undefined` violates TypeScript's strict null checks, triggering `error TS2322`.

---

## 3. Root Cause

1. **Flawed Ternary Fallback Selection:** When converting `if (typeof o.code === "string") base.code = o.code;` into a ternary assignment, `undefined` was chosen as the default fallback branch rather than preserving the existing non-nullable value `base.code`.
2. **Missing Local Pre-Commit Compilation Verification:** The file edit was committed without running `bun x tsc --noEmit` locally, allowing the regression to push to the remote branch.

---

## 4. Code Fix & Prevention

### Code Fix

In `src/types/errors.ts` (line 240), replaced the fallback of `undefined` with `base.code`:

```typescript
export function buildCapturedError(
  err: unknown,
  code: string = "E_UNKNOWN",
  context?: Record<string, unknown>,
): CapturedError {
  const base: CapturedError = {
    message: typeof err === "string" ? err : safeStringify(err),
    code,
    timestamp: new Date().toISOString(),
    context,
  };

  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    base.message = typeof o.message === "string" ? o.message : safeStringify(err);
    base.code = typeof o.code === "string" ? o.code : base.code;

    return base;
  }

  return base;
}
```

This change:

- Retains the default `code` argument (e.g. `"E_UNKNOWN"`) when `o.code` is not a string.
- Strictly satisfies TypeScript's non-nullable `string` type invariant.
- Introduces zero nested `if` statements.
- Preserves all coding guidelines and vertical line gaps.

### Prevention

1. **Coding Guideline Update:** When refactoring guard clauses or single-line assignments into ternaries, never fallback to `undefined` for properties with non-nullable types. Fallback to `base.<prop>` or the canonical default value.
2. **Mandatory Typecheck Verification:** Always verify with `bun x tsc --noEmit` before concluding any turn modifying TypeScript files.
