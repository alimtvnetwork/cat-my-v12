---
title: SS-00 Plan 85 kickoff
slug: ss-00-kickoff
plan: 85
step: 0
version: v3.788.0
date: 2026-07-19
---

# Plan 85 kickoff

## Root cause (one sentence)

Plan 83's ~39 remaining steps had no execution ordering after Plan 84 closed, so every "next 1 step" call would re-litigate priorities against a flat 50-item backlog.

## Change

Created `.lovable/plans/pending/85-plan83-residual-shepherd.md` with a 20-step ordered slice that maps 1:1 onto Plan 83 residual step numbers, biased toward ship-per-turn units. High-risk rewrites (steps 26-29, 32-36, 42-43, 47-50 of Plan 83) explicitly deferred to a future Plan 86.

## Verification

- `ls .lovable/plans/pending/` = 21 (was 20 after Plan 84 closeout).
- Plan 83 stays open; Plan 85 references its residual by step number.

## Unblocks

Every subsequent "next 1 step" pulls from Plan 85's ordered list. Plan 85 Step 1 (Categories tab split, issue #28) is next.
