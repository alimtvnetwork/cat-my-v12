---
Parent: 30-app-ui-rule-editor-revamp
Slug: rule-controller-schema
Status: pending
Created: 2026-07-14
---

# SS-01 — Rule Controller schema

Defines the typed shape a `RuleLayer` carries and the panel each `kind` renders. This lives in `spec/24-app-ui-design-system/04-rule-editor/03-rule-controller.md` once the spec sweep lands.

## Layer envelope (all kinds share these)

| Field       | Type               | Notes                                                                        |
| ----------- | ------------------ | ---------------------------------------------------------------------------- |
| `id`        | `string` (ULID)    | Stable, never reused.                                                        |
| `name`      | `string`           | User-editable, defaults to `"<kind> <n>"`.                                   |
| `kind`      | `RuleKind`         | Discriminant, see below.                                                     |
| `shape`     | `Shape`            | `rect` \| `circle` \| `polygon` — geometry in image-space (0..1 normalized). |
| `zIndex`    | `number`           | Photoshop-style ordering.                                                    |
| `visible`   | `boolean`          | Eye toggle.                                                                  |
| `locked`    | `boolean`          | Prevents drag/resize.                                                        |
| `threshold` | `number` (0..100)  | Pass/fail cutoff.                                                            |
| `enabled`   | `boolean`          | Participates in Run evaluation.                                              |
| `createdAt` | `number` (unix ms) | For undo/history.                                                            |

## Discriminated `kind`

- `presence` — asserts foreground blob covers ≥ threshold % of the shape.
- `absence` — inverse of `presence`.
- `ocr` — runs OCR on the crop, compares against `expectedText` with normalization (`caseInsensitive`, `stripWhitespace`).
- `text_match` — regex match against pre-extracted text (`pattern`, `flags`).
- `number` — numeric range check (`min`, `max`, `unit`).
- `math` — evaluate `expression` referencing sibling rules by `name` (e.g. `RULE_A.value + RULE_B.value < 100`).
- `color` — sample average color of the shape, compare against `expectedColor` (hex) with `deltaE` tolerance.
- `pattern` — template match against a stored reference image crop, threshold in %.
- `edge` — Canny edge density check inside the shape.
- `blob` — connected-component count and size band.

## Panel layout

Panels open in the right rail on rule click. Order:

1. **Identity** — name, kind (change kind mid-flight is allowed, warns about parameter loss).
2. **Geometry** — read-only bounds + "Redraw" action.
3. **Kind-specific parameters** — the fields listed above per kind.
4. **Threshold** — always present, slider 0–100 with tick every 5.
5. **Actions** — Duplicate, Delete, Lock, Hide.

## Validation

- On save, run a synchronous validator per `kind`. On failure show inline `E_UI_RULE_INVALID:<field>` — never silently coerce.
- On `kind` change, keep only shared fields and reset the rest with typed defaults.
