# Seed Fixtures Per Screen

Scope: every hub that renders domain data (Projects, Rulesets, Rules,
Cameras, MicSettings, Image Samples). Addresses the user's persistent
complaint that "seeding values do not go forward" and "we cannot test
every seeding value".

## Root cause statement (single sentence)

Seed data is scattered across ad-hoc `seed.ts` files that each write to
one facade in isolation, so opening a project doesn't guarantee its
rulesets, rules, cameras, and samples are all present and coherent.

## The one orchestrator

`src/lib/seed/orchestrator.ts` exports `seedAll(profile: SeedProfile)`
where `SeedProfile = "sample-pcb" | "soic-inspection" | "connector-bank"`.
Each profile writes a coherent snapshot across every facade in one
atomic pass:

1. `ProjectRepositoryFacade.upsertMany(projects)`
2. `RuleFacade.upsertMany(rules)`
3. `RulesetFacade.upsertMany(rulesets)` with rule references resolved
4. `CameraFacade.upsertMany(cameras)`
5. `MicSettingsFacade.upsertMany(micSettings)`
6. `ImageSamplesFacade.replaceProjectSamples(projectId, samples)` for
   each project in the profile

If any step throws, the orchestrator rolls back by calling
`clearAll(profile.id)` and re-throws with context. Silent failure is
not permitted.

## Profiles

### `sample-pcb` (default first-run seed)

- 1 project: "Sample PCB inspection"
- 3 cameras: "Line camera A" (2456x2054), "Line camera B" (2456x2054),
  "Overview" (1920x1080)
- 4 rulesets: "Solder joints", "Reference designators", "Missing
  components", "Barcode read"
- 12 rules covering every kind: 3 ROI (C), 2 Rect (R), 2 OCR anchor
  (K), 2 Text (S), 1 Math (E), 1 Barcode (B), 1 Color band.
- 6 image samples with `orderIndex` 0..5, thumbnails from
  `public/seed/pcb-*.jpg` (existing assets).

### `soic-inspection`

- 1 project: "SOIC pin inspection"
- 2 cameras
- 2 rulesets: "Pin count", "Pin alignment"
- 6 rules focused on OCR + geometry.
- 4 samples.

### `connector-bank`

- 1 project: "Connector bank presence/absence"
- 1 camera
- 1 ruleset: "Presence checks"
- 4 rules, each a Rect with the presence/absence/ignore kind chip
  demonstrated per rule.
- 3 samples.

## Reset semantics

Settings > Data > Seed data adds three actions:

- "Seed sample PCB" / "Seed SOIC" / "Seed connector bank" idempotent,
  overwrites the target profile's project id, keeps other projects.
- "Reset all data" clears every facade then reseeds `sample-pcb`.
- Each action is a facade write (never a direct `localStorage` call)
  and emits a `SeedApplied` event on the app event bus for observability.

## Deep-link contract

Every seeded object has a stable, human-readable id
(`project:sample-pcb`, `ruleset:solder-joints`,
`rule:solder-joint-count`) so URLs like
`/projects/sample-pcb/rulesets/solder-joints` open the seeded editor
without a lookup. This is what fixes I-29 (edit rule opens nothing):
the rule row's `<Link>` uses the same stable id.

## First-run

`src/routes/__root.tsx`'s `beforeLoad` checks
`ProjectRepositoryFacade.count()`. If zero, it awaits
`seedAll("sample-pcb")` before continuing. This runs client-side only
(after hydration) to avoid seeding during SSR prerender.

## Observability

Every seed write logs `[seed] wrote N <facade> rows for profile <id>`
at info level. If a write throws, the error dialog surfaces the
correlation id, the profile, and the failing facade. Silent failure is
not permitted.

## Non-goals

- No user-authored fixtures in v1; the three profiles are the entire
  set. A future "Import fixture" command is out of scope.
- No cross-tab seed sync; `BroadcastChannel` from v3.598.0 already
  handles that at the facade layer.
- No factory pattern for random data; seeds are fixed so screenshots
  stay deterministic.

## Ratchet

`src/lib/seed/__tests__/orchestrator.test.ts` asserts that after
`seedAll("sample-pcb")`:

- Every rule referenced by every ruleset resolves to an actual rule.
- Every project's `rulesetIds` resolve.
- Every image sample belongs to a real project.
- Every camera id referenced by every project exists.
- `seedAll` twice in a row yields the same facade state (idempotent).

## When it applies

Phase G of Plan 100 (steps 71-85). No hub may ship after Phase G that
relies on an ad-hoc `seed.ts`; the orchestrator is the only write path.

## v2 Addendum (Plan 86 Step 45, 2026-07-19)

This command is realized by the v2 seed contract described in
`spec/21-app/53-ui-seed-facade.md` Section 0. Concretely:
`src/lib/seed/data/bundle.v2.json` (validated by
`src/lib/seed/schemas-v2.ts`), applied via
`src/lib/seed/orchestrator-v2.ts` and the frozen
`cmd:apply-seed-profile` command, with reads through
`src/lib/facades/slice-facades.ts` + `useFacadeOrStore`. Profiles
are frozen at 6. See `SS-08-frozen-id-conventions.md`,
`SS-09-facade-contract-additions.md`, and
`SS-10-frozen-seed-surface-matrix.md` under
`.lovable/plans/subtasks/86-ui-v4-json-seed-facade-completion/`.
Pre-v2 references in this file (bundle.json, per-slice bootstrap,
on-boot fan-out, "seed if empty") are RETIRED.
