# 13 - Rule Kinds Catalogue

**Version:** 1.0 (draft)
**Owner:** Plan 64 (UI v2), steps 8, 90
**Depends on:** `01-foundations.md` (Naming), `12-rules-editor-shell.md`, `23-app-db/01-root-db-schema.md`

---

## Purpose

Enumerate every rule kind the editor exposes in v1, with its storage token, UI label, parameter set (DB columns), and validator contract. Any new kind must be added here first and to the SQLite column contract in `spec/23-app-db/01-root-db-schema.md` in the same change.

## Global rule columns (present on every kind)

| Column                    | Type        | Notes                                                             |
| ------------------------- | ----------- | ----------------------------------------------------------------- |
| `id`                      | uuid PK     |                                                                   |
| `rule_set_id`             | uuid FK     |                                                                   |
| `parent_rule_id`          | uuid null   | For grouped / nested rules.                                       |
| `kind`                    | text enum   | PascalCase storage token. Values below.                           |
| `name`                    | text        | User-given. Title Case in UI.                                     |
| `sequence`                | int         | Order within its group. 2-digit zero-padded in labels.            |
| `enabled`                 | bool        | Layer visibility toggle.                                          |
| `override_source`         | uuid null   | Set when this rule was inherited via a Reference clone.           |
| `override_mode`           | text enum   | `Reference` \| `Snapshot` \| null.                                |
| `region_kind`             | text enum   | `Rectangle` \| `Circle` \| `CustomShape` \| `Mask` \| `None`.     |
| `region_x`,`y`,`w`,`h`    | int null    | Rectangle / bounding box.                                         |
| `region_cx`,`cy`,`r`      | int null    | Circle.                                                           |
| `region_shape_id`         | uuid null   | CustomShape / Mask, references `shapes(id)`.                      |
| `params_json`             | jsonb       | Kind-specific parameters (mirrored to typed columns where dense). |
| `created_at`,`updated_at` | timestamptz | Audit.                                                            |

## Kinds

### RectangleOcr - "Rectangle OCR"

Rectangle region + OCR. Reads text and compares to `expected_text` or a regex.

| Param               | Column                       | Notes                    |
| ------------------- | ---------------------------- | ------------------------ |
| Expected text       | `params_json.expected_text`  | Optional.                |
| Expected regex      | `params_json.expected_regex` | Optional.                |
| OCR engine          | `params_json.engine`         | `Tesseract` (default).   |
| Language            | `params_json.lang`           | ISO code, default `eng`. |
| Confidence min      | `params_json.min_conf`       | 0..100.                  |
| Character whitelist | `params_json.whitelist`      | Optional.                |

### CircularOcr - "Circular OCR"

Same as RectangleOcr but region unwraps a ring to a strip before OCR. `region_kind='Circle'` + `params_json.ring_thickness_px`.

### CustomShapeOcr - "Custom Shape OCR"

OCR inside a `CustomShape` region. Uses the shape's SVG as a mask before feeding pixels to the OCR engine.

### Presence - "Presence"

Region is expected to contain content matching a template or a minimum non-background pixel ratio. Params: `threshold`, `min_ratio`, `template_shape_id?`.

### Absence - "Absence"

Inverse of Presence. Params: same as Presence; passes when ratio below threshold.

### FlawDetection - "Flaw Detection"

Blob analysis with fail-on-detection semantics. Detecting any blob matching `params_json.min_area_px`, `max_area_px`, and `sensitivity` fails the rule.

### BarcodeQr - "Barcode / QR"

Barcode or QR read within region. Params: `symbologies` (array from `Code128`, `Ean13`, `QrCode`, `DataMatrix`, `Pdf417`, ... - Q10 gates the final v1 list), `expected_text?`, `expected_regex?`, `min_conf`.

Chain-of-events: on successful read the decoded text is exposed as `$barcode.<rule_name>.text` for downstream rules and user JS functions.

### BlobDetection - "Blob Detection"

General blob detector with pass-on-detection semantics (opposite of FlawDetection). Params: same as FlawDetection plus `expected_count`.

### PositionalAdjust - "Positional Adjustment"

Not a standalone rule, but a per-region pre-processing step. When enabled inside another rule's `params_json.pos_adjust`, it applies edge detection with `edge_width_px` and `edge_pitch_px` before the primary detector runs. Q11 confirms this is a modifier, not a rule.

### UserJsFunction - "User Function"

Runs a user-authored JavaScript function against the region + upstream rule outputs. Params: `js_fn_id` (references `js_functions(id)`), `inputs_json` (mapping of arg names to upstream rule outputs).

### Group - "Group"

Not a detector. Container for nested rules. `parent_rule_id` on children points here. Failure semantics: `params_json.fail_mode` in `AnyFail` \| `AllFail`.

## Enum snapshot (v1)

```
kind IN (
  'RectangleOcr','CircularOcr','CustomShapeOcr',
  'Presence','Absence','FlawDetection','BlobDetection',
  'BarcodeQr','UserJsFunction','Group'
)
```

`PositionalAdjust` is intentionally NOT in the `kind` enum; it lives inside `params_json.pos_adjust` on any region-bearing kind.

## Validator contract

Every kind implements:

```ts
type ValidateInput = { image: ImageRef; rule: Rule; upstream: Record<string, unknown> };
type ValidateResult =
  | { status: "Pass"; evidence: unknown; conf: number }
  | { status: "Fail"; reason: string; evidence: unknown; conf: number }
  | { status: "Error"; error: { code: string; message: string } };
```

Rules are executed in `sequence` order within a group. `Group.fail_mode` decides whether one Fail stops the group or whether all children must fail.

## Open ambiguities referenced

- Q8 (JS sandbox) blocks `UserJsFunction` server-side execution.
- Q9 (Flaw Detection) confirmed above as "blob + fail-on-detect + threshold".
- Q10 (Barcode symbologies) pending user list.
- Q11 (Positional Adjust) closed above.
