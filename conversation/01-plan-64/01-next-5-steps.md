---
title: Plan 64 rolling next-5 driver
slug: plan-64-next-5
feature: 01-plan-64
---

# Plan 64, rolling next-5 driver

Purpose: capture the standing "next 5 steps" prompt driving Plan 64 Section C
work, so the sequencing is auditable outside the chat transcript.

Referenced spec: `spec/24-app-ui-design-system/09-UI-improvements-v2.md`.

Rules the log follows, per user memory:

1. Never re-create per-invocation archive files under `.lovable/prompts/`, only
   edit the canonical mirror if the prompt body itself changes.
2. Never ask for plan approval, implement directly.
3. Never use em dashes in prose or code.
4. Root cause first, one-sentence diagnosis, minimum correct fix.

Landed to date (high level):

- Steps 57 to 84: Setup tiles, project detail tabs, synthetic server fns for
  create/run/compile/clone, Recent-Projects registry and chip, `/setup/rules`
  list, New Rule Set dialog, `formatLabel` helper, breadcrumb token registry.
- Step 85: migration bundle SQL written, awaiting Cloud enable.
- Cross-cutting: Recipe references cleared from `src/` app code.

Still open (short list, see spec for full):

- Steps 86 to 88: Export / Import JSON, YAML, Zip for Rule Sets and projects.
- Step 89: user-functions palette shell.
- Steps 90 to 94: Design Mode overlay, Import Shape / Mask, Validate Against
  Image, Command Palette, Keyboard shortcuts.
- Steps 95 to 100: Density and A11y passes, Playwright pass, tick checklist.

Open architectural ambiguity: web-only on Cloud vs desktop Tauri with local
SQLite vs hybrid, tracked in `.lovable/ambiguity-questions/`.
