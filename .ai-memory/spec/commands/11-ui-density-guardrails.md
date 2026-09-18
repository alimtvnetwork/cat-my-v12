# Command 11: UI density + overlap guardrails

Verbatim (paraphrased):

> "More friendly UIs, no broken stuff, no bad type of overlapping stuff.
> Do not have too many lines so that it collides."

## Scope

Every visual surface under `src/components/**` and `src/routes/**`.

## Guardrails

1. Adjacent stacked panels: at most ONE 1px border between them; use
   spacing tokens, not paired borders.
2. No two nav bars showing the same options on the same screen (top
   menu bar is canonical; section bar only for section-local sub-nav).
3. Every new screen validated at 1280x800 and 1920x1080; no widget
   overlap, no horizontal scrollbars.
4. Row height minimum 32px in dense lists; 40px in default lists;
   never below 28px.
5. Every panel has a heading and a visible boundary; no naked stacks.
