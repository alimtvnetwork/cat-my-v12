# Enum Usage (V2 Explicit Guide)

This document provides explicit guidelines and examples for defining and checking Enums in the codebase to maintain strict type safety and consistency.

## The Core Rules

1. **Suffix**: All enums must be suffixed with `Type` or `Category` (e.g., `RunStatusType`, `RuleKindType`).
2. **Namespace Helpers**: Every enum must be accompanied by an `export namespace EnumName` that provides an `isVariant(val)` validation function for every variant.
3. **No Raw Checks**: Raw equality checks (e.g., `val === EnumType.Variant`) are **strictly forbidden** anywhere outside of the enum's own namespace definition.

---

## 1. Defining an Enum

When creating a new Enum, you must immediately define its namespace with boolean helper functions.

### ✅ Correct Definition

```typescript
// src/types/run/RunStatusType.ts

export enum RunStatusType {
  Idle = "idle",
  Running = "running",
  Error = "error",
}

export namespace RunStatusType {
  export function isIdle(val: unknown): val is RunStatusType.Idle {
    return val === RunStatusType.Idle;
  }

  export function isRunning(val: unknown): val is RunStatusType.Running {
    return val === RunStatusType.Running;
  }

  export function isError(val: unknown): val is RunStatusType.Error {
    return val === RunStatusType.Error;
  }

  // Optional but recommended: A generic checker for the entire enum
  export function isVariant(val: unknown): val is RunStatusType {
    return Object.values(RunStatusType).includes(val as RunStatusType);
  }
}
```

---

## 2. Checking Enum Values

When you need to check the value of an enum in a component, hook, or service, you **MUST** use the namespace helpers.

### ❌ Incorrect (Raw Equality Check)

```typescript
import { RunStatusType } from "@/types/run/RunStatusType";

function getStatusColor(status: RunStatusType) {
  if (status === RunStatusType.Error) {
    return "red";
  }

  if (status === RunStatusType.Running) {
    return "green";
  }

  return "gray";
}
```

### ✅ Correct (Using Namespace Helpers)

```typescript
import { RunStatusType } from "@/types/run/RunStatusType";

function getStatusColor(status: RunStatusType) {
  if (RunStatusType.isError(status)) {
    return "red";
  }

  if (RunStatusType.isRunning(status)) {
    return "green";
  }

  return "gray";
}
```

## Why this rule?

This approach guarantees that if an enum is modified, expanded, or transitioned to a discriminated union later, the business logic consuming the enum will throw type errors or remain completely insulated, drastically reducing refactoring regressions.
