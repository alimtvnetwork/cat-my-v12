# 38 — Results Screen

**Status:** Locked (Plan 04 Step 34). Defines the historical, cross-session results browser. Read-only; the source of truth is the `Result` rows in Task DB (22) and the `results.jsonl` shards on disk (24).

Anchors: 22 (Task DB), 24 (results JSONL), 25 (file naming), 27 (config surface), 30 (UI overview), 33 (rule reason codes), 36 (Instruction Bundle), 37 (Run Monitor).

## 1. Purpose

Where the Run Monitor (37) is _now_, the Results screen is _what happened_. Operators and engineers use it to triage failures, export evidence, and correlate a `Result` back to the exact Instruction Bundle (36) and image that produced it.

## 2. Layout

```text
+----------------------------------------------------------+
| TitleBar (32)   Task · Filter summary · Export           |
+---------------------+------------------------------------+
| FilterBar (40)   Range · Verdict · RuleId · ReasonCode   |
+---------------------+------------------------------------+
|                     |                                    |
|  ResultsTable       |  DetailPane (right, 420px)         |
|  (virtualized)      |   - Selected Result summary        |
|   - Time            |   - Rule verdict list (33)         |
|   - SequenceNumber  |   - Image + overlays (36)          |
|   - Verdict         |   - "Open bundle" / "Open image"   |
|   - RuleFailCount   |                                    |
+---------------------+------------------------------------+
| BottomBar (44)   Row count · Selected · Export progress  |
+----------------------------------------------------------+
```

The table is virtualized (row height fixed; row count may exceed 10⁶). Sorting is server-side against Task DB indexes (22 §Indexes) — never in memory.

## 3. Query Model

Filters map 1:1 to indexed columns on `Result` (22):

| Filter        | Column / Source                              |
| ------------- | -------------------------------------------- |
| Time range    | `Result.CapturedAt`                          |
| Verdict       | `Result.Verdict` (`PASS` / `FAIL` / `ERROR`) |
| Rule          | `RuleResult.RuleId` (join)                   |
| Reason        | `RuleResult.ReasonCode` (33)                 |
| RunSessionId  | `Result.RunSessionId`                        |
| InstructionId | `Result.InstructionId`                       |

Rules:

- Every filter combination MUST resolve to an indexed plan; a plan that would full-scan is `E_RESULTS_UNINDEXED_QUERY` and is refused with a UI toast, not silently executed.
- The filter set is stored in the URL (query string) so a linked triage view is reproducible.

## 4. Detail Pane

On row select:

1. Load `Result` row + its `RuleResult` children (22).
2. Load the Instruction Bundle from `tasks/<TaskId>/instructions/<InstructionId>.json` (36).
3. Load the image from `Image.PathRelative` (36 §3).
4. Render overlays exactly as Run Monitor does (37 §5) — same region colors, same reason codes.

If the bundle or image is missing:

- Bundle missing → `E_RESULT_ORPHAN` (already defined 36 §9); pane shows the row + `RuleResult` list without overlays.
- Image missing → `E_IMAGE_MISSING`; pane shows the bundle geometry on a neutral placeholder, never on a stale image.

The detail pane MUST NOT re-run rules. Displaying a different verdict from the stored one is `E_RESULT_RECOMPUTED` — the stored verdict is authoritative forever.

## 5. Export

Two export modes, both read-only:

1. **CSV** — flat rows from `Result` × `RuleResult`. Columns fixed; no user-selectable columns in v1 (avoid schema drift in downstream tools).
2. **Evidence Bundle** — a zip containing the selected `Result` rows' JSONL slice, the referenced Instruction Bundles, and the referenced images. Filenames follow 25 §File Naming exactly.

Rules:

- Exports are streamed; the UI never materializes >`UI.Results.ExportChunkRows` (27) rows in memory.
- An export that would exceed `UI.Results.ExportMaxBytes` (27) is refused with `E_RESULTS_EXPORT_TOO_LARGE` — the operator narrows the filter, the app does not silently truncate.
- Export progress is written to the BottomBar; cancellation is immediate and leaves no partial file (atomic `.part → final` rename, mirroring 14).

## 6. Controls

- **Row click** — populate DetailPane.
- **Row double-click** — open the referenced Instruction Bundle in a read-only JSON viewer (36 envelope) in a side panel; never in the Rule Setup editor.
- **Export** — TitleBar button; disabled while a prior export is in progress on the same tab.

No mutations. No "re-run this image" button in v1 — re-running is a Dispatcher concern (11) and belongs to a separate operator action, not Results triage.

## 7. Consistency With Run Monitor

- Same reason-code palette (33).
- Same region color roles (36 §4 / 37 §5).
- Same "verdict priority" derivation (37 §4). A `Result` viewed live and later in Results MUST show identical verdict, reason, and overlays. Divergence is `E_RESULT_RENDER_DRIFT`.

## 8. Failure Taxonomy (UI-local)

| Code                         | When                                                              |
| ---------------------------- | ----------------------------------------------------------------- |
| `E_RESULTS_UNINDEXED_QUERY`  | Filter combination would full-scan.                               |
| `E_RESULTS_EXPORT_TOO_LARGE` | Export exceeds size budget.                                       |
| `E_RESULT_RECOMPUTED`        | UI shows a verdict that differs from the stored `Result.Verdict`. |
| `E_RESULT_RENDER_DRIFT`      | Same `Result` renders differently in Run Monitor and Results.     |
| `E_IMAGE_MISSING`            | Referenced image not on disk.                                     |

## 9. Cross-References

- `Result` schema, indexes, retention: 22.
- JSONL layout and shard rotation: 24.
- File names and paths for exports: 25.
- Instruction Bundle envelope used by the DetailPane: 36.
- Live counterpart: 37.
- Config keys (`UI.Results.*`): 27.

## Acceptance Checklist

- [ ] Results paginate over JSONL v2; no full-file load in UI.
- [ ] Filters resolve to indexed columns in Task DB (spec 22).
- [ ] Export uses `exportAuditBundle` per spec 72.
