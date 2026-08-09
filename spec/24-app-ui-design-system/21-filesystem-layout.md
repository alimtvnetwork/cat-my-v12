# 21 - Filesystem Layout (data folder on disk)

**Version:** 1.0 (draft, BLOCKED by Q12)
**Owner:** Plan 64 step 17
**Depends on:** `spec/23-app-db/`, `15-export-import.md`, `20-backend-endpoint-map.md`
**Ambiguity:** Q12 (final root path). This spec captures the layout; the root prefix is finalised once Q12 is answered.

---

## Purpose

Define the exact on-disk layout used by capture, validation, export, and import. Every server function that writes a file MUST place it under this tree. Every UI action that references an asset does so through a stable relative path (`image_ref`), never an absolute path.

## Root

Working assumption (pending Q12): the root is `data/` next to the running executable on desktop, and `${APP_DATA_DIR}/data/` in the packaged installer build. All paths below are relative to that root.

```
data/
  rule-sets/
    <RuleSetName>__<rule_set_id>/
      rules/
        <RuleName>__<rule_id>/
          rule.json                 # canonical rule definition (matches 32-export-json-schema)
          meta.json                 # timestamps, author, checksum
          images/
            <yyyy-mm-dd>_<hh-mm-ss>_<image_id>.<ext>
          masks/
            <shape_id>.svg          # compiled shape output (Design Mode)
            <shape_id>.png          # optional raster mask, only if imported
          history/
            <yyyy-mm-dd>_<hh-mm-ss>__<change_id>.json
      shapes/
        <ShapeName>__<shape_id>.svg
      js-functions/
        <FnName>__<fn_id>.js
      meta.json
  projects/
    <ProjectName>__<project_id>/
      project.json
      camera.json
      lighting.json
      runs/
        <yyyy-mm-dd>_<hh-mm-ss>__<run_id>/
          run.json
          captures/
            <capture_id>/
              raw.<ext>
              annotated.<ext>
              result.json
      meta.json
  exports/
    <yyyy-mm-dd>_<hh-mm-ss>__<scope>__<id>.zip
  imports/
    staging/<preview_id>/     # deleted on apply or expiry
  tmp/
    capture/<op_id>/          # test capture scratch, deleted with the op
```

## Naming rules

- Folder name = `<DisplayName>__<uuid>`. The uuid is authoritative for lookups; the display name is a human hint and MUST be regenerated on rename (rename is a rename + symlink swap; hard delete of the old name after fsync).
- Files use snake-case suffixes even when the display name is PascalCase (`camera.json`, not `Camera.json`).
- Timestamps in filenames are UTC ISO in the compact form `YYYY-MM-DD_HH-MM-SS` for lexicographic ordering.

## Write contracts

- Every writer opens a temp file `*.part` in the same directory, `fsync`s, then `rename`s onto the final name. No partial reads visible to the UI.
- Every write updates the sibling `meta.json` (checksum, size, last_modified_by).
- Deletes are two-phase: move into `.trash/<yyyy-mm-dd>/` (also under `data/`), physical delete after 7 days by a maintenance job.

## Reads

- The UI never reads from disk directly. Every asset URL is produced by a server function (`getCaptureAsset`, `uploadTestImage` response, etc.) as a short-lived signed URL served through `/api/public/asset/:signed_id`.
- Signed URLs expire in 5 minutes; the frontend refreshes via the owning query.

## Integrity

- Every `rule.json`, `project.json`, `run.json`, and `shape.svg` has a matching `<file>.sha256` sidecar.
- Import verifies each sidecar before writing under `rule-sets/` or `projects/`; mismatches are rejected with `code: "IntegrityError"`.

## Verification

- Contract test `tests/contract/filesystem-layout.test.ts` writes a rule set + rule + run through server functions and asserts the tree above exists byte-for-byte at the expected paths.
- Playwright: after creating a rule and uploading a test image, hit `/api/public/asset/:signed_id` and assert `200` + correct `Content-Type`.

## Open ambiguity

- Q12: final root path on Windows vs macOS installers (probably `%LOCALAPPDATA%/ControlAutomation/data` and `~/Library/Application Support/ControlAutomation/data`). Until answered, dev uses `./data/` next to the running process.
