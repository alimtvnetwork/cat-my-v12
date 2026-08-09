# Plan 83 backlog item 10: seed orchestrator gap check

Backlog asked: audit orchestrator seeders across swatches, categories,
rulesets, rules, cameras, mic-settings, projects, image-samples, and
bindings. Verdict per surface below (v3.700.0).

| Surface       | Seeder / source                                                                                                  | Verdict                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| projects      | `src/lib/projects/seed.ts` `autoSeedIfEmpty()` (orchestrator name `projects`)                                    | Covered                                         |
| categories    | Created inside `autoSeedIfEmpty` via `categoryNames` per project sample                                          | Covered                                         |
| rulesets      | Created inside `autoSeedIfEmpty` via `store.createRuleset()` + editor rules                                      | Covered                                         |
| rules         | `src/lib/rules/seed.ts` (orchestrator name `rules`) plus per-ruleset editor rules populated in `autoSeedIfEmpty` | Covered                                         |
| cameras       | `src/lib/camera/seed.ts` (orchestrator name `cameras`)                                                           | Covered                                         |
| mic-settings  | `src/lib/mic-settings/seed.ts` (orchestrator name `mic-settings`)                                                | Covered                                         |
| image-samples | `src/lib/image-samples/seed.ts` (orchestrator name `image-samples`)                                              | Covered                                         |
| bindings      | Project <-> camera + ruleset bindings (orchestrator name `bindings`)                                             | Covered                                         |
| swatches      | `src/lib/swatches/facade.ts` `DEFAULT_SWATCHES` returned when persisted cache is empty                           | Covered by defaults; no dedicated seeder needed |

No orchestrator gap. Swatches intentionally do not have a seeder: the
facade returns `DEFAULT_SWATCHES` whenever the persisted cache is empty
(`src/lib/swatches/facade.ts` line 38: `let cache: string[] = [...DEFAULT_SWATCHES];`),
so an operator on a fresh install already sees the full default palette.
Adding a seeder would only duplicate that fallback and would fight the
`resetSwatches()` command, which restores the same defaults.

Categories and rulesets are not top-level orchestrator seeders because
they are strictly children of a project row: seeding them independently
would create orphaned records that violate the project facade's foreign
key expectations. `autoSeedIfEmpty` therefore owns their creation as
part of the `projects` seeder run.

Closes backlog item 10.
