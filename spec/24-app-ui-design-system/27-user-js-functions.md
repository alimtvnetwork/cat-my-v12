# 27 - User JS Functions

**Version:** 1.0 (draft, BLOCKED by Q8 for the sandbox profile enum)
**Owner:** Plan 64 step 29
**Depends on:** `spec/23-app-db/05-user-assets.mmd`, endpoint row 13, `20-backend-endpoint-map.md`.

---

## Purpose

Users can write small JS functions that grade a capture region and return a verdict. This is the escape hatch for shape-specific checks not covered by the built-in kinds. Every function is versioned, sandboxed, and can be exported / imported as a `.js` file + JSON metadata.

## Function shape

Every user function is an ES module with a single default export:

```js
export default async function grade(input, ctx) {
  // input: { image: ImageBitmap, roi: { x, y, w, h } | { shape_id }, params: Record<string, unknown> }
  // ctx:   { logger, now, sha256, cv } // cv is a curated OpenCV.js subset
  return {
    verdict: 'Pass' | 'Fail' | 'Error',
    score: 0..1,
    details: { /* JSON */ },
    overlays: [{ kind: 'roi'|'mask'|'annotation', svg: '<svg .../>' }],
  };
}
```

- The default export MUST be a function. Any other shape is rejected at save time.
- `params` is declared alongside the function in a metadata sidecar so the UI can render a form for it.

## Storage

- Table: `JsFunction` + `JsFunctionVersion` per `spec/23-app-db/05-user-assets.mmd`.
- File on disk: `rule-sets/<rs>/js-functions/<Name>__<uuid>.js` plus sibling `.json` metadata { params_schema, sandbox_profile, description }. Sidecar `.sha256`.

## Sandbox

- Runtime: an isolated Worker per invocation with `no-network` fetch stub by default. Timeout 5 s (configurable per rule up to 30 s).
- Allowed globals: `console`, `TextEncoder`, `TextDecoder`, `crypto.subtle`, `structuredClone`, `Math`, `Date`, `URL`, `atob`/`btoa`, `Uint8Array` etc. No `eval`, no `Function` constructor (parser-level reject).
- Provided modules via `ctx`: `logger` (proxy to server log), `now()`, `sha256(bytes)`, `cv` (curated OpenCV.js: `threshold`, `findContours`, `Canny`, `matchTemplate`, `cvtColor`, `resize`). Full API in `spec/24-app-ui-design-system/27a-js-cv-api.md` (to be written when Q8 resolves).
- Sandbox profile enum (BLOCKED by Q8): working assumption `strict` (default), `network-none`, `host-io` (writes to `rule-sets/<rs>/js-functions/<id>/scratch/` only). Rules choose a profile; RuleSet-level maximum caps them.

## UI

- Rules editor Tools palette entry `User JS Function`. Creating one opens a Monaco editor pane inside the Preview palette (Preview docks temporarily right; user can undock).
- Save calls `saveJsFunction({ rule_set_id?, name, source })`. On save: parse, reject `eval`/`Function`, run a smoke `grade({ image: fixture, roi: {x:0,y:0,w:1,h:1}, params: {} }, ctx)` in the sandbox; failure blocks save with the thrown error surfaced verbatim.
- Version history: right-hand drawer lists prior versions with diff view (Monaco diff) and Restore.

## Export / import

- Export: `.js` + `.json` metadata + `.sha256` inside the RuleSet Zip per `15-export-import.md`.
- Import: signature check per `IMPORT_PROVENANCE.signature_status`; unsigned functions land as `signature_status = 'unsigned'` and cannot execute in the `host-io` profile.

## Error paths

- Timeout -> `verdict: 'Error'`, `details: { code: 'Timeout', ms }`.
- Uncaught throw -> `verdict: 'Error'`, `details: { code: 'UncaughtException', message, stack_snippet }`. Full stack is written to the server log with the op id; the client only sees a truncated snippet.
- Disallowed API access -> parser-level reject at save; runtime attempts to reach a stub throw `SandboxDenied`.

## Verification

- Contract test: save a function returning Pass, invoke via `validateRule`, assert result. Save a function that throws, assert `verdict: 'Error'` with a `code`.
- Playwright: create a Rule of kind `UserJsFunction`, paste a fixture function, Validate, assert overlay renders.

## Open ambiguity

- Q8: exact sandbox profile enum and `cv` subset. This spec locks the shape; the enum and the API list finalise when Q8 is answered.
