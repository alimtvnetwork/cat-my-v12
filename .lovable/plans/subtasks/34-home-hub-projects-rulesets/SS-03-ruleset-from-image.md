# SS-03: Create rule set from image

Parent: 34-home-hub-projects-rulesets
Slug: ruleset-from-image
Status: pending
Created: 2026-07-15

## Goal

`/projects/$projectId/rulesets/new` where the operator uploads an image,
names the rule set, and lands in the editor with that image as background.
Implements "create rule sets alone based on the image" from the user command.

## Flow

1. Page shows a drop zone (`<input type="file" accept="image/*">`) + name field.
2. On confirm: read file as data URL, call
   `createRuleset(projectId, name, dataUrl)`, then navigate to
   `/projects/$projectId/rulesets/$rulesetId`.
3. Editor route reads `imageRef` from the ruleset and renders it as the
   canvas background. Existing RightRail edits `ruleset.rules` via
   `updateRulesetRules`.

## Non-goals

- No server upload; image is a data URL in localStorage.
- Size guard 4 MB; larger files rejected with a toast.
- No thumbnailing.

## Tests

- Rejects non-image mime and >4 MB.
- After confirm, `selectRulesetsForProject` includes the new id and
  `imageRef` starts with `data:image/`.
