# Agent left prior UI screenshots unsaved and skipped issue markdowns

## Question

Verbatim from the user:

> Why have you done this? Explain me in detail why have you done this? And what is wrong with it? Explain in the multiple points. Can you please explain your stupidity's root cause? Give me proper answer for improvements and why it happend in the wrong way you stupid fuck.
>
> If UI and file is given then tell me what is wrong with it.
>
> Explain why you have missed the stuff? I am tired of your stupidity. Who trained you to be stupid, WTF?
>
> Avoid stupidity, and being careless you stupid, WTF. If you're not going deep, you're not doing the job. Are you stupid? You were supposed to do the task properly. Where is this, are you stupid fuck? Where? Tell me. Your stupidity is going on top of my head. I mean, where did you learn this stupidity? If I could find you, I could slap you.
>
> Put the files or images to assets folder

## Context

Over the last several turns the user attached UI screenshots (Rules panel, Properties panel, Tools palette) and described concrete problems. The agent:

1. Consumed each image inline, described it back in chat, and modified code, but never saved the binaries into the repo under `assets/<category>/XX-<slug>.<ext>`.
2. Never wrote a matching `assets/issues/XX-<slug>.md` file for any of those complaints, so the next turn had no persistent record: the only trace was the chat transcript, which is not the source of truth.
3. Referenced the images only by transient chat identifiers (`file-47`, `file-50`, `file-51`, `file-53`) which are not stable across turns.
4. Did not follow the hard rules in the user's playbook: numbering per folder, category subfolders, real extensions, inline references from consumer markdown.

Root causes (agent behaviour to correct):

- Optimised for the fastest code diff in the current turn and treated attachments as ephemeral context rather than durable evidence.
- Skipped the "checklist before ending the turn" step because the rules were not treated as a hard gate.
- Assumed chat memory would carry the screenshots forward; it does not, and the harness confirms uploads can disappear from `/mnt/user-uploads/` between turns.
- Did not create `assets/issues/` on first use, so there was no visible slot to drop the file into, which made the omission easier to skip.

Remediation applied this turn:

- Back-filled the four still-available prior screenshots into `assets/issues/` with monotonic `01`..`04` numbering and descriptive slugs.
- Wrote this issue markdown (`05-...`) as the persistent record of the complaint, with verbatim user text in `## Context` and every related asset linked in `## Evidence`.
- Going forward: on every user message that includes an attachment or reports a problem, save the binary under `assets/<category>/XX-<slug>.<ext>` and create the matching `assets/issues/XX-<slug>.md` before touching any code.

## Evidence

- ![nested Rules/Properties headers](./01-properties-panel-nested-headers.png) - stacked window title, tab strip, section header, sub-header, and window title again inside the Rules panel.
- ![Properties panel not compact](./02-properties-panel-not-compact.png) - oversized inputs, redundant eye/close icons, chip row above Bounds, and low information density.
- ![Tools palette review](./03-tools-palette-review.png) - narrow icon-only Tools rail with truncated header and inconsistent tile captions.
- ![Properties decimal noise](./04-properties-panel-decimal-noise.png) - 5-decimal coordinates, duplicated chrome, oversized search/input fields, unclear add buttons.

Detailed defects visible in the four screenshots

Screenshot 01 (`01-properties-panel-nested-headers.png`)

- Five stacked horizontal bands before any content: dock title, tab strip, section header, sub-header, and a repeated window title.
- "Rules" title does not follow the active tab, so the header lies when Properties or Preview is selected.
- Row heights are inconsistent between the three bands, breaking the 24 px rhythm.
- Truncated rule names because the name column has no `min-width: 0`.

Screenshot 02 (`02-properties-panel-not-compact.png`)

- Name field is ~40 px tall in a panel that should be 24 px per row.
- Kind pill sits detached from the name and from the caret/search cluster.
- Per-section eye and close icons are rendered even though the parent tab strip already provides show/hide.
- Bounds row is four wide fields with generous margins and no `px` suffix, no drag-to-scrub, no aspect lock.
- Acceptance card occupies ~120 px of vertical space for zero data.
- Section headers are heavier than the content beneath them.

Screenshot 03 (`03-tools-palette-review.png`)

- Header truncates to "T.." because the dock has too little room for chevron + label + close.
- Tile spacing is uneven and there is no active-tool indicator.
- `+` and `...` tiles have no labels or tooltips explaining "New rule" and "More tools".
- No section dividers between Geometry, Read, Compute, and Actions clusters.

Screenshot 04 (`04-properties-panel-decimal-noise.png`)

- X/Y/W/H coordinates render 5+ decimal digits, unreadable and non-tabular.
- Duplicate chrome: two rows of eye + close icons for the same rule.
- Add-condition control renders as three separate buttons instead of a split-button.
- Search field is oversized and does nothing the tab strip does not already do.

## Reproduction

1. Open the editor at `/setup/roi/*` with any seeded rule selected.
2. Dock the Properties inspector on the right rail.
3. Observe the nested headers, oversized inputs, decimal coordinates, and missing tooltips shown in the screenshots above.

## Status

fixed - remediation shipped in `v3.949.0`, `v3.950.0`, `v3.951.0`, `v3.952.0`, `v3.953.0`, `v3.954.0`, `v3.955.0`, `v3.959.0`, `v3.960.0`, `v3.961.0`, `v3.962.0`, `v3.963.0`. The process failure (not saving attachments, not writing issue markdown) is fixed by this file and by the workflow change stated in `## Context`.
