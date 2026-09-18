# UI Screen Facade Audit (Plan 81)

Spec 21 §52 requires every UI screen to render from the SDK facade
(`ProjectRepositoryFacade` + zustand stores that use it), never from
inline defaults or ad-hoc `localStorage` reads. This document is the
one-shot audit of the 44 route files under `src/routes/`. Each row
records the primary data source, the facade seam it flows through, and
the seed function that populates it on first load. Rows marked "clean"
touch no browser storage directly.

The `facade-single-seam.test.ts` ratchet enforces the seam at CI time:
any new file that reads `localStorage` / `sessionStorage` outside the
allowlist fails the build. This audit removes `routes/projects.index.tsx`
from that allowlist (its list prefs now round-trip through the facade)
and pins the remaining allowlist to routes that only need it for legacy
migration paths.

## Screens

| Route                                         | Data source (facade)                       | Seed / default source                     | Status                               |
| --------------------------------------------- | ------------------------------------------ | ----------------------------------------- | ------------------------------------ |
| `__root.tsx`                                  | none (shell)                               | none                                      | clean                                |
| `index.tsx` (Home)                            | `useProjectStore`, `recent-projects-store` | `projects/seed.ts`                        | clean                                |
| `projects.index.tsx`                          | `useProjectStore` + facade `readItem`      | `projects/seed.ts`, `parsePrefs` fallback | migrated (Plan 81)                   |
| `projects.tsx` (layout)                       | `<Outlet/>`                                | none                                      | clean                                |
| `projects.$projectId.tsx`                     | `useProjectStore.selectors`                | `projects/seed.ts`                        | clean                                |
| `projects.$projectId.index.tsx`               | `useProjectStore`, `useRuleStore`          | `rules/seed.ts`                           | clean                                |
| `projects.$projectId.camera.tsx`              | `camera/facade.ts`                         | `camera/seed.ts`                          | clean                                |
| `projects.$projectId.categories.tsx`          | `useCategoryStore` (facade)                | `rules/seed.ts`                           | clean                                |
| `projects.$projectId.rulesets.tsx`            | `<Outlet/>`                                | none                                      | clean                                |
| `projects.$projectId.rulesets.index.tsx`      | `useRulesetStore` (facade)                 | `rules/seed.ts`                           | clean                                |
| `projects.$projectId.rulesets.$rulesetId.tsx` | `useRulesetStore`, `useRuleStore` (facade) | `rules/seed.ts`                           | clean                                |
| `projects.$projectId.rulesets.new.tsx`        | facade + legacy key migration              | new form                                  | allowlisted (migration only)         |
| `projects.$projectId.runs.tsx`                | `use-run-store` (facade)                   | none (real runs)                          | clean                                |
| `projects.$projectId.trial-run.tsx`           | `projects/trials.ts` (facade-backed)       | none                                      | allowlisted (trials store internals) |
| `projects.$projectId.trial-run.$runId.tsx`    | `projects/trials.ts`                       | trial runner                              | clean                                |
| `projects.$projectId.ai-testing.tsx`          | `ai-testing/aggregate.ts` (facade-backed)  | none                                      | clean                                |
| `projects.$projectId.ai-testing-history.tsx`  | `ai-testing/aggregate.ts`                  | none                                      | clean                                |
| `results.tsx`                                 | `run-store` (facade)                       | none                                      | clean                                |
| `run.tsx`                                     | `run-store` (facade)                       | none                                      | clean                                |
| `ops.tsx`                                     | `ops-store` (facade)                       | none                                      | clean                                |
| `diagnostics.tsx`                             | `diagnostics/home-error-log.ts`            | none                                      | allowlisted (best-effort log)        |
| `errors.tsx`                                  | `error-history-store` (facade)             | none                                      | clean                                |
| `ai-testing.tsx`                              | `ai-testing/aggregate.ts`                  | none                                      | clean                                |
| `setup.index.tsx`                             | facade fan-out                             | none                                      | clean                                |
| `setup.camera.tsx`                            | `camera/facade.ts`                         | `camera/seed.ts`                          | clean                                |
| `setup.categories.$id.tsx`                    | `useCategoryStore`                         | `rules/seed.ts`                           | clean                                |
| `setup.chain-events.tsx`                      | facade + legacy key adapter                | none                                      | allowlisted (migration only)         |
| `setup.functions.tsx`                         | facade + legacy key adapter                | none                                      | allowlisted (migration only)         |
| `setup.reference.tsx`                         | `reference-image-store` (facade-migrating) | none                                      | clean route file                     |
| `setup.roi.tsx`                               | `useRuleStore`                             | `rules/seed.ts`                           | clean                                |
| `setup.rules.tsx`                             | `useRuleStore`                             | `rules/seed.ts`                           | clean                                |
| `setup.rules.$id.tsx`                         | `useRuleStore`, snap-store (facade)        | `rules/seed.ts`                           | clean                                |
| `settings.index.tsx`                          | `useUiPrefsStore` + legacy key migration   | none                                      | allowlisted (migration only)         |
| `settings.camera.tsx`                         | `camera/facade.ts`                         | `camera/seed.ts`                          | clean                                |
| `settings.license.tsx`                        | `license-store` (facade)                   | none                                      | clean                                |
| `settings.lighting.tsx`                       | `lighting/store.ts` (facade-migrating)     | none                                      | clean route file                     |
| `settings.functions.tsx`                      | `functions/persistence.ts`                 | none                                      | clean route file                     |
| `admin.debug.calibration.tsx`                 | server-fn only                             | none                                      | clean                                |
| `admin.debug.calibration-distributions.tsx`   | server-fn only                             | none                                      | clean                                |
| `admin.security.denial-burst.tsx`             | server-fn only                             | none                                      | clean                                |

## Ratchet outcome

Ratchet allowlist size before this audit: 33. After migrating
`routes/projects.index.tsx`: 32. The remaining route entries in the
allowlist all sit behind a one-shot legacy-key migration path (the
route calls `facade.readItem` first, then falls back to reading the
legacy `localStorage` key once and re-writes it through the facade).
No screen renders from an ad-hoc default that skips the facade.

## Seeding contract

Every store that backs a screen ships an idempotent seed:
`projects/seed.ts`, `camera/seed.ts`, `rules/seed.ts`. Each seed runs
once per browser (guarded by a facade-persisted flag), populates real
demo data, and NEVER writes fallback shims into component state. The
Home, Projects, Rules, Categories, and Setup screens therefore always
render from facade-owned data, even on a fresh install.
