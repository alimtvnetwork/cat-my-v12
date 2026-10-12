# 03 — Components and Interactive States

**Source of truth:** `src/components/**` + `src/styles.css`, verified 2026-10-13.

**The master rule of this system:** hover changes COLOR, BORDER, or SHADOW — never layout, never position, never size. (This was a direct user instruction: menu hover "goes a bit back and forth" → padding must not change on hover. See `08-design-intent-history.md`.) Pressed (`:active`) reduces shadow only — scale transforms are confined to the small inventory in `05-animation-and-motion.md` §5.4 (hero CTA, ad-hoc vision tools, icon/dot embellishments). Canonical HMI surfaces never scale.

**Transition defaults:** `transition-colors` / `transition-all` = Tailwind's 150ms. Canonical HMI surfaces: 120–200ms with `--ease-standard: cubic-bezier(0.2, 0, 0, 1)`.

---

## 3.0 Global button base layer (applies to EVERY `<button>`)

`@layer base` (styles.css ~4514) — this sits underneath all button variants, including `ui/button.tsx`:

```css
button {
  transition:
    box-shadow 180ms cubic-bezier(0.22, 1, 0.36, 1),
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease;
}
button:not(:disabled):not([data-no-lift]):hover {
  box-shadow: 0 6px 18px -8px color-mix(in oklab, var(--ca-primary) 55%, transparent);
}
button:not(:disabled):not([data-no-lift]):active {
  box-shadow: 0 2px 6px -4px color-mix(in oklab, var(--ca-primary) 45%, transparent);
}
```

So: every button gets an accent glow on hover (`0 6px 18px -8px`, primary 55%) and a *smaller* shadow on press (press = shadow reduction, never scale). Disabled buttons and buttons with `data-no-lift` opt out. **A blind AI must know this layer exists** — the per-variant hover classes in §3.1 are only half the story.

---

## 3.1 Buttons

### `ui/button.tsx` (primitive)

Base: `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:size-4`

| Variant | Base | Hover |
|---|---|---|
| default | `bg-primary text-primary-foreground shadow` | `hover:bg-primary/90` |
| destructive | `bg-destructive text-destructive-foreground shadow-sm` | `hover:bg-destructive/90` |
| outline | `border border-input bg-background shadow-sm` | `hover:bg-accent hover:text-accent-foreground` |
| secondary | `bg-secondary text-secondary-foreground shadow-sm` | `hover:bg-secondary/80` |
| ghost | (transparent) | `hover:bg-accent hover:text-accent-foreground` |
| link | `text-primary underline-offset-4` | `hover:underline` |

Sizes: default `h-9` (36px) · `sm` `h-8` · `lg` `h-10` · `icon` `h-9 w-9`. **Hover = opacity fade only (no lift).** The primitive declares no per-variant `active:` class — but the global base layer (§3.0) still gives it the shadow-press. The primitive button never moves.

### `RunButton` (`hmi/RunButton.tsx`) — the primary HMI action

`inline-flex min-h-10 items-center justify-center gap-hmi-2 rounded-md border border-ca-primary bg-ca-primary px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg shadow-hmi-panel transition-colors hmi-focus-ring`

- Hover: `hover:bg-ca-select` — **currently a visual no-op** because `--ca-select` duplicates `--ca-primary` (see `01-color-system.md` TRAP 3). If you fix the `--ca-select` lockstep, this hover becomes a real tint shift.
- Text uses `text-ca-bg`, NOT the `--ca-on-primary` token (inconsistency — new code should prefer `--ca-on-primary` for accent-ink).

### EmptyState actions

- Primary: `bg-ca-select text-ca-bg`, hover → `opacity-90`.
- Secondary: `border border-ca-border bg-ca-panel text-ca-ink`, hover → `border-ca-select bg-ca-panel-2`.
- Both: `focus-visible:ring-2 focus-visible:ring-ca-select focus-visible:ring-offset-2`.

### Setup toolbar buttons (ad-hoc pattern)

- Primary: `px-3 py-1.5 bg-ca-ink text-ca-bg font-semibold rounded text-xs hover:opacity-90 shadow-sm` (inverted: ink background, bg-colored text).
- Secondary: `bg-ca-panel border border-ca-border text-ca-ink font-medium hover:bg-ca-panel-2`.
- Note: these ad-hoc buttons have NO focus/active states — new code should add `hmi-focus-ring`.

---

## 3.2 Cards and tiles

### `ui/card` (primitive)

`rounded-xl border bg-card text-card-foreground shadow`. Header `p-6`, content `p-6 pt-0`. **No interactive states** — it is a static container.

### `ToolTile` (styles.css 1758–1883) — the canonical interactive tile

