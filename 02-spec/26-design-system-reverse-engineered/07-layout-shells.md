# 07 — Layout Shells

**Source of truth:** `src/components/hmi/HmiShell.tsx`, `src/components/layout/StandardAppShell.tsx`, `src/components/app-shell/**`, `src/styles.css`, verified 2026-10-13.

---

## 7.1 Two co-existing shells (CSS-gated by `body:has()`)

### `HmiShell` (`hmi/HmiShell.tsx`, `data-app-shell="true"`)

Vertical stack:
1. **Titlebar** — sticky, z-40, chrome gradient (see `04` G1).
2. **HMI title section** — `h-9` (36px): page title + `FavoritesBar` + header actions.
3. **`main#app-main`** — page content.
4. **Optional ActionBar**.
5. **StatusBar footer** — `h-8` (32px) via `--status-bar-h`, `bg-ca-chrome`.

Titlebar inner row height: `var(--header-h)` = **40px** (compact density: 32px).

### `StandardAppShell` (`layout/StandardAppShell.tsx`, `data-standard-shell="true"`)

1. **Header** — `h-11` (**44px**), `bg-ca-panel`, bottom border, z-30. Contents: pulsing emerald dot + `"CAT iVision HMI"` mono brand (left); horizontal nav Home/Project/Setup/Rules/Test/Run/Settings with `h-3.5 w-3.5` icons (center); right cluster: `UiModeSwitch`, divider, `ThemeToggle`, `WindowMenu`.
2. **Optional page-header bar** — `bg-ca-panel-2 px-4 py-2`, title `text-sm font-bold uppercase tracking-wide`.
3. **Main** — fills remaining space.

Root: `flex h-screen min-h-0 flex-col overflow-hidden bg-ca-bg text-ca-ink`.

**Unverified:** the full route→shell mapping (which routes render in which shell). `StandardAppShellNav.tsx` is unreferenced dead code (no imports anywhere). If you rebuild, pick ONE shell per surface and do not mix chrome heights.

### z-index ladder

floating panels 60 > titlebar 40 > header 30. (`StandardAppShellNav` would sit at 50 but is unreferenced dead code.)

---

## 7.2 Editor workspace shell

`.editor-shell-grid`:

```
grid-template-rows:    72px 1fr 42px
grid-template-columns: 98px 1fr 432px
```

Responsive rail: 768–1439px → 64/88px rail · 560–767px → 56/64px · ≤559px → rail becomes a **78vw overlay**.

### Docking model (`app-shell/panels/`)

- Dock regions: left / right / top / bottom.
- Default sizes: left **52** (fixed — confirmed `DockSlot.tsx:124`); right 360, top 96, bottom 220 — **unverified in source, treat as nominal**.
- Minimums: left 52 (confirmed); right 160, top 84, others 200; maximum 800 — **unverified, treat as nominal**.
- `PanelChrome` titlebar: 36px (24px left dock, 28px top dock). `ChromeControl`: 32×32 hit targets, 18px glyphs.
- MinimizedRail: 40px.
- Floating panels: `fixed`, min-width 240px, z-60, `var(--elevation-2)`.

(This docking model came from a direct user instruction: panels should be "like a Photoshop control, layer control" — minimizable and detachable. See `08`.)

---

## 7.3 Breadcrumb (`app-shell/AppBreadcrumb.tsx`)

Two variants: **Band** (full strip) / **Inline** (28px titlebar sub-row, `sm:flex` only).

- Height: `var(--header-crumb-h)` = **24px** (compact: 22px).
- Crumbs are pill chips: `border: 1px solid var(--ca-border); border-radius: 999px; min-height: 1.5rem; font-weight: 600; padding: 0 0.5rem; max-width: min(15rem, 28vw); background: color-mix(in oklab, var(--ca-panel) 82%, transparent)`.
- Separators: `ChevronRight` at `size={12}`.
- Current page: `background: color-mix(in oklab, var(--ca-primary) 18%, var(--ca-panel)); border-color: color-mix(in oklab, var(--ca-primary) 55%, var(--ca-border)); color: var(--ca-chrome-ink); font-weight: 700;` + `aria-current="page"`.
- More than 5 crumbs collapse into a `MoreHorizontal` popover.
- Every page also gets a browser-like **Back button** (user instruction — see `08`).

---

## 7.4 Responsive rules

Tailwind v4 defaults (no overrides): sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536.

- <640px: docks stack vertically, rails pin to top, resize handles hidden.
- <768px: breadcrumb compacts.
- ≥900px: editor keyboard hints appear.
- Top nav collapses into a drawer (`w-64` Radix Sheet) via an `lg:hidden` FAB.
- `SetupTiles`: 1 → 2 → 4 columns (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`).
- Home cards: 1 → 2 columns at `lg`. Aside: 360px at `xl`.
- No explicit `html` font-size is set — 16px default; all sizing flows through the fluid `clamp()` tokens in `02`.

---

## 7.5 Checklist for a blind AI (layout)

- [ ] One shell per surface; do not mix HmiShell (40px titlebar row) and StandardAppShell (44px header) chrome.
- [ ] Editor grid is `72px 1fr 42px` × `98px 1fr 432px`; docks left 52 (fixed) / right 360 / top 96 / bottom 220.
- [ ] Breadcrumb: 24px pill chips, current page = 18% primary tint + 700 weight + `aria-current="page"`.
- [ ] Every page has a Back button; >5 crumbs collapse.
- [ ] z-index: floating 60 > titlebar 40 > header 30.
