# Plan 05: Code Quality & Guideline Audit

## Goal
Audit the entire codebase for specific coding guideline violations based on recent user feedback. Ensure all agents adhere to strict TypeScript best practices going forward.

## Guidelines to Enforce
1. **Explicit Types for Variables:** Arrays and objects must be explicitly typed (e.g., `const TOOLS: ToolItem[] = [...]`). Do not rely solely on inference for complex objects.
2. **Explicit Return Types for Functions/Components:** All React components and utility functions must have explicit return types (e.g., `export function MyComponent(): React.JSX.Element | null`).
3. **Small Component Size:** Refactor large components into smaller, more manageable pieces. Extract inner mapping functions into separate components (e.g., extracting a `ToolButton` component instead of mapping inline).
4. **PascalCase Enum Values:** TypeScript enum string values must be PascalCase, matching their keys if possible (e.g., `enum MyType { None = "None" }` instead of `"none"` or `"PATTERN_EDGE"`).

## Pending Audit Tasks

- [x] **Task 1: Component Return Types**
  - Search `src/components/` and `src/routes/` for React components missing `React.JSX.Element`, `React.ReactNode`, or `null` return types.
  - Update all exported functional components to have explicit return types.

- [ ] **Task 2: Enum Value Casing**
  - Search `src/types/`, `src/lib/enums/`, and `src/domain/` for enums that use lowercase or snake_case string values.
  - Safely migrate them to PascalCase (ensuring any database or local storage migrations are handled if these values are persisted).

- [ ] **Task 3: Explicit Variable Typing**
  - Review configuration arrays, toolbars, and constants across the codebase.
  - Ensure all maps and arrays are strongly typed with an `interface` or `type`.

- [x] **Task 4: Component Size Refactoring** (Completed in Plan 06)
  - Identify React components exceeding 150-200 lines.
  - Extract logical sub-sections into smaller, dedicated components in the same file or a sibling file.

- [ ] **Task 5: Non-Nullable Booleans Audit**
  - Search the codebase for `?: boolean` and `: boolean | null`.
  - Replace them with `: boolean` and provide default `false` values instead of relying on `null` or `undefined`.
  - Review database schemas/migrations to ensure `BOOLEAN` columns are `NOT NULL DEFAULT FALSE`.

## Execution Notes
Future agents picking up this plan should use `grep_search` to find violations and `multi_replace_file_content` to batch fix them.


