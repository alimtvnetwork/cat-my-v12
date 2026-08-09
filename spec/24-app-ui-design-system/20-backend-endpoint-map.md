# 20 - Backend Endpoint Map (UI action -> server function -> payload)

**Version:** 1.0 (draft)
**Owner:** Plan 64 (UI v2), step 15, filled by step 16
**Depends on:** every spec above, `spec/23-app-db/`

---

## Purpose

Single table mapping every UI-visible action to the exact TanStack server function (`createServerFn`) or public server route (`/api/public/*`) that fulfils it, with its request payload, response shape, side effects, and auth requirement. Any new UI action MUST land a row here in the same change as the code.

Rules:

- App-internal calls are `createServerFn` (see `src/lib/*.functions.ts`).
- External-caller endpoints (webhook, MJPEG stream, SSE stream) are server routes under `src/routes/api/public/*` with a verified signature or short-lived signed URL.
- Every function is guarded by `requireSupabaseAuth` middleware unless explicitly marked `Public`.
- Every failure returns a structured `{ code, message, details? }` and writes an audit log line.

## Endpoint table

| #   | UI action                             | Verb / kind      | Function or route                      | Request payload                                       | Response                                          | Auth                                         | Side effects                                                     |
| --- | ------------------------------------- | ---------------- | -------------------------------------- | ----------------------------------------------------- | ------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------- | ----------------------- | ------------------------------------- | --------------------------------------------------------------- |
| 1   | List rule sets                        | server-fn GET    | `listRuleSets`                         | `{ search?, category_id?, limit, cursor }`            | `{ items: RuleSetSummary[], next_cursor? }`       | Auth                                         | Read.                                                            |
| 2   | Create rule set                       | server-fn POST   | `createRuleSet`                        | `{ name, mode: 'New'                                  | 'Category'                                        | 'Task', clone_from?: { id, mode: 'Reference' | 'Snapshot' } }`                                                  | `{ rule_set: RuleSet }` | Auth                                  | Insert; when `clone_from.mode='Snapshot'` also snapshots rules. |
| 3   | Rename rule set                       | server-fn POST   | `renameRuleSet`                        | `{ id, name }`                                        | `{ rule_set }`                                    | Auth                                         | Update.                                                          |
| 4   | Delete rule set                       | server-fn POST   | `deleteRuleSet`                        | `{ id, force?: boolean }`                             | `{ deleted: true }` or `{ blocked_by: string[] }` | Auth                                         | Blocked when referenced by Projects unless `force`.              |
| 5   | List rules in rule set                | server-fn GET    | `listRules`                            | `{ rule_set_id }`                                     | `{ rules: Rule[] }`                               | Auth                                         | Read.                                                            |
| 6   | Save rule (create or update)          | server-fn POST   | `saveRule`                             | `Rule` (see 13-rule-kinds-catalogue)                  | `{ rule }`                                        | Auth                                         | Upsert; validated per `kind`; writes audit.                      |
| 7   | Reorder rules                         | server-fn POST   | `reorderRules`                         | `{ rule_set_id, order: uuid[] }`                      | `{ ok: true }`                                    | Auth                                         | Bulk update `sequence`.                                          |
| 8   | Validate one rule against test image  | server-fn POST   | `validateRule`                         | `{ rule_id, image_ref }`                              | `{ result: ValidateResult }`                      | Auth                                         | Registers RunningOp `ValidateImage`.                             |
| 9   | Upload test image                     | server-fn POST   | `uploadTestImage`                      | multipart `{ file, rule_set_id, rule_id? }`           | `{ image_ref, url, meta }`                        | Auth                                         | Writes to `data/<rule-set-name>/<rule-set-id>/<rule-id>/`.       |
| 10  | Compile shape (Design Mode)           | server-fn POST   | `compileShape`                         | `{ rule_set_id, svg_path_d, holes[], name }`          | `{ shape }`                                       | Auth                                         | Insert into `shapes`; references become updatable.               |
| 11  | Import shape from SVG                 | server-fn POST   | `importShapeSvg`                       | multipart `{ file, rule_set_id, name? }`              | `{ shape }`                                       | Auth                                         | Insert; rejects malformed SVG with structured error.             |
| 12  | Import mask from raster               | server-fn POST   | `importMaskRaster`                     | multipart `{ file, rule_set_id, threshold?, holes? }` | `{ shape }`                                       | Auth                                         | Thresholds then insert.                                          |
| 13  | Save user JS function                 | server-fn POST   | `saveJsFunction`                       | `{ rule_set_id?, name, source }`                      | `{ fn }`                                          | Auth                                         | Insert/update. Source stored verbatim; sandbox at run.           |
| 14  | Preview export                        | server-fn POST   | `previewExport`                        | `{ scope, id, format }`                               | `{ preview_id, size_bytes, item_counts }`         | Auth                                         | No writes; caches preview.                                       |
| 15  | Start export                          | server-fn POST   | `startExport`                          | `{ preview_id }`                                      | `{ op_id, download_url }`                         | Auth                                         | Registers RunningOp `ExportBundle`; streams file.                |
| 16  | Preview import                        | server-fn POST   | `previewImport`                        | multipart `{ file }`                                  | `{ preview_id, diff }`                            | Auth                                         | No writes; caches preview.                                       |
| 17  | Apply import                          | server-fn POST   | `applyImport`                          | `{ preview_id, decisions }`                           | `{ ok, counts }` or `{ code, message }`           | Auth                                         | Transactional; audit line per changed row.                       |
| 18  | List projects                         | server-fn GET    | `listProjects`                         | `{ search?, status?, limit, cursor }`                 | `{ items: ProjectSummary[], next_cursor? }`       | Auth                                         | Read.                                                            |
| 19  | Recent projects                       | server-fn GET    | `listRecentProjects`                   | `{ limit }`                                           | `{ items: ProjectSummary[] }`                     | Auth                                         | Reads `opened_at desc`.                                          |
| 20  | Create project                        | server-fn POST   | `createProject`                        | `{ name }`                                            | `{ project }`                                     | Auth                                         | Insert with status `Draft`.                                      |
| 21  | Set project camera                    | server-fn POST   | `setProjectCamera`                     | `{ project_id, camera_setting_id }`                   | `{ project }`                                     | Auth                                         | May flip status to `Ready`.                                      |
| 22  | Set project lighting                  | server-fn POST   | `setProjectLighting`                   | `{ project_id, lighting_setting_id }`                 | `{ project }`                                     | Auth                                         | Update.                                                          |
| 23  | Add project rule set                  | server-fn POST   | `addProjectRuleSet`                    | `{ project_id, rule_set_id, override_mode }`          | `{ join }`                                        | Auth                                         | Insert; may snapshot.                                            |
| 24  | Change project rule set override mode | server-fn POST   | `setProjectRuleSetOverride`            | `{ join_id, override_mode }`                          | `{ join }`                                        | Auth                                         | Update; may freeze snapshot.                                     |
| 25  | Add project category                  | server-fn POST   | `addProjectCategory`                   | `{ project_id, category_id, auto_apply }`             | `{ join }`                                        | Auth                                         | Insert.                                                          |
| 26  | Toggle project category auto-apply    | server-fn POST   | `setProjectCategoryAuto`               | `{ join_id, auto_apply }`                             | `{ join }`                                        | Auth                                         | Update.                                                          |
| 27  | Start project run                     | server-fn POST   | `startProjectRun`                      | `{ project_id, test_image_refs?: string[] }`          | `{ run_id, op_id }`                               | Auth                                         | Registers RunningOp `ProjectRun`; dispatcher enqueues.           |
| 28  | Cancel running op                     | server-fn POST   | `cancelOp`                             | `{ op_id }`                                           | `{ ok: true }`                                    | Auth                                         | Sets `cancel_requested`; worker exits between steps.             |
| 29  | List runs for project                 | server-fn GET    | `listProjectRuns`                      | `{ project_id, limit, cursor }`                       | `{ items: RunSummary[], next_cursor? }`           | Auth                                         | Read.                                                            |
| 30  | Get run detail                        | server-fn GET    | `getRun`                               | `{ run_id }`                                          | `{ run, captures: CaptureResult[] }`              | Auth                                         | Read.                                                            |
| 31  | List camera settings                  | server-fn GET    | `listCameraSettings`                   | -                                                     | `{ items: CameraSetting[] }`                      | Auth                                         | Read.                                                            |
| 32  | Save camera setting                   | server-fn POST   | `saveCameraSetting`                    | `CameraSetting`                                       | `{ camera_setting }`                              | Auth                                         | Upsert; Zod-validated.                                           |
| 33  | Enumerate camera devices              | server-fn POST   | `listCameraDevices`                    | -                                                     | `{ devices: DeviceInfo[] }`                       | Auth                                         | Calls vendor SDK bridges.                                        |
| 34  | Test capture                          | server-fn POST   | `captureTestFrame`                     | `{ camera_setting_id, patch? }`                       | `{ image_url, meta }`                             | Auth                                         | Writes to `data/` temp; RunningOp.                               |
| 35  | Live preview stream (MJPEG)           | server-route GET | `/api/public/camera/stream/:signed_id` | signed URL (short-lived)                              | `multipart/x-mixed-replace; boundary=frame`       | Signed                                       | Streams frames from vendor SDK bridge.                           |
| 36  | Running-ops stream (SSE)              | server-route GET | `/api/public/running/stream`           | `Authorization: Bearer <one-time>`                    | `text/event-stream`                               | Bearer                                       | Broadcasts progress; auto-reconnect on drop.                     |
| 37  | Save palette layout                   | server-fn POST   | `savePaletteLayout`                    | `PaletteState[]`                                      | `{ ok: true }`                                    | Auth                                         | Upsert per user.                                                 |
| 38  | Save running-pill corner              | server-fn POST   | `saveRunningPillCorner`                | `{ corner }`                                          | `{ ok: true }`                                    | Auth                                         | Upsert per user.                                                 |
| 39  | List categories                       | server-fn GET    | `listCategories`                       | -                                                     | `{ items: Category[] }`                           | Auth                                         | Read.                                                            |
| 40  | Create category                       | server-fn POST   | `createCategory`                       | `{ name, rule_set_ids?: uuid[] }`                     | `{ category }`                                    | Auth                                         | Insert + optional joins.                                         |
| 41  | Get rule set (detail)                 | server-fn GET    | `getRuleSet`                           | `{ id }`                                              | `{ rule_set, rules, categories }`                 | Auth                                         | Read; includes derived override chain preview.                   |
| 42  | Get rule (detail)                     | server-fn GET    | `getRule`                              | `{ id }`                                              | `{ rule }`                                        | Auth                                         | Read.                                                            |
| 43  | Delete rule                           | server-fn POST   | `deleteRule`                           | `{ id }`                                              | `{ deleted: true }`                               | Auth                                         | Delete; audit line; refuses if referenced by a snapshot Project. |
| 44  | Duplicate rule                        | server-fn POST   | `duplicateRule`                        | `{ id, into_rule_set_id? }`                           | `{ rule }`                                        | Auth                                         | Insert copy at end of target rule set.                           |
| 45  | Run status (single op)                | server-fn GET    | `getOpStatus`                          | `{ op_id }`                                           | `{ op: RunningOp }`                               | Auth                                         | Read (used as fallback when SSE stream is unavailable).          |
| 46  | Stop project run                      | server-fn POST   | `stopProjectRun`                       | `{ run_id }`                                          | `{ ok: true }`                                    | Auth                                         | Sets run to `Stopping`; dispatcher cancels children.             |
| 47  | List captures for a run               | server-fn GET    | `listRunCaptures`                      | `{ run_id, limit, cursor }`                           | `{ items: CaptureSummary[], next_cursor? }`       | Auth                                         | Read.                                                            |
| 48  | Get single capture asset              | server-fn GET    | `getCaptureAsset`                      | `{ capture_id, kind: 'raw'                            | 'annotated'                                       | 'mask' }`                                    | `{ url, meta }`                                                  | Auth                    | Read; returns short-lived signed URL. |
| 49  | Delete run                            | server-fn POST   | `deleteRun`                            | `{ run_id }`                                          | `{ deleted: true }`                               | Auth                                         | Deletes run + captures; audit.                                   |
| 50  | Export bundle download                | server-route GET | `/api/public/export/:signed_id`        | signed URL (short-lived)                              | file stream                                       | Signed                                       | Streams the prepared export bundle from step 15.                 |
| 51  | Categories: rename                    | server-fn POST   | `renameCategory`                       | `{ id, name }`                                        | `{ category }`                                    | Auth                                         | Update.                                                          |
| 52  | Categories: delete                    | server-fn POST   | `deleteCategory`                       | `{ id, force?: boolean }`                             | `{ deleted: true }` or `{ blocked_by }`           | Auth                                         | Blocked if referenced unless `force`.                            |
| 53  | Palette layout: read                  | server-fn GET    | `getPaletteLayout`                     | -                                                     | `{ layout: PaletteState[] }`                      | Auth                                         | Read; used at editor mount.                                      |
| 54  | Running-pill corner: read             | server-fn GET    | `getRunningPillCorner`                 | -                                                     | `{ corner }`                                      | Auth                                         | Read; falls back to top-right.                                   |

