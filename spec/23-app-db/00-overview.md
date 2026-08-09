# App DB

**Version:** 3.2.0  
**Updated:** 2026-04-16  
**AI Confidence:** Draft  
**Ambiguity:** None

---

## Keywords

`app-db` · `schema` · `migrations` · `queries` · `data-model`

---

## Scoring

| Criterion                | Status |
| ------------------------ | ------ |
| `00-overview.md` present | ✅     |
| AI Confidence assigned   | ✅     |
| Ambiguity assigned       | ✅     |
| Keywords present         | ✅     |
| Scoring table present    | ✅     |

---

## Purpose

Application-specific database (App DB) specifications for whatever project this repo ships — web app, Chrome extension, CLI, plugin, mobile app, etc. Covers the app's data model, table designs, migration strategies, query patterns, and any database decisions unique to this application. Complements the core `04-database-conventions/` (general naming/schema rules) and `05-split-db-architecture/` (SQLite partitioning) with app-specific schema details.

---

## Document Inventory

| #   | File                   | Purpose                                                                                                                    |
| --- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 01  | `01-root-db-schema.md` | Root SQLite schema, casing waiver, referential integrity, SQLite column contract for rule params.                          |
| 02  | `02-rule-sets.mmd`     | ER: RuleSet, Rule, RuleParam, RuleShape, Shape, JsFunction, Category (Plan 64 step 18).                                    |
| 03  | `03-projects.mmd`      | ER: Project, ProjectRuleSet (with override_mode + snapshot_id), ProjectCategory, CameraSetting, LightingSetting (step 19). |
| 04  | `04-runs-captures.mmd` | ER: Run, Capture, RuleResult, CaptureAsset (step 20).                                                                      |
| 05  | `05-user-assets.mmd`   | ER: Shape/JsFunction versioning, ImportedAsset, ImportProvenance with signature status (step 21).                          |

---

## Reference vs Snapshot override columns

The join `ProjectRuleSet` carries two shape-critical columns that every reader MUST honour:

| Column          | Type  | Meaning                                                                                                                                                |
| --------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `override_mode` | enum  | `Reference` (live link to the current RuleSet) or `Snapshot` (frozen copy at wiring time).                                                             |
| `snapshot_id`   | uuid? | Populated only when `override_mode = Snapshot`. Points at a `RuleSet` row cloned with `parent_snapshot_id` set to the original. Null when `Reference`. |

Rule of thumb: readers resolve a Project's active rules by walking `ProjectRuleSet -> (snapshot_id or rule_set_id)`, never by dereferencing `rule_set_id` when `override_mode = Snapshot`. This is the same contract as `spec/24-app-ui-design-system/22-override-modes.md`.

---

## Cross-References

- [Database Conventions (Core)](../04-database-conventions/00-overview.md) — General naming, PK/FK, ORM conventions
- [Split DB Architecture](../05-split-db-architecture/00-overview.md) — SQLite partitioning and migration patterns
- [App](../21-app/04-overview.md) — App-specific features and workflows
- [Consolidated Database Conventions](../17-consolidated-guidelines/18-database-conventions.md) — Consolidated summary

---

_App DB — created 2026-04-16, slug renamed `23-app-database` → `23-app-db` on 2026-04-26_

---

## Verification

_Auto-generated section — see `spec/23-app-db/97-acceptance-criteria.md` for the full criteria index._

### AC-ADB-000: App DB conformance: Overview

**Given** Validate app database migrations against the schema-design rules.  
**When** Run the verification command shown below.  
**Then** Migrations are forward-only; PascalCase naming is preserved; new columns are nullable with no DEFAULT (Rule 12).

**Verification command:**

```bash
python3 linter-scripts/check-forbidden-strings.py
```

**Expected:** exit 0. Any non-zero exit is a hard fail and blocks merge.

_Verification section last updated: 2026-04-21_
