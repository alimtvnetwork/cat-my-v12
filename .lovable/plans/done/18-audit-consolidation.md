# Audit Consolidation into spec/25-app-audit

Slug: audit-consolidation
Steps: 50
Status: completed
Created: 2026-07-14

## Context

Prior audit artifacts were processed into `spec/25-app-audit/latest/` and then deleted per the user's single-source instruction. This plan consolidates the scattered audit outputs into one canonical current audit bundle with current contracts and repaired cross-links.

Related:

- `.lovable/spec/commands/01-plan-50-workflow.md`
- `.lovable/spec/commands/04-spec-vs-code-reaudit.md`
- `.lovable/spec/commands/05-spec-vs-code-audit-30step.md`
- `.lovable/spec/commands/06-spec-vs-code-audit-15step.md`
- Prior pending: `16-rule-bundle-import-export-spec.md`, `17-v2.0.2-vendor-sdk.md` (unrelated tracks, left in place)

## Steps

1. Inventory every file under `spec/25-app-audit/` (top-level + memory/ + evidence/ + version subfolders) into `./subtasks/18-audit-consolidation/ss-01-inventory.md`.
2. Classify each file as: canonical-latest, historical-snapshot, evidence, rubric/scope, or duplicate. See `./subtasks/18-audit-consolidation/ss-02-classification.md`.
3. Define the target folder shape: `spec/25-app-audit/{00-overview.md, 00-rubric.md, 00-scope.md, CONVENTIONS.md, latest/}`. Document in `./subtasks/18-audit-consolidation/ss-03-target-shape.md`.
4. Create `spec/25-app-audit/latest/`.
5. Identify the canonical latest audit (v1.42.1-full signoff, mean 95.5/100, 0 findings).
6. Move `spec/25-app-audit/latest/*` contents into `spec/25-app-audit/latest/`.
7. Copy `99-signoff-v1.0.0.md` reference into `latest/00-signoff.md` alias only if not already present as v1.42.1 signoff.
8. Fold historical conclusions into the current latest summary.
9. Delete processed pre-v1 snapshots after useful conclusions are folded forward.
10. Delete processed v1 signoff aliases after useful conclusions are folded forward.
11. Delete duplicate top-level audit reports after reading their version pins.
12. Fold consistency conclusions into the latest bundle and delete processed consistency files.
13. Delete now-empty processed archive folder trees.
14. Rewrite `spec/25-app-audit/00-overview.md` to describe the new `latest/` single-source shape and how to read the audit trail.
15. Preserve `00-rubric.md` and `00-scope.md` at top level as the stable contract. See `./subtasks/18-audit-consolidation/ss-04-rubric-scope-review.md`.
16. Move `01-traceability.csv` into `latest/01-traceability.csv` as the current snapshot.
17. Move `02-orphans.md`, `03-missing-impl.md`, `10-scores.md` into `latest/` matching the pattern.
18. Keep the numeric-prefixed area files directly under `latest/` for a flat current bundle.
19. Move `90-top-findings.md`, `91-corrections.md` into `latest/`.
20. Move `00-code-inventory.md` into `latest/00-code-inventory.md`.
21. Move `index.md` into `latest/index.md`.
22. Consolidate evidence conclusions into `latest/`; delete processed evidence folders. See `./subtasks/18-audit-consolidation/ss-05-evidence-dedup.md`.
23. Confirm no archive README is needed under the single-source rule.
24. Create `spec/25-app-audit/latest/readme.md` describing the current audit status (version, score, finding count, signoff date).
25. Generate a single consolidated `spec/25-app-audit/00-history-timeline.md` as a minimal lineage summary for the current audit.
26. Grep the current docs for removed archive references and rewrite to current paths.
27. Grep for `.lovable/memory/audit/` references (should be zero after prior turn) and rewrite any stragglers.
28. Grep for `consistency-<version>` references and rewrite to current summary paths.
29. Grep for `99-audit-report.v` references and rewrite to current summary paths.
30. Grep for `99-signoff-v1.0.0` and rewrite to current signoff paths.
31. Update `readme.md` audit section to point at `spec/25-app-audit/latest/` as the canonical current-state entry.
32. Update `changelog.md` if it links audit reports to use new paths.
33. Update `RELEASE_NOTES` files for the same.
34. Update `.lovable/memory/index.md` Core section audit line to point at `spec/25-app-audit/latest/`.
35. Update `.lovable/memory/index.md` Memories section entry for the v1.0.0 signoff link.
36. Update `spec/spec-index.md` if it lists audit files.
37. Update `spec/21-app/*` any files linking to audit paths.
38. Update `spec/22-app-issues/*` overview if it references audit outputs (it should NOT, since issues are separate now).
39. Verify no file inside `spec/25-app-audit/` links to a sibling that has moved without update. See `./subtasks/18-audit-consolidation/ss-06-crosslink-repair.md`.
40. Add a `spec/25-app-audit/CONVENTIONS.md` documenting: every new audit run refreshes `latest/`, folds useful old conclusions forward, and deletes processed old files.
41. Deduplicate content between `latest/` files and older top-level report files, retaining only the current bundle.
42. Verify `latest/` contains exactly one signoff file and one top-line report file.
43. Verify no processed archive folder remains.
44. Delete any empty folders left behind by the moves.
45. Run `tsgo` to confirm no code references broke (audit paths should not appear in TS, but validate).
46. Run a stale-path grep for the removed audit memory folder and confirm zero matches.
47. Run a stale-path grep for the removed Lovable audit memory folder and confirm zero matches.
48. Update `.lovable/memory/index.md` `Updated:` timestamp.
49. Bump project version per convention (patch bump) and update README version banner.
50. Move this plan file to `.lovable/plans/done/18-audit-consolidation.md` and flip `Status: pending` to `Status: completed`.

## Verification

- `spec/25-app-audit/` matches the single-source target shape from Step 3.
- The stale-path grep for removed audit memory, removed Lovable audit memory, and old consistency filenames returns zero current-doc hits.
- `spec/25-app-audit/latest/` contains the v1.42.1-full current bundle and signoff.
- Processed archive folders are absent.
- `readme.md` and `.lovable/memory/index.md` link to `spec/25-app-audit/latest/` and resolve.
- Build + typecheck stay green (no code impact expected).

## Appended from prior pending tasks

- `16-rule-bundle-import-export-spec.md` — Rule Bundle Import/Export spec authoring (12 steps, in progress, unrelated track, left in place).
- `17-v2.0.2-vendor-sdk.md` — v2.0.2 vendor SDK lifecycle plan (12 steps, pending, unrelated track, left in place).
