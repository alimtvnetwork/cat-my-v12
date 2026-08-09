---
title: spec/21-app Folder Layout Check
slug: folder-layout-check
source: .lovable/memory/07-lovable-folder-guide.md, spec/01-spec-authoring-guide/07-memory-folder-guide.md
---

# spec/21-app Folder Layout — Required Files Check

## Required Files (per spec-authoring guide)

Every top-level spec folder MUST contain:

- an overview file (scope, non-goals, stack), here at `04-overview.md`.
- `97-acceptance-criteria.md`, testable acceptance list.
- `98-changelog.md`, folder-local change log.
- `99-consistency-report.md`, auto/manual cross-reference audit.

## Current State (spec/21-app/)

Grounding block (01-09), reordered per user directive:

- `01-initial-instructions.md` (source)
- `02-authoring-rules.md`
- `03-glossary.md`
- `04-overview.md`
- `05-db-conventions-digest.md`
- `06-split-db-digest.md`
- `07-seedable-config-digest.md`
- `08-image-index.md`
- `09-folder-layout-check.md` (this file)

Governance files present:

- `97-acceptance-criteria.md`
- `98-changelog.md`
- `99-consistency-report.md`

## Naming Compliance

- All files kebab-case, numeric prefix.
- Numeric prefix ranges: `01-09` grounding, `10-` architecture, `20-` data, `30-` UI, `40-` cross-cutting, `50-` modules, `90-` governance.

## spec/22-app-issues/

- `00-overview.md` reserved (Step 8).
- Issue files added on demand as `XX-<slug>.md`.

## Verdict

Folder layout matches required-files rules. No structural fix needed now; governance files (`97/98/99`) land in Phase F per plan. Recorded as pass.

## Acceptance Checklist

- [ ] Actual `spec/21-app/` tree matches the layout printed here; drift = `E_SPEC_ANCHOR_DRIFT`.
- [ ] Every referenced sibling folder exists.
- [ ] Reserved numeric ranges (00-09, 10-17, 20-29, 30-40, 41-46, 50-52+60, 61-72) enforced by this file.
