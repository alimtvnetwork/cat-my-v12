---
name: coding-guidelines-enforcer
description: Authoritative coding constraints, boolean standards, size caps, and error contracts for TypeScript, Python, and Go in this repository.
---

# Coding Guidelines & Enforcement

## Overview
Codifies and enforces all non-negotiable coding standards, cyclomatic complexity limits (P4a), naming rules, and file size constraints across the codebase.

## 1. Strict Boolean Standard
- **Identifier Prefix**: Every boolean variable or property must strictly start with `is` or `has` only (`can`, `should`, `was`, `will`, `did`, `must` are strictly banned).
- **Positive Framing Only**: Always frame booleans positively (e.g. `isActive`, `hasAccess`; never `isNotActive`, `isBlocked`, or `hasNoData`).
- **No Negative Words**: Never include `not`, `no`, or `non` in boolean identifiers.
- **Strict Non-Nullability**: Never use `boolean | null` or `boolean | undefined`. Always provide deterministic defaults (`false`). Database columns must be `BOOLEAN NOT NULL DEFAULT FALSE`.
- **No Boolean Flag Parameters**: Never pass loose boolean flags to functions; decompose into two descriptive, single-purpose functions.
- **Explicit Comparisons**: Avoid implicit truthiness checks (`if (!isReady)`). Use explicit equality (`if (isReady === false)` or `if (is_ready is False)`).

## 2. Size Limits & Single Responsibility
- **Function Length**: <= 8 lines preferred, 15 lines absolute hard cap. Functions exceeding 15 lines must be decomposed into typed helpers.
- **File Length**: <= 80–100 lines maximum. Route files must remain thin composers delegating to specialized components or hooks.
- **5–8 Files Micro-Batching**: All refactorings, migrations, and structural modifications must be executed in micro-batches of 5–8 files per commit/subtask.

## 3. Control Flow & Cyclomatic Complexity
- **Zero Nested Ifs**: Nested `if` statements are strictly forbidden. Always use early-return guard clauses.
- **Condition Extraction**: Any condition containing 2 or more operators (`&&`, `||`, `!`) must be extracted into a positively named boolean constant or helper function.
- **Compound Keyboard Keys**: Always use compound helpers from `KeyboardKeyType` (e.g., `KeyboardKeyType.isEnterOrSpace(key)`) rather than chaining conditions (`||`).

## 4. Parameter Structs & Type Narrowing
- **Parameter Structs**: Loose parameter lists with > 2–3 arguments are forbidden. Always wrap in explicit `*Params` or typed options bags.
- **Type Narrowing**: No `any`, `unknown`, or untyped open interfaces in TypeScript.
- **No Bare Void in Go**: Functions must return `Result[T]` or `*appfault.AppError`.

## 5. Enums & Constants
- **Enum Suffix**: Every enum identifier must end with `Type` (e.g. `RuleKindType`, `ValidationModeType`).
- **Enum Members**: Strictly `PascalCase`.
- **Namespace Equality Helpers**: Never use direct comparison `=== EnumType.Value`. Always use semantic namespace helpers.
- **No String Union Types**: String union types (`type Status = "a" | "b"`) and inline magic strings are strictly banned.

## 6. Vertical Line Gaps & Whitespace
- Mandatory blank line before every `if` statement (unless at block start).
- Mandatory blank line after every closing `}` (unless followed by `else`, `catch`, or closing block).
- Mandatory blank line before every `return` or `throw` (unless the only statement in block).
- Mandatory blank lines around multiline struct calls or object instantiations.
- Never two consecutive blank lines anywhere.

## 7. Error Contracts & Query Wrappers
- **Never Swallow Errors**: Empty `catch {}` in TS or `except: pass` in Python are strictly forbidden. Log context and key inputs.
- **Safe Query Wrappers**: Never call raw `conn.execute()` or `beFetch()`. Always use `safe_execute` / `safe_executemany` in Python and `executeApiQuery` in TypeScript.
- **Universal Response Envelope**: All API responses follow `{ Status, Attributes, Results, Errors }`.
