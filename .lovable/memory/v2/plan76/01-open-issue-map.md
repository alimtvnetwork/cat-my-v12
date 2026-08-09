---
name: Plan 76 open-issue map
description: Truly-open issues in .lovable/issues/ after Plan 75 closeout; scope correction for Plan 76.
type: reference
---

# Plan 76 - Open issue map (Step 1)

Date: 2026-07-18
Version baseline: v3.520.0

## Method

For each file in `.lovable/issues/*.md`, read the first `Status:` frontmatter line (line 1-6 range only). Files with multiple concatenated `Status:` lines further down (e.g. issue 17 file bundles 17+18+19 body drafts) do not count as open unless the top-of-file status is `open`.

## Truly open (1)

| #   | slug                               | severity | blocker                                                                                       |
| --- | ---------------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| 16  | project-section-create-flow-broken | high     | blocked-on-user-answers (see `.lovable/ambiguity-questions/01-ui-v2-open-questions.md` Q1-Q7) |

## Closed / resolved since Plan 75 (revised state)

- 01 spec-21-blind-ai-readiness - closed by Plan 26 SS-01.
- 09 setup-ui-not-modern - closed by Plan 75.
- 10 home-missing-projects-and-top-nav - `Status: resolved` (Plan 74 sweep).
- 11 layers-mixed-with-detector-controls - closed by Plan 75.
- 12 ui-overlap-and-density - closed by Plan 75.
- 13 home-screen-regression - closed by Plan 75.
- 14 src-v3-rollback-regression - closed by Plan 75.
- 15 global-home-menu-missing - closed by Plan 75.
- 17 menu-hover-jitter-and-padding - closed by Plan 73 step 5 (v3.486.0). File body still contains draft text for 18/19 which is misleading; a cleanup pass should split those into their own files.
- 18/19/20/21/22/23 - closed statuses per earlier scans.
- 24/25/26 - closed per earlier scans (Plan 70/71/72).

## Scope correction for Plan 76

Original Plan 76 assumed issues 10 and 17 needed fixes. Both are already closed. The only remaining `Status: open` is 16, which is explicitly parked pending user answers to `.lovable/ambiguity-questions/01-ui-v2-open-questions.md`.

Consequence: Plan 76 steps 4-8 (issue 10) and 9-12 (issue 17) have no work behind them. They should be collapsed into a single "verify closure + hygiene" pass, and the freed capacity redirected to:

- Split the multi-issue file `.lovable/issues/17-menu-hover-jitter-and-padding.md` so 18/19 drafts live in their own files with correct `Status:` values.
- Triage issue 16 open questions (already step 13) and, if any Q1-Q7 have implicit answers in current code (naming, setup structure, override modes), record them as memory candidates for the user to confirm.
- Elevate pending-plan hygiene (step 15) from a side task to the primary deliverable.

## Follow-up (not executed here)

Update Plan 76 step list narratively via a rescope memo in step 2's delta doc; do not rewrite the plan file mid-flight. Track deltas so the next planning turn (Plan 77) starts from an accurate open-issue count of 1.