### Change log (rows appended in step 16)

Rows 41-54 were added by Plan 64 step 16 to close read-side gaps (get rule set / get rule), lifecycle gaps (stop run, delete run), UI persistence read paths, and the signed download route matching row 15's `download_url`. Every added row still obeys the auth conventions and error contract below.

## Auth conventions

- Every non-public function is called through `useServerFn(fn)` from a component or via `queryClient.ensureQueryData` in an `_authenticated/` route loader.
- Never call an authed function from a public route's loader (see the auth-protected server function guidance in the system context).
- Public routes verify their own caller: MJPEG stream signed URL uses HMAC(SHA256, `STREAM_SIGNING_SECRET`); SSE stream trades a short-lived one-time bearer minted by `mintRunningStreamToken()`.

## Error contract

Every function returns either `{ ok: true, ... }` (implicit through resolved value) or throws a `Response` with a JSON body:

```json
{ "code": "ValidationFailed" | "NotAuthorized" | "NotFound" | "Conflict" | "IntegrityError" | "Internal",
  "message": "human-readable",
  "details": { "path": "field.path", ... } }
```

The frontend maps `code` to a toast + inline field error. No error is swallowed. Every thrown error also writes a server-side log line with a request id.

## Verification

- rg check: every server function referenced above exists in `src/lib/*.functions.ts` before the corresponding UI step ships.
- Contract tests under `tests/contract/` post the expected payload shape to each function and assert response shape.
- Playwright: at least one happy-path and one error-path per row is covered by the end of Plan 64.

## Open ambiguities referenced

- Q8 (JS sandbox) affects rows 6 and 13 at run time, not the transport shape.
- Q10 (Barcode symbologies) affects row 6 payload for `BarcodeQr` params.
- Q12 (data folder location) affects rows 9 and 34 side effects.
- Q13 (SQLite vs Cloud) affects transactionality of row 17 and how bundles are produced in rows 15/16.
