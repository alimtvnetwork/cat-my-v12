---
name: Plan 75 closeout memo
description: Final closeout for Plan 75 (open-issues modernization slice 1) and superseded Plan 74; version pin summary.
type: reference
---

# Plan 75 closeout

**Scope shipped:** issues 09, 11, 12, 13, 14, 15 (all `Status: closed`, `Closed-by: Plan 75`).

**Version trail:** v3.503.0 through v3.520.0 (steps 1-20).

- Steps 1-2: guideline digest, issue map. Memos `00-guideline-digest.md`, `01-issue-map.md`.
- Steps 3-4: baseline screenshots + issue 13 verification. Memos `02-baselines.md`, `04-issue13-verify.md`.
- Steps 5-10: issue 14 (`src_v3` audit), issue 15 (`GlobalHomeAffordance`), issue 12 (HmiShell border dedup), issue 11 (Inspector split from Layers), issue 09 (setup hub header modernization), panel-registry `defaultFloatSize` split.
- Steps 11-12: panel-registry contract test; setup hub restructure kickoff.
- Steps 13-14: `SectionTopBar` chrome dedup pass A; density recheck memo `14-density.md`.
- Steps 15-16: density verification across routes + comfortable/compact modes; combined gate (tsgo clean, 722/722 vitest, 0 axe violations). Memos `15-density-check.md`, `16-gate.md`.
- Steps 17-18: visual baseline regen (36/36), SS-04 `<header>` regression fix on `/setup`, issue closures. Memos `17-visual-baselines.md`, `18-issue-closures.md`.
- Steps 19-20: plan files moved from `.lovable/plans/pending/` to `.lovable/plans/completed/` (both Plan 74 umbrella and Plan 75 slice-1); README pin refreshed.

**Plan 74 status:** superseded by Plan 75. All six issues Plan 74 originally scoped were completed under Plan 75, so Plan 74 is moved to `completed/` alongside 75 rather than left dangling.

**Follow-up:** next planning pass should re-triage `.lovable/issues/*.md` for any remaining `Status: open` entries and open Plan 76 from that list.
