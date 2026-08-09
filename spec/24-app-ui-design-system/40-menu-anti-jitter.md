# 40 - Menu Anti-Jitter Contract

**Version:** 1.0
**Owner:** Plan 64 step 42
**Depends on:** `01-foundations.md`, `10-navigation-shell.md`, issue `17-menu-hover-jitter-and-padding.md`.

---

## Purpose

The top-nav and every context menu MUST NOT resize or reposition on hover. Layout shift on hover is the direct cause of issue 17 and makes rapid mouse-over exploration painful.

## Tokens

Added to `src/styles.css` under the theme block:

```css
:root {
  --menu-item-px: 12px; /* horizontal padding, applied at rest AND hover */
  --menu-item-py: 8px; /* vertical padding, applied at rest AND hover */
  --menu-item-h: 36px; /* fixed line-height + padding target */
  --menu-item-radius: 6px;
  --menu-gap: 4px; /* gap between items in the same menu */
}
```

Every menu item component uses these tokens. Overriding at the component level is forbidden (lint rule tracked in `.lovable/coding-guidelines/coding-guidelines.md`).

## Forbidden animations

At hover / focus / active, menu items MUST NOT change:

- `padding`, `margin`, `width`, `height`, `border-width`, `outline-width`, `font-size`, `letter-spacing`, `transform: scale`, `transform: translate` (except the running-pill drag).

Allowed animations on hover:

- `background-color`, `color`, `box-shadow`, `border-color` (with equal border-width at rest), an underline pseudo-element whose `width` grows from 0 to 100% (the pseudo-element is `position: absolute` inside a fixed-size box).

## Component contract

- `<MenuItem>` in `src/components/app-shell/MenuItem.tsx` is the ONLY primitive used by top-nav, breadcrumb dropdowns, running-pill dropdown, context menus. Radix DropdownMenu items compose it.
- Item DOM shape:
  ```
  <button class="menu-item">
    <span class="menu-item__label">...</span>
    <span class="menu-item__accent" aria-hidden />
  </button>
  ```
- `.menu-item` has `display: inline-flex; align-items: center; height: var(--menu-item-h); padding: 0 var(--menu-item-px); border-radius: var(--menu-item-radius); position: relative;`.
- `.menu-item__accent` is the underline pseudo-target: `position: absolute; left: var(--menu-item-px); right: var(--menu-item-px); bottom: 4px; height: 2px; background: currentColor; transform: scaleX(0); transform-origin: left; transition: transform 120ms ease-out;`. Hover flips to `scaleX(1)`.

## Verification

- Playwright: hover every top-nav item; assert `boundingRect.width` and `boundingRect.height` are identical to the pre-hover values (tolerance 0 px). Also asserts total header CLS on hover < 0.01 (see `10-navigation-shell.md`).
- CSS lint: a small script under `linter-scripts/check-forbidden-strings.py` fails when any `.menu-item:hover` block sets a forbidden property.
- Snapshot test: `getComputedStyle(item).padding` equals the rest padding after `hover` state.
