# 26 - Validate Single Image (from the Rule editor)

**Version:** 1.0
**Owner:** Plan 64 step 28
**Depends on:** `12-rules-editor-shell.md`, `13-rule-kinds-catalogue.md`, endpoint rows 8, 9, 45.

---

## Purpose

While editing a single Rule, the author needs a fast loop: pick an image, run this rule (and only this rule) against it, see the verdict and mask overlay, tune params, repeat. This is not a Project Run; it never writes to `Run` or `Capture`.

## Placement

- Rules editor Tools palette, button `Validate` with keyboard shortcut `V`.
- The button is disabled when the current rule is dirty; the user must Save first (or Save-and-Validate combined action).

## Flow

1. User clicks Validate. If no test image is loaded for this rule, an inline dropzone appears in the Preview palette; user drops or picks one. File goes through `uploadTestImage({ file, rule_set_id, rule_id })` -> `{ image_ref }`.
2. Frontend calls `validateRule({ rule_id, image_ref })` -> `{ result }`.
3. `result` shape:
   ```
   { verdict: 'Pass'|'Fail'|'Error',
     score: number,
     duration_ms: number,
     overlays: [{ kind: 'roi'|'mask'|'annotation', svg_or_ref }],
     details: kind-specific JSON,
     op_id: string }
   ```
4. Preview palette renders the base image with SVG overlays layered top; verdict pill sits above the image; a small details panel below the image shows kind-specific fields (e.g. OCR text found + confidence).

## Running-op integration

- `validateRule` registers a RunningOp of kind `ValidateImage`; the pill shows it while it is in flight.
- The op self-completes on success; on failure the pill flips to `Failed` and the Preview palette shows the error object.

## Persistence

- The chosen test image is stored in `rule-sets/<rs>/rules/<r>/images/` per `21-filesystem-layout.md` and shown in a small carousel; users can re-select prior images without re-uploading.
- Last-used image per rule is remembered per user (`localStorage`, not server).

## Error paths

- Upload > 20 MB: rejected client-side with actionable message.
- Backend `ValidationFailed`: overlays contain a `red-box` overlay over the ROI plus the details JSON in the panel.
- Backend `Internal`: the pill shows Failed with a `Copy error id` button; the details panel prints the error code and request id.

## Verification

- Contract test: upload a fixture image, call `validateRule`, assert overlays kinds and details keys match the spec for the rule kind.
- Playwright: RectangleOcr rule with `ocrExpectedText = "ABC"`. Drop matching image -> Pass; drop mismatching image -> Fail with `details.found_text`.
