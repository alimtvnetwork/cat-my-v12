---
name: Plan 73 step 45 - visual baselines refresh post-a11y
description: Second baseline regeneration after v3.506.0 a11y token diffs; absorbs the intentional home CTA and FavoritesBar pill ink changes.
type: reference
---

# Plan 73, step 45: visual baselines refresh (post-a11y)

Root cause (one sentence): the baselines captured in step 40 (v3.505.0) predated the `--ca-on-primary` swap and the tinted-pill retune from step 41b (v3.506.0), so the next `visual:test` run would flag those intentional a11y diffs as regressions.

Command: `VISUAL_UPDATE=1 bun run tests/visual/capture-baselines.ts` against the running Vite dev server on `http://localhost:8080` (Nix chromium via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`).

Output (from tool):

```
[visual:update] wrote tests/reports/screenshots/plan69/baseline/home.png (Home / landing)
[visual:update] wrote tests/reports/screenshots/plan69/baseline/setup.png (Setup shell)
[visual:update] wrote tests/reports/screenshots/plan69/baseline/run.png (Run picker)
[visual:update] captured 3 baselines
```

Byte-level diff vs step 40 baselines (proves the refresh actually landed):

| File      | Before (v3.505.0) | After (v3.507.0) |
| --------- | ----------------: | ---------------: |
| home.png  |          102583 B |         103465 B |
| setup.png |           53659 B |          54405 B |
| run.png   |          364074 B |         362809 B |

All three files changed size; timestamps `Jul 18 13:22` (fresh). `home.png` and `run.png` diffs are the CTA ink and pill retune from 41b; `setup.png` picks up the shared token change.

`VISUAL_ROUTES` inventory unchanged (see `tests/visual/routes.config.ts`). No new routes added.
