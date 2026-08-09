# Enum Refactoring (Plan 83, 86, etc)

## Rule

As of this refactoring loop, all enums must adhere to the `Type` or `Category` suffix convention (e.g., `RuleKindType`, `RunStatusType`, `KeyboardKeyType`).
Additionally, raw equality checks (e.g., `val === RuleKindType.Circle`) are strictly forbidden outside of the enum's namespace definition.

## Pattern

To check enum values, use the namespace helper functions generated alongside the enum.

**INCORRECT**:

```typescript
if (state.dock === DockSlotType.Hidden) { ... }
```

**CORRECT**:

```typescript
if (DockSlotType.isHidden(state.dock)) { ... }
```

## Details

An automated AST script (`ts-morph`) was used to replace `185+` instances of raw equality checks with the namespace helpers across the codebase. Ensure any future code strictly relies on `EnumType.isVariant(val)` format to prevent regressions in code quality and adherence to the guidelines defined in `.lovable/coding-guidelines/coding-guidelines.md`.
