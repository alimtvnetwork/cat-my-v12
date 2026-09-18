# SS-01: Information architecture and route map

Parent: 34-home-hub-projects-rulesets
Slug: information-architecture
Status: pending
Created: 2026-07-15

## Goal

Lock the route tree and top-of-screen section bar contract BEFORE any
component work. Downstream steps reference this file for section IDs and
sub-option lists.

## Route tree (target)

```
/                                 Home hub (5 top actions, no queues)
/setup                            Global setup (workstation, camera, calibration)
/projects                         Project list + Create new project
/projects/$projectId              Project overview, top-nav bar with sub-options
/projects/$projectId/rulesets     Rule sets list (per project)
/projects/$projectId/rulesets/new Create rule set from image
/projects/$projectId/rulesets/$rulesetId  Rule set editor (existing rail lives here)
/projects/$projectId/trial-run    Trial run (upload image, run rules, view result)
/projects/$projectId/ai-testing   AI testing (batch, metrics)
```

Legacy `/run`, `/errors`, `/results` remain reachable but are no longer
surfaced on `/`; they get linked from the project overview under "Operator".

## Section bar contract

Every section route renders `<SectionTopBar section="..." />` at the very
top of the content column. Sections and sub-options:

- home: Setup, New project, Open project, Trial run, AI testing
- project: Overview, Rule sets, Trial run, AI testing, Settings
- ruleset: Layers, Import, Export, Run on image, Delete
- trial-run: Upload image, Choose ruleset, Run, History
- ai-testing: Dataset, Run tests, Metrics, History

SectionTopBar is a presentational component: `{ section, active }` and
renders a horizontal link row using existing HMI tokens.

## Data model (client-side this plan)

`Project { id, name, createdAt, rulesetIds: string[] }`.
`RuleSet { id, projectId, name, imageRef?: string, rules: EditorRule[] }`.
Persistence: Zustand `persist` to localStorage key `ca:projects:v1`.

## Deliverable

Decision record only, no code. Parent steps 4-9 implement against this
contract verbatim.
