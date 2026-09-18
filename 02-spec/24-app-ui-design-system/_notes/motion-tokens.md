# Deep-Dive: Motion + Easing Tokens (Plan 30 Step 23)

**Version:** 1.0  
**Updated:** 2026-07-14  
**Depends on:** `01-foundations.md`, `_notes/foundations-color-delta.md` (gap #6).  
**Blocks:** step 36 canvas/controller implementation.

---

## Tokens landed in `src/styles.css` (`@theme inline` block)

### Duration

| Token              | Value   | Use                                                             |
| ------------------ | ------- | --------------------------------------------------------------- |
| `--motion-instant` | `0ms`   | State swaps that must feel synchronous (selection, tool switch) |
| `--motion-fast`    | `120ms` | Hover, focus ring, small toggles                                |
| `--motion-base`    | `200ms` | Default: popover, dropdown, kind-switch, tab change             |
| `--motion-slow`    | `320ms` | Modal enter, drawer, route transition                           |

### Easing

| Token               | Curve                        | Use                                 |
| ------------------- | ---------------------------- | ----------------------------------- |
| `--ease-standard`   | `cubic-bezier(0.2, 0, 0, 1)` | Default for all UI motion           |
| `--ease-emphasized` | `cubic-bezier(0.3, 0, 0, 1)` | Modal enter, primary CTA feedback   |
| `--ease-in`         | `cubic-bezier(0.4, 0, 1, 1)` | Exit only                           |
| `--ease-out`        | `cubic-bezier(0, 0, 0.2, 1)` | Enter only, when not using standard |

---

## Usage rules

1. Never write raw `ms` or `cubic-bezier(...)` in components or routes. Use the tokens.
2. Canvas per-frame animations (pan, zoom inertia) do NOT use these tokens — they are RAF-driven and governed by the 16 ms budget in `03-canvas.md`.
3. `prefers-reduced-motion: reduce` MUST collapse all four duration tokens to `--motion-instant` at the shell root. Owned by step 36 impl.

## Housekeeping status

- **FIX-B1:** resolved at v3.31.0. `04-rule-layers.md` uses `R-1..R-10`.
- **FIX-B2:** resolved at v3.31.0. `08-testing.md` uses `C/R/K/S/E`.
- **FIX-F1:** resolved at v3.31.0. `00-overview.md` front-matter now matches project v3.31.0.

## Regression guards (added on top of foundations-delta guards)

- `rg -nE "\b\d+ms\b" src/components src/routes` → 0 hits (must all resolve to `var(--motion-*)`).
- `rg -n "cubic-bezier" src/components src/routes` → 0 hits.
