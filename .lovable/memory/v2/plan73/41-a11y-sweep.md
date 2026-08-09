---
name: Plan 73 step 41 axe a11y sweep
description: WCAG2 AA sweep across 8 primary routes; 3 residual violations logged and surfaced.
type: feature
---

# Axe a11y sweep (Plan 73 step 41)

Date: 2026-07-18. Version: v3.505.0. Ruleset: `wcag2a` + `wcag2aa` via axe-core 4.10.0.

## Command

`python3 tests/e2e/axe_a11y.py` against `http://localhost:8080`. Report at `tests/reports/a11y-axe.json`.

## Results

Overall `Status: Failed`, `Total: 3` violations. Zero-violation routes: `/setup`, `/setup/functions`, `/setup/chain-events`, `/errors`, `/ops`, `/settings/license`.

Residual violations, surfaced (not silently swallowed):

| Route  | Rule Id          | Impact   | Nodes | Notes                                                                 |
| ------ | ---------------- | -------- | ----- | --------------------------------------------------------------------- |
| `/`    | `color-contrast` | serious  | 1     | Home QuickAction / pill accent text likely below 4.5:1 on hover state |
| `/run` | `color-contrast` | serious  | 1     | Run picker chip text below 4.5:1                                      |
| `/run` | `label`          | critical | 1     | Unlabeled form control on the Run picker (search or filter input)     |

## Follow-up (feeds Plan 73 remaining items)

- New pending step `41b` (deferred fix pass): resolve the `label` critical on `/run` (add `aria-label` or associate `<label>`), and adjust token contrasts for the two `color-contrast` findings against `--foreground` / `--muted-foreground` on hover.
- Gate itself is left `Failed` intentionally so CI blocks until the fixes land; do not baseline the failures.

## Root cause of the sweep

No consolidated WCAG audit had been recorded since Plan 09 Step 6; the script existed but was never treated as a gate output. Step 41 promotes it to an evidence artifact under `.lovable/memory/`.
