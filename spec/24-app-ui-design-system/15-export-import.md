# 15 - Export / Import (Rules, Rule Sets, Projects)

**Version:** 1.0 (draft)
**Owner:** Plan 64 (UI v2), steps 10, 34-37, 86-88
**Depends on:** `13-rule-kinds-catalogue.md`, `14-design-mode-custom-shapes.md`, `spec/23-app-db/`

---

## Purpose

Every rule, rule set, and project must round-trip through user-portable files. Three formats are supported and interchangeable: JSON, YAML, and a zipped SQLite bundle. Projects also export as a single zip that carries their SQLite slice, JSON manifests, and captured image assets.

## Formats matrix

| Scope       | JSON | YAML | SQLite Zip | Project Zip |
| ----------- | ---- | ---- | ---------- | ----------- |
| Rule        | yes  | yes  | no         | no          |
| Rule Set    | yes  | yes  | yes        | no          |
| Project     | yes  | yes  | yes        | yes         |
| Shape       | yes  | no   | bundled    | bundled     |
| JS Function | yes  | no   | bundled    | bundled     |

YAML is a lossless mirror of JSON (Q15 pending); until answered we specify it as round-trippable through `yaml.parse(yaml.stringify(json)) === json` for scalar-safe payloads.

## JSON envelope (all scopes)

```json
{
  "format": "vision-inspection.export",
  "format_version": "1.0.0",
  "scope": "RuleSet",
  "exported_at": "2026-07-16T12:34:56Z",
  "exported_by": {"user_id": "uuid", "app_version": "3.245.0"},
  "checksum_sha256": "hex",
  "payload": { ... }
}
```

The `checksum_sha256` is computed over the canonicalised `payload` (JCS canonical JSON) and re-verified on import. Mismatch aborts the import with a surfaced error, never silently.

## Rule Set payload

```json
{
  "rule_set": {
    "id": "uuid",
    "name": "Rule Set 01",
    "override_source_id": "uuid|null",
    "override_mode": "Reference|Snapshot|null",
    "rules": [
      { "id": "uuid", "kind": "RectangleOcr", "name": "Serial No.", "sequence": 1, "region_kind": "Rectangle", "region": {"x":10,"y":20,"w":100,"h":40}, "params": {"expected_regex":"^[A-Z0-9]{8}$","min_conf":80} },
      ...
    ]
  },
  "shapes":       [ { "id":"...", "svg_path_d":"M ...", ... } ],
  "js_functions": [ { "id":"...", "name":"NormalizeSerial", "source":"export function run(input){ ... }" } ]
}
```

All referenced shape and JS-function ids MUST resolve inside the same envelope. Dangling references fail import.

## Project Zip layout

```
project-<slug>-<yyyyMMdd-HHmm>.zip
├── manifest.json          # top-level envelope (scope="Project")
├── project.sqlite         # SQLite slice for this project (rules, categories, camera, lighting, runs)
├── rule-sets/
│   ├── <ruleSetId>.json
│   └── <ruleSetId>.yaml   # mirror
├── shapes/<shapeId>.svg
├── shapes/<shapeId>.json
├── js-functions/<fnId>.js
├── captures/<runId>/<captureId>.<png|jpg>
└── README.md              # human-readable summary, generated
```

Q16 pending: images stored side-by-side under `captures/`, referenced by relative path in `project.sqlite` and `manifest.json`. Embedded base64 mode may ship later behind an option.

## Rule Set SQLite Zip

```
rule-set-<slug>.zip
├── manifest.json
├── rule-set.sqlite        # tables: rule_sets, rules, shapes, js_functions
└── shapes/<id>.svg        # duplicated as loose files for tooling
```

## Import flow

1. User picks a file. UI detects `format_version` and `scope`.
2. The server function `previewImport(file)` parses and returns a diff: `{ added, modified, unchanged, conflicts }`.
3. UI shows the diff with per-row Skip / Overwrite / Rename controls.
4. On confirm, `applyImport(previewId, decisions)` writes inside a single DB transaction. Any error rolls back and surfaces the message.
5. Success writes an audit line `{ import_id, scope, counts, actor, at }`.

## Export flow

1. User picks scope + format from the Export menu.
2. Server function `startExport(scope, id, format)` streams the file back with `Content-Disposition: attachment`.
3. For long exports (project zip with many captures) the op is registered with the Running Pill (see `11-running-process-pill.md`); the pill's click jumps to a Downloads view where the user can retry, cancel, or re-download.

## Error handling

- Every parse/checksum/dangling-reference failure logs a structured line `{ import_id, phase, code, message }` and shows a user-visible error banner with the same code.
- Silent failures are forbidden. If a preview succeeds but apply fails, the failure is surfaced with the same import id so users can attach it to a bug report.

## Verification

- Playwright: export Rule Set as JSON, delete it in-app, import the file, assert identical row-count and identical `checksum_sha256` on re-export.
- Playwright: tamper with `checksum_sha256` in the JSON export, attempt import, assert the banner shows the mismatch and no rows were written.
- Unit: `canonicalize(payload)` is stable across environments (same input -> same bytes).

## Open ambiguities referenced

- Q15 (YAML lossless mirror) confirmed as round-trippable through JSON.
- Q16 (images embedded vs referenced) defaulted to referenced under `captures/`.
