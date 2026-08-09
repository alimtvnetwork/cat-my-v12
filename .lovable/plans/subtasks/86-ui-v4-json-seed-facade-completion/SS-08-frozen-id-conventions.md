# SS-08 Frozen Id Conventions

Plan: 86-ui-v4-json-seed-facade-completion
Step: 8
Status: frozen
Date: 2026-07-19

## Rule

All seeded records use stable, human-readable, kebab-case ids with a fixed
per-slice prefix. Ids MUST be unique within their slice across all profiles.
Cross-profile duplication is a validation error caught in Step 12.

Ids are NOT generated at seed time. They are authored in the JSON bundle so
that facade upserts, test fixtures, and Playwright selectors remain stable
across reseeds.

## Prefixes

| Slice           | Prefix   | Example                         |
| --------------- | -------- | ------------------------------- |
| profile         | `prof-`  | `prof-sample-pcb`               |
| project         | `proj-`  | `proj-blister-pack-qa`          |
| category        | `cat-`   | `cat-solder`                    |
| ruleset         | `rs-`    | `rs-ic-solder-joint-inspection` |
| rule            | `rule-`  | `rule-ic-body-r`                |
| roi shape       | `roi-`   | `roi-ic-body`                   |
| camera          | `cam-`   | `cam-basler-aca1920`            |
| mic setting     | `mic-`   | `mic-clean-room-baseline`       |
| sample image    | `smp-`   | `smp-pcb-front-01`              |
| swatch          | `sw-`    | `sw-primary-blue`               |
| property preset | `pp-`    | `pp-brush-soft-round`           |
| setting         | `set-`   | `set-hud-follows-shape`         |
| command         | `cmd-`   | `cmd-apply-profile-sample-pcb`  |
| error scenario  | `err-`   | `err-camera-timeout`            |
| empty scenario  | `empty-` | `empty-projects-list`           |
| saved badge     | `badge-` | `badge-autosaved`               |

## Backward-compatibility aliases

The V4 shortcodes `c1`, `c2` (cameras) remain reserved as `alias` fields on
`cam-*` records, not as primary ids. Facade reads by alias fall back to the
prefixed id.

## Cross-slice references

- `ruleset.projectId` -> `proj-*`
- `ruleset.categoryId` -> `cat-*`
- `rule.rulesetId` -> `rs-*`
- `rule.roiId` -> `roi-*`
- `sample.projectId` -> `proj-*`
- `command.action.profileId` -> `prof-*`

Any reference not matching an existing id in its target slice fails the
Step 12 relationship integrity check.

## Kind suffix (rules only)

Rule ids carry a trailing ROI-kind letter to keep them self-describing:
`-r` rect, `-c` circle, `-k` blob, `-s` anchor, `-e` edge/verdict.
Example: `rule-pin-row-anchor-s`, `rule-bridge-verdict-e`.

## Non-goals

- Not a runtime id generator. Authoring is manual in the JSON bundle.
- Not a database schema. Facade storage keys derive from these ids but are
  not exposed to UI code.
