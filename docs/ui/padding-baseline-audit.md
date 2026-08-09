# Padding Baseline Audit

Plan 83 backlog item 20. Snapshot as of v3.707.0.

## Token source of truth

Defined in `src/styles.css` (Tailwind v4 `@theme`):

| Token             | Value                                        | Approx px |
| ----------------- | -------------------------------------------- | --------- |
| `--spacing-hmi-1` | `0.25rem`                                    | 4         |
| `--spacing-hmi-2` | `0.5rem`                                     | 8         |
| `--spacing-hmi-3` | `0.75rem`                                    | 12        |
| `--spacing-hmi-4` | `clamp(0.875rem, 0.8rem + 0.35vw, 1.125rem)` | ~16       |
| `--spacing-hmi-6` | `clamp(1.125rem, 0.9rem + 0.9vw, 1.75rem)`   | ~24       |
| `--spacing-hmi-8` | `clamp(1.5rem, 1.1rem + 1.5vw, 2.5rem)`      | ~32       |

Use these tokens through the `-hmi-N` utilities (`px-hmi-3`, `gap-hmi-2`,
etc.). Never introduce numeric arbitrary values in components.

## Baseline per surface

| Surface                              | Row height | Row padding         | Row gap     |
| ------------------------------------ | ---------- | ------------------- | ----------- |
| Tools rail (`ToolsPalette`)          | 40 px rail | `p-hmi-1` (4)       | `gap-hmi-1` |
| Properties rail                      | 24 px rail | `p-hmi-1`           | `gap-hmi-1` |
| Properties palette body              | 212 px     | `px-hmi-2 py-hmi-1` | `gap-hmi-2` |
| Rules list rows (`setup.rules`)      | 22-24 px   | `px-hmi-4 py-hmi-2` | `gap-hmi-3` |
| Rulesets list rows                   | 24 px      | `px-hmi-3 py-hmi-1` | `gap-hmi-2` |
| Titlebar                             | 32 px      | `px-hmi-3`          | `gap-hmi-2` |
| TopMenuBar                           | 28 px      | `px-hmi-2`          | `gap-hmi-1` |
| Hub headers (Projects, Errors, etc.) | -          | `px-hmi-4 py-hmi-3` | `gap-hmi-2` |
| Empty state (`<EmptyState>`)         | -          | `px-hmi-6 py-hmi-8` | `gap-hmi-3` |
| Sonner toast                         | -          | sonner default      | -           |

Dense compact/comfortable header modes multiply `py-` by 1 (compact) or
1.5 (comfortable) via the `headerDensity` preference in
`useUiPrefsStore`; the tokens themselves do not change.

## Rules for future work

1. Do not add per-component custom spacing values. Extend the token set in
   `src/styles.css` if a new step is genuinely needed.
2. Row height stays within 22-24 px for list surfaces in the Photoshop-like
   editor shell. Hub surfaces (Projects, Cameras, Errors) may go up to 40
   px for a comfortable browse density.
3. All list rows use `divide-y divide-ca-border` for separators; do not
   substitute individual bottom borders.
4. `gap-hmi-2` is the default flex/grid gap; `gap-hmi-3` only for hub
   headers.
5. Any deviation must be tagged with a comment referencing the ticket that
   justifies it, so this doc can grow the exception table.

## Deviations found (as of audit)

None flagged. All shell surfaces (Titlebar, TopMenuBar, Tools rail,
Properties rail, rules/rulesets lists, hub headers, empty state)
consume `-hmi-*` utilities exclusively. Historic ad-hoc values were
swept in v3.551.0 (header) and v3.690.0 (Photoshop compact pass).
