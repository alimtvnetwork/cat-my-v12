# UI Craft Improvements (Plan 87, Step 29)

Before/after verification for the Plan 87 UI polish arc (Steps 2-28).
Baseline images live in `./ui-craft-baseline/` (captured 2026-07-19,
Plan 87 Step 1). Post-improvement images live in `./ui-craft-after/`,
copied from the smoke run in `tests/e2e/screenshots/ui-craft/` at
**v3.905.0** (2026-07-20).

## Reproduce (single command)

```
python3 tests/e2e/ui_craft_smoke.py
```

The smoke script (added in Step 28) attaches a console + `pageerror`
listener, waits for the boot-time auto-seed summary, dispatches
`cmd:apply-seed-profile` for the frozen id `prof-ui-craft-demo`
(added in Step 27, listed in `FROZEN_SEED_PROFILES` in
`src/lib/seed/apply-profile-command.ts`), then walks the five surfaces
below and writes screenshots to `tests/e2e/screenshots/ui-craft/`.
Copy them over the `./ui-craft-after/` directory to refresh this doc.

Manual invocation of the seed alone (no smoke walk):

```
Command palette → "Seed: UI craft demo"
```

or programmatically:

```js
window.dispatchEvent(
  new CustomEvent("cmd:apply-seed-profile", {
    detail: { profileId: "prof-ui-craft-demo" },
  }),
);
```

## Surfaces

| Surface    | Route                                              | Before                           | After                             | Steps landed                                                                            |
| ---------- | -------------------------------------------------- | -------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------- |
| Home       | `/`                                                | `ui-craft-baseline/home.png`     | `ui-craft-after/1_home.png`       | Step 21 (hero utility strip, `src/routes/index.tsx`)                                    |
| Projects   | `/projects`                                        | `ui-craft-baseline/projects.png` | `ui-craft-after/2_projects.png`   | Step 22 (accent bar + corner glow, `src/routes/projects.index.tsx`)                     |
| Rulesets   | `/projects/proj-ui-craft-demo-showcase/rulesets`   | `ui-craft-baseline/ruleset.png`  | `ui-craft-after/3_rulesets.png`   | Step 13 (Rules/Categories split), Step 23 (inline test-run pill)                        |
| AI Testing | `/projects/proj-ui-craft-demo-showcase/ai-testing` | `ui-craft-baseline/ai-test.png`  | `ui-craft-after/4_ai_testing.png` | Steps 9-11 (3-pane rebuild), Step 24 (side panel density), Step 26 (first-run skeleton) |
| Settings   | `/settings`                                        | `ui-craft-baseline/settings.png` | `ui-craft-after/5_settings.png`   | Steps 2-3 (section primitive + spacing), Step 23 (UI density card)                      |

Note: `ui-craft-baseline/roi.png` (ROI editor, Steps 12/14) has no
matching entry in the walk because the demo profile does not open the
ROI editor. Steps 12/14 were validated separately in Plan 87 Step 14
(HUD collision-avoidance verification).

## Cross-cutting polish (visible across every "after" image)

- Ubuntu headings + Poppins body (memory: user-set typography).
- 160 ms ease-out panel/toast entry via `motion-panel-in` /
  `motion-toast-in` utilities (`src/styles.css`), self-suppressed under
  `prefers-reduced-motion: reduce` (Step 25).
- Precision matte Properties HUD (`src/components/editor/canvas/SelectionOverlay.tsx`,
  Step 20 + follow-up polish).

## Runtime evidence

Local smoke run at v3.905.0:

```
snap: 1_home        -> http://localhost:8080/
snap: 2_projects    -> http://localhost:8080/projects
snap: 3_rulesets    -> http://localhost:8080/projects/proj-ui-craft-demo-showcase/rulesets
snap: 4_ai_testing  -> http://localhost:8080/projects/proj-ui-craft-demo-showcase/ai-testing
snap: 5_settings    -> http://localhost:8080/settings
ui_craft_smoke: ok
```

`assert not errors` (uncaught `pageerror`) passed; no thrown boundaries.

### Known non-blocking noise

- Two `error:` console lines with `{isNotFound: true, routeId: /projects/$projectId}`
  during the rulesets/ai-testing snaps. Cause: the project-layout loader
  runs before the newly applied profile has finished hydrating the
  project store, so the first render resolves `isNotFound`; the error
  boundary retries and the correct route renders on the next tick
  (screenshots confirm the surfaces render). Tracked as a follow-up
  (route loader should await `applySeedProfile` completion, or the
  layout should suspend on store hydration). Not gating Plan 87.
- One `error:[Supabase] Missing Supabase environment variable(s)` line.
  Expected in the dev sandbox: Cloud is not connected.

## Version

Pinned at **v3.905.0** (`README.md` line 5). See `CHANGELOG.md` for the
per-step trail from v3.881.0 (Plan 87 start) through v3.905.0.
