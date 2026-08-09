---
Slug: v1-release-notes
Parent: 09-audit-closeout-v1-tag
Status: pending
Created: 2026-07-12
---

# SS-03 — v1.0.0 release notes & version pin

## Goal

Single-shot, coordinated bump from v0.105.x → v1.0.0 across all governance surfaces, with a release note that reads as a ship declaration (not a changelog dump).

## Files to edit (in this order, one commit)

1. `release_notes.md` — new top section:
   - Header: `## v1.0.0 — 2026-07-12`
   - Subsections: Highlights, Blockers cleared (F-02, F-15, F-20, F-21, F-27, F-29, F-44, F-45, F-46, F-47, F-48, F-49, F-91, F-92), Audit score progression (55.6 → 72.9 → 80.7 → v0.105 mean), Test coverage delta, Known follow-ups (prompt 106 backlog).
2. `changelog.md` — prepend `## [1.0.0] - 2026-07-12` with grouped Added / Changed / Fixed / Security entries pulled from v0.97 → v0.105 CHANGELOG blocks.
3. `readme.md` — flip ship banner: `**Ship Status:** READY · v1.0.0` and update the audit summary line.
4. `package.json` — `"version": "1.0.0"` (only if a version field already exists; do not add one otherwise).
5. `.lovable/memory/audit/99-audit-report.v1.0.0.md` — copy of v0.105 report with `Ship Status: READY` frontmatter.

## Copy rules

- No emojis (Core memory rule).
- Do NOT call this a Keyence product (IP guardrail: `.lovable/spec/commands/02-ip-guardrail.md`).
- Use "study clone of a machine-vision inspection HMI" phrasing.

## Verification

- `rg -n "0\.10[0-5]" readme.md changelog.md release_notes.md` returns only historical references, never a current version claim.
- `rg -n "1\.0\.0" readme.md changelog.md release_notes.md package.json` present in all four.
- README banner reads READY.

## Rollback

If rescore #3 (parent step 9) comes in below 82 mean or any area < 75, abort this subtask — leave version at v0.105.x and loop back to lowest-scoring area before retrying.
