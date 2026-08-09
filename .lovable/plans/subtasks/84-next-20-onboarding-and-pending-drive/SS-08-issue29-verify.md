# SS-08 — Issue 29 verification + close

Version: v3.775.0
Date: 2026-07-19
Parent: `.lovable/plans/pending/84-next-20-onboarding-and-pending-drive.md`
Step: 8 of 20

## Purpose

Prove issue 29 (rule edit does not open editor) is closed by live evidence,
not by reading the code.

## Root cause (historic)

No route file existed at `/projects/$/rulesets/$/rules/$ruleId`, so
`LayerRow`'s pencil/Enter emit onto `openRuleBus` had no consumer.

## Fix already in tree

| File                                                                   | Lines                    | Role                                                     |
| ---------------------------------------------------------------------- | ------------------------ | -------------------------------------------------------- |
| `src/routes/projects.$projectId.rulesets.$rulesetId.rules.$ruleId.tsx` | 11-24                    | Stub `beforeLoad` redirect to parent with `search.rule`. |
| `src/routes/projects.$projectId.rulesets.$rulesetId.tsx`               | 29-33, 43, 64-84, 89-104 | `validateSearch`, preselect effect, bus subscriber.      |
| `src/components/editor/layers/LayerRow.tsx`                            | 95-100, 230-243          | Enter + Pencil emit `openRuleBus.emit(rule.id)`.         |
| `src/lib/editor/selection/open-bus.ts`                                 | full                     | Module-scoped emitter with warn/error logs.              |

## Playwright evidence (2026-07-19)

Script: `/tmp/browser/step8/run5.py`. Screenshots:

- `/tmp/browser/step8/ruleset_edit.png` (before click)
- `/tmp/browser/step8/after_pencil.png` (after click, `?rule=` present)

Console:

```
[open-rule-bus] emit {ruleId: seed-6eaclqx0, listeners: 1}
[rules/$ruleId] redirect to ruleset with preselect {projectId: ..., rulesetId: ..., ruleId: seed-6eaclqx0}
```

URL after click: `.../rulesets/<rsid>?rule=seed-6eaclqx0`.

## Actions taken

- Marked `.lovable/issues/29-rule-edit-does-not-open-editor.md` Status: closed
  with root cause, file map, and Playwright evidence.
- No source edits (fix was already shipped by prior turns).

## Delta to Plan 83 backlog

- Item 2 flips from OPEN to DONE.
- Open Plan 83 backlog items remaining: 3, 4, 7, 8, 10-28 (per SS-07).

## Delta to Plan 84 open issues

- Open issues count: 9 → 8. Remaining open: 16, 27, 28, 30, 31, 32, 33, 34.
