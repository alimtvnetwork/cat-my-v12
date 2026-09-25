# 34 - Project Zip Layout

**Version:** 1.0 (draft, BLOCKED by Q16 for whether Runs are included by default)
**Owner:** Plan 64 step 36
**Depends on:** `15-export-import.md`, `21-filesystem-layout.md`, `32-export-json-schema.md`.

---

## Purpose

A single portable file that carries a Project (its wirings, camera + lighting settings, and the transitive RuleSets/Shapes/JsFunctions it depends on) so an operator can hand-carry it between machines or store it in git.

## Filename

`<ProjectName>__<project_id>__v<schema>.<yyyy-mm-dd_hh-mm-ss>.capz`

- Extension `.capz` (Control Automation Project Zip). MIME `application/zip` at transport.
- `<schema>` matches the envelope `version` in `32-export-json-schema.md`.

## Inner layout

```
manifest.json                                # envelope, kind: "ProjectZip", version, checksums index
project/
  project.json                               # Project payload
  camera.json                                # CameraSetting payload
  lighting.json                              # LightingSetting payload (or {"$missing": true})
  categories.json                            # Category rows referenced by the Project
rule-sets/
  <RuleSetName>__<rule_set_id>/
    rule-set.json                            # full RuleSet payload per 32-
    rules/                                   # rendered rule JSONs (one file per rule for diff-friendliness)
      <RuleName>__<rule_id>.json
    shapes/
      <ShapeName>__<shape_id>.svg
      <ShapeName>__<shape_id>.svg.sha256
    js-functions/
      <FnName>__<fn_id>.js
      <FnName>__<fn_id>.json                 # metadata (paramsSchema, sandboxProfile)
      <FnName>__<fn_id>.js.sha256
runs/                                        # OPTIONAL, see Q16
  <yyyy-mm-dd_hh-mm-ss>__<run_id>/
    run.json
    captures/<capture_id>/{raw.<ext>, annotated.<ext>, result.json}
signatures/
  manifest.json.sig                          # detached signature over manifest.json (optional; unsigned bundles allowed but flagged)
```

## `manifest.json`

```jsonc
{
  "$schema": "https://control-automation.local/schemas/project-zip-v1.json",
  "kind": "ProjectZip",
  "version": "1.0.0",
  "generatedAt": "2026-07-16T12:34:56Z",
  "generatedBy": "control-automation@3.251.0",
  "project": { "id": "uuid", "name": "LineA", "status": "Ready" },
  "ruleSets": [
    { "id": "uuid", "name": "Bottle-Neck", "overrideMode": "Reference", "snapshotId": null },
  ],
  "includes": { "runs": false, "captures": false },
  "checksumSha256": "<over sorted-canonical `payload` block below>",
  "entries": [
    { "path": "project/project.json", "sha256": "..." },
    { "path": "rule-sets/Bottle-Neck__abc/rule-set.json", "sha256": "..." },
    /* every non-signature file listed with its checksum */
  ],
}
```

- Every file in the zip except entries under `signatures/` MUST appear in `manifest.entries` with a matching sha256. Importer aborts if any file is missing, extra, or hash-mismatched.

## Includes policy (BLOCKED by Q16)

Working assumption: `runs/` is EXCLUDED by default; the export dialog exposes a checkbox `Include runs and captures` which flips `includes.runs` and `includes.captures` to `true` and adds the folder. Snapshots of RuleSets are ALWAYS included when the wiring is `Snapshot`.

Q16 will finalise whether captures are stored as raw images or as references to an external asset store when they exceed a size threshold.

## Import semantics

- The importer resolves inner RuleSet ids against the target DB:
  - If missing, insert (respecting override-mode: `Snapshot` wirings create the snapshot RuleSet as a first-class row).
  - If present and identical (checksum match), reuse.
  - If present with divergence, the pre-apply diff (per `35-import-flow.md`) surfaces the conflict and the user chooses skip/overwrite/rename per row.
- The Project itself is imported last so a partial failure leaves the DB with orphaned RuleSets, not a half-wired Project.

## Verification

- Contract test: export a Project with two RuleSets (one Reference, one Snapshot), assert `manifest.entries` matches every zip entry and every sha256.
- Contract test: flip one byte in a rule JSON inside the zip, import, assert `code: 'IntegrityError'` with the offending path in `details`.
- Playwright: export with default settings, re-import into an empty DB, assert Project + wirings + camera/lighting land intact.

## Open ambiguity

- Q16: default `includes.runs` value and per-capture size threshold for external-store spillover.
