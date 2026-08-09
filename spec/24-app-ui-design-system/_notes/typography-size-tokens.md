# Deep Dive: Typography Size Tokens (Plan 30 Step 25)

**Version:** 1.0  
**Updated:** 2026-07-14  
**Depends on:** `01-foundations.md`, `_notes/foundations-color-delta.md` gap #8.  
**Status:** Closed.

---

## Decision

Use the existing `--text-hmi-*` scale as the canonical app UI typography size system. Do not add `--fs-*` aliases.

| Token                | Intended use                        |
| -------------------- | ----------------------------------- |
| `--text-hmi-title`   | title bar, compact uppercase labels |
| `--text-hmi-header`  | action headers, panel headings      |
| `--text-hmi-body`    | labels, forms, table cells          |
| `--text-hmi-tile`    | tool tile labels                    |
| `--text-hmi-counter` | large counters and numeric readouts |
| `--text-hmi-badge`   | status badges                       |
| `--text-hmi-caption` | helper text and captions            |

## Why this is the minimum correct fix

`src/styles.css` already exposes the complete HMI size scale, and `01-foundations.md` already says no new size tokens. Adding `--fs-*` aliases would create a second naming system and violate the plan 30 token budget.

## Implementation rule

Editor implementation uses Tailwind utilities generated from these tokens: `text-hmi-title`, `text-hmi-header`, `text-hmi-body`, `text-hmi-tile`, `text-hmi-counter`, `text-hmi-badge`, and `text-hmi-caption`.

Raw `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, and `text-3xl` are disallowed in `src/components/editor/**` and `src/routes/setup*.tsx` after editor implementation starts.

## Regression guard

```bash
rg -n "text-(xs|sm|base|lg|xl|2xl|3xl)" src/components/editor src/routes/setup.tsx src/routes/setup.roi.tsx src/routes/setup.reference.tsx
```

Expected: 0 hits for editor-owned UI. Existing shadcn primitives outside `src/components/editor/**` are out of scope.
