# Plan 92: Code Quality, Enums, and Query Wrappers

## Overview

This plan implements the strict code quality requirements introduced in Session V4, specifically focusing on Enums, boolean checks, and automatic query failure logging.

## Objectives

1. **Query Wrappers**: Create query wrappers for PHP/Python/TS that automatically log failures to reduce scattered logging code.
2. **Enum Enforcement**: Eliminate all TypeScript string union types (e.g., `"pass" | "fail" | "fallback"`) and replace them with strict Enums. All Enums must end with the `Type` suffix.
3. **Boolean Checks**: Enforce explicit boolean checks (e.g., `isFail`) and remove all inverted success checks (e.g., `!isSuccess`).
4. **Magic Strings/Numbers**: Remove all magic strings and numbers across the codebase, except where explicitly used for logging (and typed as such).
5. **Memory Update**: Document these rules in `.lovable/memory/` and update `index.md`.

## Steps

1. Create `spec/` for Query Wrappers (PHP/Python/TS) detailing the failure logging mechanism.
2. Implement the Query Wrappers in `src/lib/` (TS) and `app/core/` (Python) and PHP if applicable.
3. Audit the codebase for TS string unions and replace with `*Type` Enums.
4. Audit the codebase for inverted boolean checks (`!isSuccess`) and replace with explicit `isFail` or similar properties.
5. Audit for magic strings/numbers and replace with constants/enums.
6. Run `bunx tsgo --noEmit` and `pytest` to ensure 0 errors.
7. Commit changes with a descriptive message and bump minor release.
