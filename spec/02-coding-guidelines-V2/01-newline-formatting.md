# Newline Formatting (V2 Explicit Guide)

This document provides explicit guidelines and examples for the formatting of `return` and `throw` statements to ensure maximum readability.

## The Core Rule

> **One blank line before every `return` or `throw`, unless it is the only statement in the block.**

This rule separates the "preparation" or "execution" phase of a function from its "exit" phase, providing a clear visual break for the reader.

---

## 1. Standard Returns (Requires Newline)

When a block contains multiple statements, you **MUST** leave a blank line before the `return`.

### ❌ Incorrect (No blank line)

```typescript
function calculateTotal(price: number, taxRate: number) {
  const tax = price * taxRate;
  const total = price + tax;
  return total;
}
```

### ✅ Correct (Blank line included)

```typescript
function calculateTotal(price: number, taxRate: number) {
  const tax = price * taxRate;
  const total = price + tax;

  return total;
}
```

---

## 2. Early Returns & Guard Clauses (Requires Newline)

If you are checking a condition and returning early, the block leading up to the return must still obey the rule if there is preceding logic in the same scope.

### ❌ Incorrect

```typescript
function processOrder(order: Order) {
  const isValid = validateOrder(order);
  if (!isValid) {
    return { status: "invalid" };
  }

  const payment = processPayment(order);
  return { status: "success", payment };
}
```

### ✅ Correct

```typescript
function processOrder(order: Order) {
  const isValid = validateOrder(order);

  if (!isValid) {
    return { status: "invalid" };
  }

  const payment = processPayment(order);

  return { status: "success", payment };
}
```

_(Notice the blank line before the `if` block if the `if` block is essentially functioning as the return mechanism for that section, though the strict rule applies directly to the `return` keyword itself)._

---

## 3. The "Only Statement" Exception (No Newline)

If the `return` or `throw` is the **only** statement inside its curly braces `{}`, you **MUST NOT** include a blank line before it.

### ❌ Incorrect (Blank line when it's the only statement)

```typescript
if (isError) {
  throw new Error("Failed");
}
```

### ✅ Correct (No blank line)

```typescript
if (isError) {
  throw new Error("Failed");
}
```

### ✅ Correct (Arrow Functions)

```typescript
const getDouble = (val: number) => {
  return val * 2;
};
```

---

## 4. Throw Statements

The exact same rules apply to `throw`.

### ❌ Incorrect

```typescript
function loadConfig(path: string) {
  const file = fs.readFileSync(path);
  if (!file) throw new Error("Missing file"); // Single line without brace is acceptable if project style allows, but if it has braces:
}
```

### ✅ Correct

```typescript
function loadConfig(path: string) {
  const file = fs.readFileSync(path);

  if (!file) {
    throw new Error("Missing file"); // Only statement in block, no newline before throw
  }

  return file; // Blank line before return
}
```
