# UI Craft Baseline (Plan 87, Step 1)

Captured 2026-07-19 via Playwright at 1280x1800.

| Surface        | Screenshot     | Route                     | Notes to address in later steps                                                        |
| -------------- | -------------- | ------------------------- | -------------------------------------------------------------------------------------- |
| Home           | `home.png`     | `/`                       | Vertical rhythm too loose (Step 19); Getting Started header alignment already patched. |
| Projects       | `projects.png` | `/projects`               | Grid lacks hover elevation, ruleset counts, last-run timestamps (Step 20).             |
| Ruleset editor | `ruleset.png`  | `/projects/demo/rulesets` | Toolbar density; Rules/Categories split needs 8px section gap (Steps 13, 21).          |
| ROI editor     | `roi.png`      | `/setup/roi`              | HUD button hit targets and inspector chip strip (Steps 12, 14).                        |
| AI Test        | `ai-test.png`  | `/ai-testing`             | Full rebuild into 3-pane layout with seeded runs (Steps 9-11).                         |
| Settings       | `settings.png` | `/settings`               | Section primitive + spacing scale audit (Steps 2, 3, 23).                              |

## Reproduce

```
python3 /tmp/browser/ui-baseline/run.py
```

Overwrites the PNGs in this directory. Keep the pre-improvement snapshots
committed here; post-improvement snapshots land in `../ui-craft-improvements.md`
per Plan 87 Step 29.
