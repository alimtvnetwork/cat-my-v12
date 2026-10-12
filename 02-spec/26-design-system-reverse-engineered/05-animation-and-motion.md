# 05 — Animation and Motion

**Source of truth:** `src/styles.css` keyframes + `tw-animate-css` v1.3.4 (imported globally) + component usage, verified 2026-10-13.

---

## 5.1 Motion tokens

```css
--motion-fast: 120ms;   /* micro: hover, focus */
--motion-base: 200ms;   /* default: popover, toggle */
--motion-slow: 320ms;   /* nominal: modal/drawer/route */
--ease-standard:   cubic-bezier(0.2, 0, 0, 1);
--ease-emphasized: cubic-bezier(0.3, 0, 0, 1);
--ease-in:         cubic-bezier(0.4, 0, 1, 1);
--ease-out:        cubic-bezier(0, 0, 0.2, 1);
```

**Inconsistencies to know:**
- `--motion-slow` is documented as 320ms for "modal/drawer/route", but implementations actually use 200ms (dialog), 300ms (sheet close), 500ms (sheet open), 220ms (view transitions). Treat 320ms as nominal, not literal.
- `ui/*` primitives use bare Tailwind `transition-colors`/`transition-all` (150ms default) — NOT pinned to `--motion-*`/`--ease-*` tokens. The tokens govern the HMI layer; the primitives predate them.

---

## 5.2 All `@keyframes` in styles.css (7 total — this is the complete list)

| # | Name | What it does | Duration / timing | Used by |
|---|---|---|---|---|
| 1 | `hmi-focus-ring-in` | halo entry: outline transparent → `var(--ca-focus-ring)`, shadow 0 → halo | 180ms ease-out | `:focus-visible` via `hmi-focus-ring` |
| 2 | `ca-motion-panel-in` | `opacity 0→1`, `translateY(4px→0)` | **160ms** `cubic-bezier(0.22,1,0.36,1)` `both` | floating / properties panel reveals |
| 3 | `ca-motion-toast-in` | `opacity 0→1`, `translateY(8px→0)`, `scale(0.98→1)` | **160ms** same curve | all toasts |
| 4 | `hmi-frame-scan` | scanline `translateY(0→436px)` | **1.6s linear infinite** | `MachineFrame.tsx` SVG rect 1200×3px, primary at 0.55 opacity, only when `live` |
| 5 | `editor-ripple` | `scale(0.6→1.6)`, `opacity(0.85→0)` | `animate-[editor-ripple_650ms_ease-out_forwards]` | selection/validation pulse ring |
| 6 | `ca-scroll-x` | `scaleX(0→1)` on a 2px accent gradient underline via `animation-timeline: scroll(nearest)` | — | **zero consumers — defined but unused** |
| 7 | `ca-skeleton-pulse` | `opacity 1→0.55→1` | **1.4s ease-in-out infinite** | `.ca-skeleton` (`background: color-mix(in oklab, var(--ca-panel-2) 78%, var(--ca-panel))`) |

Notes:
- Keyframe 5 (`editor-ripple`): one usage lacks the `motion-safe:` guard — an inconsistency; new code should always gate decorative animation with `motion-safe:`.
- Keyframe 1 and 7 are killed under `prefers-reduced-motion` (see §5.6).

---

## 5.3 tw-animate-css (v1.3.4, global import)

- Base `.animate-in` / `.animate-out` = **150ms ease** enter/exit.
- Dialog content: `duration-200` → 200ms fade + `zoom-95`.
- **Sheet: open 500ms / close 300ms ease-in-out**, full-axis slide + fade.
- Menus / popovers / tooltips / select: 150ms fade + zoom-95 + 8px side-aware slide.
- Accordion: `animate-accordion-down/up` = 200ms ease-out.
- OTP caret: `caret-blink 1.25s ease-out infinite` (overridden to 1000ms in one place).
- `animate-spin` = 1s linear infinite (~18 usages: `Loader2` 12–20px icons; one border spinner `w-4 h-4 border-2 border-ca-bg border-t-transparent rounded-full`).
- `animate-pulse` = 2s infinite (16 usages: Live dots, brand dot, skeletons).
- `animate-ping` = 1s infinite (2 usages: analyzing dot, active-run dot).

---

## 5.4 Transitions across components

- Global `button` base: `box-shadow 180ms cubic-bezier(0.22,1,0.36,1)`, `background-color/border-color/color 160ms ease`. Hover adds an accent glow: `0 6px 18px -8px` primary at 55%. `:active` shrinks the shadow (press = shadow-only on canonical surfaces). Full values in `03-components-and-interactive-states.md` §3.0.

