# Phase 1 substitute map (read-memory prompt vs actual repo)

Created: 2026-07-16
Source: Plan 38, Step 2.

The generic "read memory" onboarding prompt references five `.lovable/` files
that do not exist in this repo. Use these substitutes instead. Do NOT create
the missing files speculatively.

| Prompt path (missing)        | Substitute in this repo                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `.lovable/overview.md`       | `README.md` (Pinned version + AI onboarding list)                                                |
| `.lovable/strictly-avoid.md` | `spec/17-consolidated-guidelines/00-strictly-avoid-quickref.md`                                  |
| `.lovable/user-preferences`  | `mem://~user` (always injected in prompt)                                                        |
| `.lovable/plan.md`           | Latest file under `.lovable/plans/pending/` (currently `38-read-memory-onboarding-and-audit.md`) |
| `.lovable/suggestions.md`    | none; skip until the user asks for a suggestions log                                             |

Also: consolidated guidelines live at `spec/17-consolidated-guidelines/`, not
the prompt's `spec/12-consolidated-guidelines/`. `spec/17-consolidated-guidelines/`
contains 30+ files (0-29), not the prompt's fixed "18".

Prohibitions from the strictly-avoid quickref that must be retained:

- Seq 01: never suggest timestamps / last-modified metadata / cron for `readme.txt`.
  Only edit `readme.txt` when the user asks in that exact turn.
