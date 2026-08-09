# SS-07 Frozen Seed Profiles

Plan: 86-ui-v4-json-seed-facade-completion
Step: 7
Status: frozen
Created: 2026-07-19

## Purpose

Lock the 6 seed profile names, their intended coverage, and the routes each
profile must be able to render before the populators in Steps 11-21 run.
Every populator, orchestrator dependency ordering decision, and Playwright
profile selector must reference this file.

## Profile Registry

| Profile Id           | Display Name    | Default? | Intended Coverage                                                                                                                                                             | Target Routes / Surfaces                                                                                                                                                                                                 |
| -------------------- | --------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| prof-default-pcb     | Sample PCB      | yes      | First-run default. Full happy path: 1 project, 2 rule sets, ~8 rules, 2 cameras, 1 mic, samples, swatches, presets.                                                           | Home, Projects list, Project editor, Rules, Categories, Rule Set editor, Rule editor, Properties/Layers/Tools/History/Swatches/Adjust/Grid/Brush/Type/Paragraph/CSS/Image panes, Settings, Command Palette, Saved badge. |
| prof-soic-inspection | SOIC-8 Line     | no       | Dense OCR/barcode + solder-joint rules on one project; 1 rule set with 6 rules covering OCR, barcode, presence, absence, ignore.                                              | Project editor, Rule Set editor, Rule editor (OCR/barcode variants), Properties pane OCR/barcode fields.                                                                                                                 |
| prof-connector-bank  | Connector Bank  | no       | Presence/absence grid stress: 1 project, 1 rule set with 12 grid rules, 1 camera, 20 sample thumbnails.                                                                       | Project editor grid overlay, Rules list pagination, Categories tab filter, Sample list virtualization.                                                                                                                   |
| prof-blister-qa      | Blister Pack QA | no       | Pill count + pocket presence: 1 project, 2 rule sets (Pill Presence Grid, Blister Pocket Count), math-style validation rules, 1 camera, 1 mic.                                | Rule Set editor math rule, Properties math pane, Chain-events badge, Live preview badge counts.                                                                                                                          |
| prof-empty-preview   | Empty Preview   | no       | Zero domain rows across every slice; keeps profile row + settings + commands only.                                                                                            | Empty states on every list route, seed CTA behavior, Home empty hero.                                                                                                                                                    |
| prof-error-preview   | Error Preview   | no       | Deliberately broken references surfaced via the error funnel (missing camera on a rule, missing category on a rule set). Used to prove the 3-tier error architecture renders. | Error scenarios route, error boundary examples, Command Palette failure toasts.                                                                                                                                          |

## Coverage Rules

1. Every profile MUST populate the `profiles` slice with a matching row (id
   equals profile id).
2. `prof-default-pcb` is the only profile with `default: true`. First-run bootstrap
   (Step 26) gates on it via project count.
3. `prof-empty-preview` MUST NOT populate categories, rules, rule sets, projects,
   cameras, mic settings, samples, or swatches; it still populates settings
   and commands so non-domain UI renders.
4. `prof-error-preview` MUST include at least one dangling foreign key per error
   tier (validation, business, runtime) so Step 42 Playwright coverage can
   assert each tier renders through the error funnel.
5. Profiles are mutually isolated: applying one profile MUST NOT read or
   mutate rows owned by another profile (enforced by orchestrator Step 25
   and idempotency tests Step 39).

## Route-to-Profile Matrix

Cross-references SS-04-route-facade-map.md. Each row lists the minimum
profile required to render that surface with meaningful data.

| Route Group                         | Minimum Profile      |
| ----------------------------------- | -------------------- |
| Home, Projects list, Project editor | prof-default-pcb     |
| Rules list, Categories, Rule editor | prof-default-pcb     |
| Rule Set editor (OCR/barcode)       | prof-soic-inspection |
| Rule Set editor (grid stress)       | prof-connector-bank  |
| Rule Set editor (math validation)   | prof-blister-qa      |
| Empty-state variants                | prof-empty-preview   |
| Error boundary examples             | prof-error-preview   |
| Settings, Command Palette           | any                  |

## Frozen Decisions

- Profile ids are stable strings; renaming requires a plan and a migration.
- Adding a 7th profile requires appending here first, then updating the
  bundle schema (Step 12) and orchestrator (Step 25).
- Populators (Steps 11-21) must emit rows tagged with `profile: <id>` for
  every slice except `profiles` itself.

## Unblocks

- Step 8: stable id conventions can now be scoped per profile.
- Steps 11-21: each populator knows which profiles own which rows.
- Step 26: first-run gate reads `prof-default-pcb` as the default.
- Step 41: Playwright profile selector iterates this registry.
