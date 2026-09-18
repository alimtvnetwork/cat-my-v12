---
Slug: memory-layout
Status: pending
Created: 2026-07-12
Parent: 03-read-everything-build-memory
---

# SS-03 — `.ai-memory/memory/` layout

Goal: define the exact file set to create in parent Step 9 so future onboarding is deterministic.

## Files to create

| File                                         | Contents                                                                                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.ai-memory/memory/index.md`                   | Ordered list of every memory file with a one-line purpose each. Read first, always.                                                                           |
| `.ai-memory/memory/01-code-red.md`             | CODE-RED prohibitions extracted from `.ai-memory/coding-guidelines.md` + `02-spec/02-coding-guidelines/`. Verbatim, no paraphrase.               |
| `.ai-memory/memory/02-naming.md`               | Naming conventions for files, folders, DB tables/columns, JSON keys, PK/FK.                                                                                   |
| `.ai-memory/memory/03-error-manage.md`         | Error-management rules from `02-spec/03-error-manage/` — catch/log/rethrow, AppError, Result types, no swallowed errors.                                         |
| `.ai-memory/memory/04-design-system.md`        | Design tokens, theme variables, spacing/typography/motion rules from `02-spec/07-design-system/` and current `--ca-*` token set in `src/styles.css`.             |
| `.ai-memory/memory/05-linters-and-scripts.md`  | What every linter under `linters/` enforces + what every script under `linter-scripts/` and `scripts/` does + how to run them.                                |
| `.ai-memory/memory/06-spec-map.md`             | Full `02-spec/` index (from SS-02) plus `.ai-memory/` inventory (from SS-01).                                                                                      |
| `.ai-memory/memory/07-lovable-folder-guide.md` | How `.ai-memory/` is organized: plans lifecycle, commands, issues, prompts, subtasks, memory. Mirrors `02-spec/01-spec-authoring-guide/07-memory-folder-guide.md`. |

## Rules

- Each file ≤ 100 lines (per `.ai-memory/coding-guidelines.md` hard rule #7).
- No magic strings — reference spec section numbers.
- `.ai-memory/memory/index.md` MUST be updated whenever any of the above files are added or removed.

## Definition of done

- All 8 files exist.
- `index.md` lists all 7 other files.
- `mem://index.md` gains a pointer to `.ai-memory/memory/index.md`.
