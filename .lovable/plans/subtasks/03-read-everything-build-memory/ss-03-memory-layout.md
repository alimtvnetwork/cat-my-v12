---
Slug: memory-layout
Status: pending
Created: 2026-07-12
Parent: 03-read-everything-build-memory
---

# SS-03 — `.lovable/memory/` layout

Goal: define the exact file set to create in parent Step 9 so future onboarding is deterministic.

## Files to create

| File                                         | Contents                                                                                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.lovable/memory/index.md`                   | Ordered list of every memory file with a one-line purpose each. Read first, always.                                                                           |
| `.lovable/memory/01-code-red.md`             | CODE-RED prohibitions extracted from `.lovable/coding-guidelines/coding-guidelines.md` + `spec/02-coding-guidelines/`. Verbatim, no paraphrase.               |
| `.lovable/memory/02-naming.md`               | Naming conventions for files, folders, DB tables/columns, JSON keys, PK/FK.                                                                                   |
| `.lovable/memory/03-error-manage.md`         | Error-management rules from `spec/03-error-manage/` — catch/log/rethrow, AppError, Result types, no swallowed errors.                                         |
| `.lovable/memory/04-design-system.md`        | Design tokens, theme variables, spacing/typography/motion rules from `spec/07-design-system/` and current `--ca-*` token set in `src/styles.css`.             |
| `.lovable/memory/05-linters-and-scripts.md`  | What every linter under `linters/` enforces + what every script under `linter-scripts/` and `scripts/` does + how to run them.                                |
| `.lovable/memory/06-spec-map.md`             | Full `spec/` index (from SS-02) plus `.lovable/` inventory (from SS-01).                                                                                      |
| `.lovable/memory/07-lovable-folder-guide.md` | How `.lovable/` is organized: plans lifecycle, commands, issues, prompts, subtasks, memory. Mirrors `spec/01-spec-authoring-guide/07-memory-folder-guide.md`. |

## Rules

- Each file ≤ 100 lines (per `.lovable/coding-guidelines/coding-guidelines.md` hard rule #7).
- No magic strings — reference spec section numbers.
- `.lovable/memory/index.md` MUST be updated whenever any of the above files are added or removed.

## Definition of done

- All 8 files exist.
- `index.md` lists all 7 other files.
- `mem://index.md` gains a pointer to `.lovable/memory/index.md`.
