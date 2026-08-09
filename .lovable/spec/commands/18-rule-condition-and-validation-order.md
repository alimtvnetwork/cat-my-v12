# Command 18, rule conditions, dense-color, validation order

Scope: editor rule model (schema + UI) and the Python processing
pipeline that consumes rules.
When it applies: any circular or rectangular rule created via the
canvas + layers editor.

Command verbatim (user, paraphrased for clarity, no logic changed):

> When we have a rectangle or circle selection, the controller for
> that drawn rule should carry the extra decisions we make about it:
>
> 1. Match mode: "same image" (find the same pixels we saved when the
>    rule was defined) vs "present / absent" (is the target present
>    or absent inside that region).
> 2. Color intent: describe the target color(s) so Python can act on
>    them: current color, dense color (2-level, 3-level), or picked
>    color from inside the region.
> 3. Extra conditions: an "add condition" plus button inside each
>    rule to stack more checks (color, presence, more).
> 4. Reorder: the layer list must let us drag-drop to change order.
> 5. Validation execution: choose per ruleset between parallel (the
>    default, all rules run at once) and sequential (run in list
>    order, next rule only runs if the previous passes). Both modes
>    must exist.
>
> Write this into the app spec first, then implement the UI in enough
> detail that any future AI can read it and understand.

Rule for planning: spec first, then UI. UI must be detailed, not
handwaved.

Related capture:

- spec/21-app/16-processing-pipeline.md (existing processing model)
- spec/21-app/17-parallelism-guarantees.md (existing parallel guar.)
- .lovable/spec/commands/10-photoshop-layers-and-drag-drop.md
- .lovable/spec/commands/17-code-quality-enums-constants.md
