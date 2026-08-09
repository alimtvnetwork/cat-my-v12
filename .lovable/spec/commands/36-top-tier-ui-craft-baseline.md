# Command 36 — Top-tier UI craft baseline

Scope: every UI touch across the app (hubs, editors, palettes, dialogs,
empty states, error surfaces). Applies to all future UI plans until
superseded.

## Command (verbatim intent from Alim, 2026-07-19)

"The UI needs to be top level. It should look like it's done by the top of
the people in the industry. Take your time, do some brainstorming with the
UI, where it can be better, how it can be better. Use proper padding,
combine buttons, use logos, use proper tooltips so that it feels very nice.
The UI is always needs to be simple. Too many options in one section can
actually cloud people's judgment."

## Rules

1. Fewer, larger, better: prefer 3 well-labeled controls over 8 crowded
   ones. Move rarely used actions into overflow menus, not the primary row.
2. Padding: panel headers `px-4 py-3`; body containers `p-3` or `p-4`;
   never `p-1`/`p-2` at panel level. Row density: 28-32px for dense
   editor rails, 36-40px for main content rows.
3. Buttons: combine related actions into segmented controls or split
   buttons. Never place two identical primary buttons side by side.
4. Tooltips: every icon-only button MUST have a Radix tooltip with name +
   one-line description + shortcut (if any); 300ms delay; keyboard shows
   on focus.
5. Logos and iconography: every hub, empty state, and dialog header gets
   a domain-appropriate icon or logo mark. Never use `Sparkles` as brand.
6. Typography: 13px tabular-nums for numeric badges; 13px for menu labels;
   14px for body; 16-20px for hub headlines. Distinctive display pair (no
   default Inter/Poppins).
7. Colors: only semantic tokens from `src/styles.css`. No hardcoded
   `text-white`, `bg-black`, `bg-[#...]`.
8. Seeding: every screen must have visible data on first boot. Empty
   states are for genuinely empty user data, never for "we forgot to
   seed." Seeding routes exclusively through facades.
9. Errors: every failure MUST go through `showToastError` +
   `useErrorStore.captureException`. Never a silent fallback.
10. Simplicity gate: before shipping a screen, ask "can I remove three
    things and still deliver the job?" If yes, remove them.

## Applies to

All plans from Plan 83 onward. Plan 82 items still open inherit these
rules retroactively.