### Scale inventory (complete — the ONLY scale transforms in the system)

Canonical HMI surfaces never scale. Scale is confined to these:

| # | Site | Classes | Context |
|---|---|---|---|
| 1 | `routes/projects/$projectId/trial-run.tsx:222` | `hover:scale-105 active:scale-95` | **Sanctioned hero CTA** — the one deliberate exception (see `06` §6.3) |
| 2 | `components/vision/standard/ToolTitleBar.tsx:49` | `active:scale-95` | ad-hoc vision-standard tool |
| 3 | `components/vision/standard/tools/pattern-matching/PatternMatchFooter.tsx:16` | `active:scale-[0.99]` | ad-hoc vision-standard tool |
| 4 | `components/vision/standard/tools/pattern-matching/PatternMatchResultCard.tsx:323` | `active:scale-[0.99]` | ad-hoc vision-standard tool |
| 5 | `components/vision/standard/tools/pattern-matching/PatternMatchResultCard.tsx:378` | `active:scale-[0.99]` | ad-hoc vision-standard tool |
| 6 | `components/vision/standard/tools/pin1-config/Pin1Footer.tsx:28` | `active:scale-[0.99]` | ad-hoc vision-standard tool |
| 7 | `components/rules/properties/SwatchesPane.tsx:32` | `hover:scale-110` | swatch embellishment |
| 8 | `components/vision/CaptureTriggerButton.tsx:60` | `hover:scale-105` | capture button embellishment |
| 9 | `components/app-shell/SetupTiles.tsx:72` | `group-hover:scale-105` + `motion-reduce:transform-none` | tile icon badge |
| 10 | `components/hmi/titlebar-parts.tsx:44` | `group-hover:scale-110` | titlebar status dot |

**Rule for a blind AI:** do not add scale transforms to HMI surfaces. The sanctioned uses are #1 (hero CTA) and small icon/dot embellishments (#7–#10, always with `motion-reduce` guards where present). The vision-standard `active:scale-[0.99]` instances (#2–#6) are ad-hoc — do not propagate them.
- ToolTile: 120ms `--ease-standard` on background/border-color/box-shadow.
- Chips: 200ms `--ease-standard`.
- Focus ring: 180ms entry.
- Editor shell collapse: 200–260ms in / 140–200ms out.
- Accordion chevron: 200ms. Tooltips: 150ms opacity.
- Image-history hover scrim: `transition-opacity`.
- `ZoomableCanvas` transform layer: `transition-transform duration-75`.
- ROI overlay resize: `transition-all duration-75`.

**The motion personality in one sentence:** fast (120–200ms), decelerating curves, small distances (4–8px), opacity-led. Nothing bounces, nothing overshoots, nothing scales on press.

---

## 5.5 Loading patterns

- **Spinners:** Lucide `Loader2` + `animate-spin`. No standard size token — 12–20px chosen contextually.
- **Skeletons:** canonical `.ca-skeleton` (1.4s pulse, panel-2/panel mix background). Legacy `ui/skeleton` still uses `animate-pulse bg-primary/10` — prefer `.ca-skeleton` in new code.
- **Reduced-motion:** skeleton holds at 0.75 opacity instead of pulsing.

---

## 5.6 Route transitions and reduced motion

- **View Transitions** are declared (`::view-transition-old/new(root)`, 220ms `--ease-standard`) but `document.startViewTransition()` has **zero call sites** — likely never runs. Do not depend on it.
- **`prefers-reduced-motion` global kill switch:** all motions collapse to 1ms, `transform: none !important` on hover/focus/active, scanline killed. Animation utilities self-gate; `useReducedMotion()` hook exists for JS-driven sequences.
- **No fault-flash / LED blink system exists** — status is communicated with generic pulse/ping dots only.

---

## 5.7 Checklist for a blind AI (motion)

- [ ] Durations: 120ms micro · 150–200ms default · 500/300ms sheet open/close · 1.4s skeleton · 1.6s scanline · 2s pulse.
- [ ] Easings: `--ease-standard: cubic-bezier(0.2, 0, 0, 1)` default; entry curve `cubic-bezier(0.22,1,0.36,1)`.
- [ ] No scale on press on canonical surfaces; scale appears only in the §5.4 inventory (hero CTA, ad-hoc vision tools, icon/dot embellishments).
- [ ] Gate decorative animation with `motion-safe:`; honor `prefers-reduced-motion` (1ms collapse).
- [ ] Only 7 keyframes exist — do not invent an 8th without a component that needs it.
