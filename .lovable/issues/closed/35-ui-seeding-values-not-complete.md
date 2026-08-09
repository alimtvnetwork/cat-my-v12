# Issue 35 - UI seeding values are not complete or facade-routed

Status: closed
Reported: 2026-07-19
Closed: 2026-07-19 (Plan 86 Step 47, v3.842.0)

## Resolution

Plan 86 (UI v4 JSON seed facade completion) delivered end-to-end JSON-seedable configuration through facade APIs for every V4 UI surface. Every symptom listed below is now covered by a facade read + a test path.

### Coverage matrix (facade-only, seeded from `src/lib/seed/data/bundle.v2.json`)

| Surface                       | Facade                                      | Read hook / component wiring                              | Test                                                   |
| ----------------------------- | ------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------ |
| Projects list, Project editor | `projectsFacade`                            | `useSeededProjects` (Steps 30, 34)                        | `seeded_routes_coverage.py`, `orchestrator-v2.test.ts` |
| Rules list, Rule editor       | `rulesFacade`                               | `useSeededRules` (Step 32)                                | `slice-render.step36.test.tsx`                         |
| Rule Sets, Categories tab     | `rulesetsFacade`, `categoriesFacade`        | `useSeededRulesets`, `useSeededCategories` (Steps 31, 26) | `relationship-integrity.step38.test.ts`                |
| Cameras                       | `camerasFacade`                             | `useSeededCameras` (Step 33)                              | `seeded_routes_coverage.py`                            |
| Mic settings                  | `micSettingsFacade`                         | `useSeededMicSettings` (Step 33)                          | `slice-render.step36.test.tsx`                         |
| Image samples                 | `imageSamplesFacade`                        | `useSeededSamples` (Step 30)                              | `image_samples_*.py`                                   |
| Swatches, Property presets    | `swatchesFacade`, `propertyPresetsFacade`   | `useSeededSwatches` (Step 33)                             | `slice-render.step36.test.tsx`                         |
| Settings, Command Palette     | `settingsFacade`, `commandsFacade`          | `useSeededSettings`, `useSeededCommands` (Step 34)        | `apply-profile-command.test.ts`                        |
| Empty states, error scenarios | `emptyStatesFacade`, `errorScenariosFacade` | `useSeededEmptyStateAction` (Step 35)                     | `useSeededEmptyStateAction.step35.test.tsx`            |
| Home, address bar, nav        | seeded surfaces via `useSeededSurfaces`     | Step 34 wiring                                            | `home_route_smoke.py`, `address_bar_deeplink.py`       |

### Ratchets guaranteeing this stays fixed

- `facade-only-ratchet.step40.test.ts` — fails if UI code imports storage primitives directly.
- `schema-ratchet.step37.test.ts` — rejects unknown slice keys in the bundle.
- `relationship-integrity.step38.test.ts` — every FK across slices resolves.
- `schemas-v2-detailed-errors.test.ts` (v3.841.0) — dangling refs throw `SeedBundleValidationError` with path+expected+got.
- `idempotency.step39.test.ts` — reseed does not clobber user-authored rows.
- `seeded_routes_a11y.py` — axe checks on 7 seeded routes stay at 0 serious/critical.

### Related files (as of closure)

- `src/lib/seed/data/bundle.v2.json` (canonical bundle, 6 profiles)
- `src/lib/seed/orchestrator-v2.ts` (idempotent profile-scoped seeder)
- `src/lib/seed/schemas-v2.ts` (Zod + referential integrity)
- `src/lib/facades/slice-facades.ts` (13 slice facades)
- `src/lib/seed/useSeededSurfaces.ts` (uniform read hooks)
- `.lovable/plans/pending/86-ui-v4-json-seed-facade-completion.md`
- `.lovable/memory/features/facade-and-seed.md`
- `spec/21-app/53-ui-seed-facade.md`

## Historical symptom (preserved for context)

UI seed values were incomplete and scattered across ad-hoc seed files and hardcoded component fixtures. Screens depended on empty states or inconsistent facade coverage. Plan 86 replaced this with a single JSON bundle, per-slice facades, and route-level tests.
