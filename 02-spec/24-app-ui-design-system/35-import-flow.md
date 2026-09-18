# 35 - Import Flow (Preview + Apply)

**Version:** 1.0
**Owner:** Plan 64 step 37
**Depends on:** `15-export-import.md`, `32-export-json-schema.md`, `34-project-zip-layout.md`, endpoint rows 16, 17.

---

## Purpose

Every import is two-phase: `previewImport` computes a diff without touching the DB, the user resolves conflicts, then `applyImport` executes them transactionally. No import ever writes without an explicit user apply click.

## Phase 1: preview

1. User picks a `.json` / `.yaml` / `.rsz` / `.capz` file.
2. Frontend `POST` multipart to `previewImport` -> `{ preview_id, diff }`. Backend:
   - Verifies envelope schema, checksums, and (if present) signature.
   - Loads the current target rows keyed by `id` + name.
   - Emits a `diff` with one row per Entity (RuleSet, Rule, Shape, JsFunction, Project, CameraSetting, LightingSetting, Category).

## Diff row shape

```jsonc
{
  "kind": "Rule",
  "id": "uuid",
  "name": "PresenceOfCap",
  "path": "rule-sets/Bottle-Neck__abc/rules/PresenceOfCap__def.json",
  "status": "New" | "Identical" | "Modified" | "MovedRuleSet" | "MissingLocally" | "Extraneous",
  "changes": [
    { "path": "params.presenceThreshold", "before": 0.6, "after": 0.75 }
  ],
  "signatureStatus": "unsigned" | "verified" | "failed",
  "defaultDecision": "Overwrite" | "Skip" | "Rename",
  "conflicts": [ /* human strings, e.g. "Referenced by 3 running Projects" */ ]
}
```

- `Identical` rows are grouped and rendered as a single "N unchanged" collapse.
- `MovedRuleSet` (a Rule moved to a different RuleSet) requires an explicit user decision; no auto-default.
- `Extraneous` = present in the target but absent from the import; NEVER auto-deleted. The user can mark them for deletion via an opt-in checkbox at apply time.

## Conflict resolution UI

- Modal with a virtualised list of diff rows grouped by `kind`.
- Filters: All / Changed / Conflicts. Bulk actions per group: `Overwrite all`, `Skip all`, `Rename all` (auto-suffix ` (imported YYYY-MM-DD)`).
- Signature banner:
  - `unsigned`: yellow warning "This bundle is unsigned. Signed profiles (host-io) will be downgraded to strict on import."
  - `verified`: green pill with signer key id.
  - `failed`: red banner blocks apply until the user checks `I understand the signature check failed`.

## Phase 2: apply

1. User clicks Apply -> `applyImport({ preview_id, decisions })`.
2. Backend:
   - Re-validates the preview id + hash of the staged file. If someone re-uploaded a different file in the meantime, `code: 'PreviewMismatch'`.
   - Opens a single transaction. Applies decisions in order: Shapes, JsFunctions, RuleSets, Rules, Categories, Camera/Lighting, Project + wirings.
   - Writes one audit line per changed row with `{ table, id, action, actor, request_id }`.
   - On any error, rolls back and returns `code: <specific>` + `details.first_failure`.
3. Success -> `{ ok, counts: { new, updated, skipped, renamed, deleted } }`. Preview id is invalidated.

## Timeouts and cancellation

- Preview id lifetime: 15 minutes. After expiry the staging folder is deleted; apply returns `code: 'PreviewExpired'`.
- Apply cannot be cancelled mid-transaction; UI shows a Running Pill of kind `ApplyImport` while it runs.

## Verification

- Contract test: import a bundle that renames one rule, changes one param, and adds one shape. Assert `previewImport.diff` classifies each correctly. Assert `applyImport` writes exactly those rows.
- Contract test: apply a bundle, then re-apply the same bundle; second apply reports all `Identical` and writes nothing.
- Playwright: signature failure banner blocks the Apply button until the checkbox is ticked; log line confirms `signatureStatus: 'failed'` was recorded.
