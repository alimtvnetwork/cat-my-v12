---
Slug: inventory-lovable
Status: pending
Created: 2026-07-12
Parent: 03-read-everything-build-memory
---

# SS-01 — Inventory `.lovable/`

Goal: produce a flat manifest of every file under `.lovable/` before reading, so Step 2+ can check off each one.

## Procedure

1. `find .lovable -type f | sort > /tmp/lovable-manifest.txt`
2. Annotate each path with a one-word category: `memory`, `plan-pending`, `plan-done`, `subtask`, `command`, `prompt`, `guideline`, `config`.
3. Flag empty files (0 bytes) and files >20 KB for special handling.
4. Save the annotated manifest into the memory file `06-spec-map.md` (Step 9 of parent) under an "`.lovable/` inventory" section.

## Definition of done

- Manifest covers 100% of `.lovable/` (checked with `wc -l` vs `find … | wc -l`).
- Every path has a category tag.
- Empty/oversized files are called out explicitly.
