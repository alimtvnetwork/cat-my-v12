# Compound Keyboard Keys

**Rule:** Never use raw boolean `||` chaining for common keyboard key combinations (e.g., checking for both Enter and Space, or Arrow keys).

**Why:** It violates the strict cyclomatic complexity rules (`CODE-RED-001` nested ifs / cyclomatic limits) and `P4a` max conditions.

**How:** Use the compound helpers in `KeyboardKeyType`:

- `KeyboardKeyType.isEnterOrSpace(key)`
- `KeyboardKeyType.isArrowUpOrDown(key)`
- `KeyboardKeyType.isArrowLeftOrRight(key)`
- `KeyboardKeyType.isArrowKey(key)`

**Example (Forbidden):**

```typescript
if (
  KeyboardKeyType.isEnter(e.key) ||
  (KeyboardKeyType.isSpace(e.key) && active && items.includes(active))
) {
  // Fails linter and cyclomatic complexity
}
```

**Example (Required):**

```typescript
if (KeyboardKeyType.isEnterOrSpace(e.key) && active && items.includes(active)) {
  // Clean and compliant
}
```