- Size: 36–72px, default 56px.
- Base: `1px solid var(--ca-border)` · `border-radius: var(--radius-md)` (8px) · `background: var(--ca-panel-2)` · `font-weight: 800`.
- Transition: `background, border-color, box-shadow` over **120ms cubic-bezier(0.2, 0, 0, 1)**.
- **Hover:** `background: color-mix(in oklab, var(--ca-primary) 10%, var(--ca-panel-2))` · `border-color: var(--ca-primary)` · `box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--ca-primary) 55%, transparent)`.
- **Selected:** 22% primary tint + glow + 3px accent stripe via `::before` (gradient `var(--ca-primary) → color-mix(in oklab, var(--ca-primary) 60%, var(--ca-select))`, `0 0 8px` glow). Stripe flips to the bottom edge when the rail docks top/bottom.
- Disabled: `opacity-50 cursor-not-allowed`.

This is the pattern to copy for ANY selectable tile in a new system: 10% tint on hover, 22% tint + stripe + glow on selected, 120ms.

### Home / tool / category tiles

`transition-all cursor-pointer`. Hover → `bg-ca-panel-2` + border shifts toward `ca-ink`/`ca-primary`. Selected → `border-ca-ink ring-1 ring-ca-ink`. Category strip selected → inverted: `bg-ca-ink text-ca-bg font-bold shadow-inner` + bottom notch triangle.

