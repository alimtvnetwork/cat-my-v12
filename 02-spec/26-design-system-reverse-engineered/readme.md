# 26 — Design System Reverse-Engineered (As-Built)

**Status:** Active
**Reverse-engineered from:** `src/styles.css` (4,974 lines) + `src/components/**` on branch `fix/4-oct-26-joy-optimization-and-project` (YeasinKabirJoy's "industrial dashboard UI" pass, HEAD `96ecea35` "UI fixed v1", 2026-10-10). "Yasin" (user's name for him) = git author YeasinKabirJoy <yeasinjoy16@gmail.com>.
**Date:** 2026-10-13
**Audience:** Any AI — including a low-grade, "blind" AI with no access to the running app. If you read every file in the order below, you will be able to recreate this design system on ANY system, not just this one.

---

## What this folder is

This is a **forensic specification of the design system as it actually exists in the code** — every color, hover state, gradient, animation, preview pattern, and layout shell, with exact values. It is not a proposal. It does not invent values. Where the source is silent, it says so.

It complements (does not replace):

- `02-spec/07-design-system/` — the older generic "AI-Adaptable Design System" (aspirational; prefers LESS; 8 theme families). That folder describes what the system *should* be in general. This folder describes what the industrial HMI *is* in code.
- `02-spec/24-app-ui-design-system/` — the UI-improvements tracker (V2 dictation, V3 status matrix, acceptance checklists). Read `08-design-intent-history.md` here for the summarized "why" behind the visuals.

## Blind-AI reading contract

Read in this exact order. Do not skip. Each file builds on the previous one.

1. `01-color-system.md` — every token, both themes, the accent reskin mechanism, the naming inversion trap.
2. `02-typography-spacing-radius-elevation.md` — type scale, spacing, radius, shadows, focus rings.
3. `03-components-and-interactive-states.md` — buttons, cards, inputs, toggles, pills, modals, tables, nav: base, hover, focus, active, disabled.
4. `04-gradient-effects.md` — every gradient in the system (there are no gradient tokens; all are ad-hoc).
5. `05-animation-and-motion.md` — all 7 keyframes, motion tokens, transition conventions, loading patterns, reduced motion.
6. `06-preview-mechanisms.md` — camera preview, conveyor/simulation preview, trial-run preview, image preview, the 4 ROI idioms.
7. `07-layout-shells.md` — the two app shells, editor grid, docking model, breadcrumb, responsive rules.
8. `08-design-intent-history.md` — the user instructions that shaped the UI (V1 redesign, V2 dictation, V3 fluid-modern), so you understand *why*.
9. `09-injecting-into-any-system.md` — the portable recipe: how to apply this design system to a completely different codebase.
10. `97-blind-ai-verification-checklist.md` — the self-test. Run through it after implementing; every box must be checkable.

## The 10 facts you must internalize before touching anything

1. **Dark-first industrial.** The aesthetic is "Modern Dark Industrial". The `:root` block holds DARK values for `--ca-*` tokens; light overrides live under `html.light`. (Shadcn `--background` etc. use the classic `:root`=light / `.dark`=dark split — the two systems are inverted relative to each other. See `01-color-system.md`.)
2. **All colors MUST use oklch format** (repo rule). Documented exceptions: toast tokens use HSL triples; functional rainbow color-picker swatches use hex; canvas-drawn overlays use hex/rgba.
3. **One accent variable rules everything:** `--ca-primary: oklch(0.62 0.24 300)` (purple). Reskinning = editing this one value. 149 `color-mix(in oklab, var(--ca-primary) …)` derivations. Always `in oklab` — never `in srgb`, never `in oklch`.
4. **No `--ca-danger` exists.** The danger/fail token is `--ca-ng` (`oklch(0.68 0.22 25)`).
5. **Hover = color/shadow change, never layout change.** Buttons hover via opacity or tint fades (150–200ms), plus a global accent glow from the `@layer base` button rule (`03` §3.0). Pressed state = shadow reduction only — `scale` transforms are confined to the 10-site inventory in `05` §5.4 (hero CTA, ad-hoc vision tools, icon/dot embellishments); canonical HMI surfaces never scale.
6. **There are zero hover-gradient shifts.** Gradients are static decoration; hover animates container opacity or solid colors.
7. **There is no gradient text** (`bg-clip-text` has zero matches) and no primary-button gradient. Buttons are flat accent + `color-mix` tints.
8. **Focus is always visible:** 2px `var(--ca-focus-ring)` (cyan) outline, offset 2px, plus halo shadow, 180ms entry animation, zero layout shift.
9. **Disabled = opacity reduction only** (`opacity-40`–`opacity-55` + `cursor-not-allowed`); hover is gated off with `:not(:disabled)`.
10. **Never invent values.** If this spec says "not specified in source", do not guess. Ask, or leave it unset.

## Known traps (read before implementing)

- `--ca-select` duplicates `--ca-primary`'s purple value. The `RunButton` hover (`hover:bg-ca-select`) is a visual no-op. Reskinning `--ca-primary` alone leaves selection highlighting purple.
- `--ca-accent` is **used but never defined** — it always falls back to hex `#2563eb`. A parallel orphan accent.
- `--ca-fg` is **used once** (`@utility log-row`) but never defined — inherits.
- `--shadow-hmi-glow` hardcodes a blue halo that will not follow an accent reskin.
- `--font-hmi-display` and `--text-hmi-h3` are used but never declared — they fall back silently.
- The stylesheet titlebar gradient and the inline Tailwind glass gradient specify different stops; the live winner is unverified.
- View Transitions are declared but `document.startViewTransition()` has zero call sites — likely never runs.
- Two shells coexist (`HmiShell` and `StandardAppShell`); the full route→shell mapping is unverified.

Full details for each trap live in the numbered files and the checklist.
