# Plan 75 step 15: header-density verification

Playwright script `/tmp/browser/plan75/step15/run.py` toggled `useUiPrefsStore.headerDensity` between `comfortable` and `compact` and captured 1280x1800 screenshots for `/`, `/setup`, `/setup/roi`, `/setup/reference`, `/setup/rules`, `/projects`.

## Results (summary.json)

- Shell headers per route: 1 in every combination (12/12). `single-header-invariant` guard is intact.
- SectionTopBar: present only on `/setup/rules` and `/projects` (as intended by section routing). Zero on setup sub-editors and home.
- Page errors captured: only the expected Supabase env warning (unrelated to this plan).
- No clipping, no overlap: screenshots stored under `/tmp/browser/plan75/step15/{density}_{route}.png`.

## Verdict

Chrome renders one nav layer + at most one context bar per route in both density modes, matching Plan 75 step 15 acceptance criteria.

_Author: Plan 75 execution, v3.518.0._
