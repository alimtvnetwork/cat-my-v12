# Newline Formatting Rule

## Rule

According to the coding guidelines (`spec/coding-guidelines/coding-guidelines.md`), there must be **one blank line before every `return` or `throw`**, unless it is the only statement in the block.

## Pattern

**INCORRECT**:

```typescript
function getGreeting(name: string) {
  const target = name || "World";
  return `Hello, ${target}!`;
}
```

**CORRECT**:

```typescript
function getGreeting(name: string) {
  const target = name || "World";

  return `Hello, ${target}!`;
}
```

**CORRECT (Only statement)**:

```typescript
if (condition) {
  return;
}
```

## Details

An automated AST script (`ts-morph`) was used to insert over 1,930 missing newlines before `return` and `throw` statements across 534 files in the repository. Moving forward, ensure any generated or refactored code strictly adheres to this spacing convention to maintain code quality.