### `SetupTiles` (`app-shell/SetupTiles.tsx`)

Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`, `max-w-6xl` centered. Tile = link card: `rounded-xl border border-ca-border bg-ca-panel p-6 shadow-sm`. Icon badge: `h-10 w-10 rounded-lg bg-ca-primary/10 text-ca-primary`. Title: `text-base font-semibold tracking-tight`. Blurb: `text-sm text-ca-ink-muted`.
**Hover:** `-translate-y-0.5 border-ca-primary/60 bg-ca-panel-2 shadow-md` + glow circle `bg-ca-primary/0 → /10`. (This is the ONE place a lift is allowed — cards, not buttons.) The tile carries `motion-reduce:transform-none motion-reduce:transition-none` (`SetupTiles.tsx:66`) — copy those guards with the lift. The icon badge also does `group-hover:scale-105` with `motion-reduce:transform-none` (`SetupTiles.tsx:72`).
**Gap:** no complete/incomplete/locked states exist on these tiles. If you need them, follow the ValidationChip tone pattern below.

---

## 3.3 Inputs and selects

### `ui/input`

`h-9 rounded-md border border-input bg-transparent px-3 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm`

**No hover style.** Focus = 1px ring. Textarea is identical + `min-h-[60px]`.

### Select

Trigger: same as input + `cursor-pointer`. Content: `rounded-md border bg-popover shadow-md`. Items: `focus:bg-accent focus:text-accent-foreground`, `data-[disabled]:opacity-50`.

### Standard search input (HMI pattern)

Focus swaps the border to `ca-ink` with NO ring. (A deliberate quieter alternative to the ring — use for dense toolbar search fields.)

---

## 3.4 Toggles, switches, checkboxes, sliders

### `ui/switch`

Track: `h-5 w-9 rounded-full border-2 border-transparent shadow-sm transition-colors`, `data-[state=checked]:bg-primary`, `data-[state=unchecked]:bg-input`. Thumb: `h-4 w-4 rounded-full bg-background shadow-lg transition-transform`, checked → `translate-x-4`. **No hover style.**

### `ui/toggle` (toggle button)

`hover:bg-muted hover:text-muted-foreground` · `data-[state=on]:bg-accent`.

### Checkbox / slider

Checkbox: `h-4 w-4 rounded-sm border border-primary`, checked → `bg-primary`. Slider: track `h-1.5 rounded-full bg-primary/20`, range `bg-primary`, thumb `h-4 w-4 rounded-full border border-primary/50`.

### `HeaderDensityToggle` (icon toggle pattern)

`h-8 w-8 rounded-md border border-ca-border/70 bg-ca-panel/60`, hover → `bg-ca-panel-2`, `aria-pressed:bg-ca-primary/15 aria-pressed:text-ca-primary`. Copy this for any icon-only toggle.

---

## 3.5 Pills, badges, chips

### `ui/badge`

`rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors`. default: `bg-primary hover:bg-primary/80` · secondary: `bg-secondary hover:bg-secondary/80` · destructive: `bg-destructive hover:bg-destructive/80` · outline: `text-foreground` (no hover).

### `ValidationChip` (status tone pattern — copy for any status)

Tones: Pass `bg-ca-ok/15 text-ca-ok` · Fail `bg-ca-ng/15 text-ca-ng` · Warn `bg-ca-warn/15 text-ca-warn` · Pending `bg-ca-panel-2 text-ca-ink-muted`. Type: `font-mono text-[10px] font-bold tracking-wider` (uppercase). Hover: `opacity-80`. Focus: `ring-2 ring-ca-focus`.

**The 15% tint rule:** status badges are ALWAYS `color/15` background + full `color` text. Never solid status backgrounds (they vibrate on dark surfaces).

### Chip system (`hmi-chip-hover`)

Hover → `border-color: color-mix(in oklab, var(--chip-glow-tone) 60%, var(--ca-border))` + glow shadow (1px ring at 35% + `0 10px 24px -14px` halo at 60%), 200ms `--ease-standard`. Active → tighter glow. `--chip-active-scale: 0.99` is defined but **never applied** — do not rely on it.

### GlobalNav "Live" pill

`rounded-full bg-ca-ok/15 px-hmi-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-ca-ok` + dot `h-1.5 w-1.5 rounded-full bg-ca-ok animate-pulse`. Nav locked-while-running: `text-ca-chrome-ink/25 cursor-not-allowed`.

---

## 3.6 Modals, drawers, sheets

### Dialog (`ui/dialog`)

- Overlay: `fixed inset-0 z-50 bg-ca-scrim` (flat — scrims are NEVER gradient), `data-[state=open]:fade-in-0` / `closed:fade-out-0`.
- Content: centered, `max-w-lg`, `p-6`, `shadow-lg`, **200ms** `zoom-in-95`/`zoom-out-95` + fade.
- Close button: `absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100`.
- Title: `text-lg font-semibold tracking-tight`.

### Sheet

Overlay: same scrim. Content per-side, **open 500ms / close 300ms ease-in-out**, slide 100% + fade.

### Drawer (vaul)

`fixed inset-x-0 bottom-0 rounded-t-[10px] border bg-background`. Drag handle: `mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted`. Motion is vaul's JS springs — no CSS durations to copy.

### `RunErrorDrawer` (custom right drawer)

Backdrop `bg-ca-viewport/60`. Panel `max-w-md border-l bg-ca-panel shadow-hmi-panel`. Header `bg-ca-ng/10` with title `text-ca-ng uppercase`.

---

## 3.7 Tables, tabs, nav

### Table

Wrapper `overflow-auto`. Row hover `hover:bg-muted/50`, selected `data-[state=selected]:bg-muted`. Head cells `h-10 px-2 text-muted-foreground`.

### Tabs

List: `h-9 rounded-lg bg-muted p-1`. Trigger: `rounded-md px-3 py-1 text-sm font-medium transition-all`, active → `bg-background text-foreground shadow`. **No hover class on triggers** (active state carries the affordance).

### GlobalNav pills

Base: `px-hmi-3 py-1 rounded text-[0.75rem] font-medium transition-colors`. Active: `bg-ca-primary/15 text-ca-primary`. Inactive: `text-ca-chrome-ink/70 hover:text-ca-chrome-ink hover:bg-ca-panel-2`.

### `StandardAppShell` top nav

Active = inverted pill `bg-ca-ink text-ca-bg shadow-sm` (no left border indicator).

### Sidebar drawer links

`hover:bg-ca-panel-2` — **no active styling at all** (gap; if you rebuild, give active links the GlobalNav active treatment).

**Inconsistency to know:** active-item treatment differs per nav surface (inverted pill vs tinted pill vs none). The GlobalNav tinted pill (`bg-ca-primary/15 text-ca-primary`) is the recommended canonical pattern.

---

## 3.8 HMI-specific patterns

- **Machine states:** running = `text-ca-ok`/`bg-ca-ok` + pulsing LED dot · idle = plain "RUNNING"/"IDLE" text · fault/NG = `--ca-ng` 10–15% tints · warn = `--ca-warn`. No e-stop styling exists.
- **LEDs:** `h-1.5 w-1.5` or `h-2.5 w-2.5 rounded-full` dots; running adds `animate-pulse`. There is NO fault-flash / LED blink system — only generic pulse/ping status dots.
- **StatusLog rows:** `min-h-10 hover:bg-ca-panel-2 transition-colors` + severity dots.
- **Touch targets:** `min-h-10` (40px) HMI buttons, 36–72px tiles (default 56), ≥32px panel controls; exception: 24px canvas quick-action buttons.

---

## 3.9 Checklist for a blind AI (components)

- [ ] Hover never changes layout, position, or size (exceptions: SetupTiles cards may lift `-translate-y-0.5`; see the scale inventory in `05` §5.4).
- [ ] Pressed state = shadow reduction only; `scale` transforms appear only in the `05` §5.4 inventory (hero CTA, ad-hoc vision tools, icon/dot embellishments).
- [ ] Status badges always `color/15` bg + full-color text; uppercase mono 10px bold.
- [ ] Every interactive element has a `:focus-visible` style (cyan `--ca-focus-ring`).
- [ ] Disabled = opacity 40–55% + `cursor-not-allowed` + `pointer-events-none`; hover gated off.
- [ ] Selected tiles: 22% primary tint + 3px accent stripe + glow; hover tiles: 10% tint.
- [ ] Dialog scrims are flat `var(--ca-scrim)`; dialog content enters with 200ms fade + zoom-95.
