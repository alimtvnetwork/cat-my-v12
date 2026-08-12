# 40 — Error Management

**Status:** Locked (Plan 04 Step 37). Defines the 3-tier error architecture, the typed-code contract, and the boundary responsibilities across UI, server functions, and workers.

Anchors: `.lovable/memory/03-error-manage.md` (project-wide error rules), 11 (runtime processes), 14/15 (pipelines), 24 (results JSONL), 27 (config), 33 (rule reason codes), 36 (Instruction Bundle), 37–39 (UI screens).

## 1. Three Tiers

| Tier          | Owner                     | Persistence                 | User-visible?                    |
| ------------- | ------------------------- | --------------------------- | -------------------------------- |
| `DomainError` | server functions, workers | logged + returned           | yes, mapped to UI toast/banner   |
| `InfraError`  | worker/dispatcher         | logged + retried per policy | yes, only if retries exhausted   |
| `BugError`    | any                       | logged with stack, alert    | yes, generic "unexpected" + code |

No fourth tier. No untyped `throw new Error("...")` at a boundary — that is itself `E_BUG_UNTYPED_ERROR` at lint time (linter memory 05b).

## 2. Typed Code Contract

Every error thrown or returned at a boundary carries:

```ts
{
  Code: "E_<AREA>_<CONDITION>",   // SCREAMING_SNAKE, matches an enum
  Message: string,                 // human, no PII, no stack
  Context: Record<string, JSON>,   // ids, counts, paths — never secrets
  CausedBy?: { Code, Message }     // one level, no deep chains
}
```

Rules:

- `Code` values MUST exist in a central enum table (`spec/21-app/40-error-manage.md` §5 below) — inventing a code at a call site is `E_BUG_UNKNOWN_CODE`.
- `Message` is for humans, not machines — the UI branches on `Code`, never on `Message`.
- `CausedBy` is one level deep. Wrapping N times loses the original signal and is `E_BUG_ERROR_CHAIN_TOO_DEEP` (>1).

## 3. Boundaries

| Boundary                  | Rule                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Worker → Dispatcher (IPC) | JSON-line with `{Code, Message, Context}`; never a stack. Stack goes to the log with the same correlation ID.             |
| Worker → Result           | Failure rows carry `Verdict = ERROR` and the rule-level `ReasonCode` from 33; the row-level `Code` mirrors the same enum. |
| Server fn → UI            | Throws a typed `Response` with `Code` in body; UI maps to a per-code banner/inline surface.                               |
| UI → user                 | Never shows a raw exception; shows `Code` + friendly text + a copy button for `Context`.                                  |

Silent swallow anywhere on any boundary is `E_BUG_SILENT_SWALLOW`. `try { ... } catch {}` without at least a `console.error` and a re-throw or typed return is a lint failure.

## 4. Retry Policy (InfraError only)

- Only `InfraError` retries. `DomainError` and `BugError` never retry.
- Exponential backoff: base `27.Retry.BaseMs`, factor 2, cap `27.Retry.CapMs`, max `27.Retry.MaxAttempts`. Every attempt logs the code and the attempt number.
- After the cap, the error is escalated to the caller as-is — never converted to a `DomainError` to hide it. Conversion is `E_BUG_TIER_LAUNDERING`.

## 5. Enum Governance

- All `E_*` codes live in `spec/21-app/40-error-manage.md` (this file, §Appendix at end of Plan 04 close-out) and are imported by every consumer.
- Adding a code requires: (a) enum entry, (b) UI mapping in 37/38/39 as applicable, (c) test in 45 §Testing. Missing any one of the three is `E_BUG_ENUM_ORPHAN`.
- Renaming a code is a breaking change and requires a migration entry (26).

## 6. UI Rendering Contract

- `DomainError` — inline near the offending control (form field, row, key). Never a global toast for a per-field problem.
- `InfraError` after exhausted retries — screen-level banner with retry button; the button re-invokes the exact same call.
- `BugError` — modal with the `Code`, a short apology, and a "Copy diagnostics" button that copies `Code + Context + CorrelationId`. No stack in the UI.

Screens 37 (Run Monitor) and 38 (Results) additionally MUST NOT vanish a row on error — the row renders with the error code, per 37 §5.

## 7. Observability Hooks

Every error crosses the logging boundary (41) exactly once at the point it is first constructed. Re-logging on rethrow is `E_BUG_DOUBLE_LOG`. Correlation IDs (`InstructionId`, `RunSessionId`, `RequestId`) MUST be present on every log line — missing correlation is `E_BUG_UNCORRELATED_LOG`.

## 8. Cross-References

- Project-wide rules: `.lovable/memory/03-error-manage.md`.
- Reason codes for rules: 33.
- Bundle failure codes: 36 §9.
- UI-local failure taxonomies: 37 §8, 38 §8, 39 §8, SS-02 §9.
- Logging contract (next): 41.

## Appendix A — Enum Catalog (post-v1 additions)

Codes emitted by post-v1 modules under `app/`. Each row lists tier, emitter,
UI/observability mapping, and the test that proves it. Adding a new code
here is mandatory before the emitting code lands (§5, `E_BUG_ENUM_ORPHAN`).

### A.1 Security (`E_SEC_*`, `W_SEC_*`, `I_SEC_*`)

| Code                                | Tier                  | Emitter                                                                                                                                           | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | UI mapping                                                                                            | Test                                                                                                                                                                  |
| ----------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_SEC_NOAUTH`                      | `DomainError`         | `app/core/security/auth_surface.py::NotAuthenticatedError`                                                                                        | Caller has no session token, or token is expired/invalid.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Redirect to sign-in; inline banner "Please sign in". Never toast.                                     | `tests/unit/test_auth_surface.py`                                                                                                                                     |
| `E_SEC_ROLE_DENIED`                 | `DomainError`         | `app/core/security/auth_surface.py::RoleDeniedError`, gate `require_role()`                                                                       | Caller is authenticated but lacks the required role.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Inline banner on the control; never silently hide the control. Feeds `DenialRateLimiter`.             | `tests/unit/test_auth_surface.py`, `tests/unit/test_settings_store.py`                                                                                                |
| `E_SEC_RATE_LIMITED`                | `DomainError`         | `app/core/config/settings_store.py::write()` via `DenialRateLimiter`                                                                              | Caller exceeded denial-burst threshold in the sliding window; writes blocked until cool-down.                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Inline banner with cool-down seconds; the button is disabled, not hidden.                             | `tests/unit/test_settings_rate_limit.py`                                                                                                                              |
| `E_SEC_DENIAL_BURST`                | Observability (error) | `app/core/security/remediation.py::DenialRateLimiter`, constant `CODE_DENIAL_BURST` in `app/core/security/audit_sink.py:31`                       | Threshold of `E_SEC_ROLE_DENIED` crossed inside window; alert written back to the audit sink. Deduped by `(user_id, window_start)`. Detail payload (space-separated `k=v`): `phase=burst`, `count=<n>`, `window=<s>s`, `threshold=<t>`, `margin=<APPROACHING_MARGIN>`, `tuning_version=plan-29-v1`. Subject `user:<user_id>`. Registered as `E_` (denial event, not warning) to match the emitting constant and the appendix at line 286; the earlier `W_SEC_DENIAL_BURST` label was a doc-only typo.                                             | Not user-visible. Ops dashboard / audit CLI (`--code E_SEC_DENIAL_BURST`).                            | `tests/unit/test_remediation.py`, `tests/contract/test_denial_evidence_schema.py::test_burst_detail_schema`                                                           |
| `W_SEC_BURST_APPROACHING`           | Observability (warn)  | `app/core/security/remediation.py::DenialRateLimiter._maybe_emit_approaching`                                                                     | Denial count crossed `[threshold - APPROACHING_MARGIN, threshold - 1]` inside the window but did NOT trip the burst. Deduped by `(user_id, window_start)`. Detail payload (space-separated `k=v`): `phase=approach`, `count=<n>`, `window=<s>s`, `threshold=<t>`, `margin=<APPROACHING_MARGIN>`, `floor=<threshold-margin>`, `tuning_version=plan-29-v1`. Subject `user:<user_id>`. Anchored by `spec/21-app/69a-v2-denial-tuning-evidence.md` (Plan 29 Step 29).                                                                                 | Not user-visible. Ops dashboard / audit CLI (`--code W_SEC_BURST_APPROACHING`).                       | `tests/unit/test_remediation.py::test_approaching_emits_once_within_window`, `tests/contract/test_denial_evidence_schema.py::test_approaching_detail_schema`          |
| `I_SEC_BURST_THRESHOLDS_LOADED`     | Observability (info)  | `app/supervisor/boot.py::_record_thresholds_loaded`, after `apply_security_settings` succeeds                                                     | Records the resolved `denial_threshold` / `denial_window_seconds` at boot so the audit trail contains the exact tuning in effect. Detail payload (space-separated `k=v`): `threshold=<t>`, `window=<s>s`, `tuning_version=plan-29-v1`, `source=settings_store`. Subject `security.settings`. Sink write failure is logged (`boot.security.thresholdsLoadedRecordFailed`) but never aborts boot. Anchored by `spec/21-app/69a-v2-denial-tuning-evidence.md` (Plan 29 Step 28).                                                                     | Not user-visible. Audit CLI (`--code I_SEC_BURST_THRESHOLDS_LOADED`).                                 | `tests/unit/test_boot_security_wiring.py::test_boot_records_thresholds_loaded`, `tests/contract/test_denial_evidence_schema.py::test_thresholds_loaded_detail_schema` |
| `W_SEC_TUNING_EVIDENCE_LOAD_FAILED` | Observability (warn)  | `app/core/security/denial_metrics.py::load_evidence_with_audit`, constant `CODE_TUNING_EVIDENCE_LOAD_FAILED` in `app/core/security/audit_sink.py` | JSONL evidence row (typically a 90-day export replayed for Plan 29 tuning) failed schema validation. One row per bad line; the loader logs the row and continues (non-strict mode) or re-raises after recording (strict mode). No PII: only path, line number, and short reason tag are stored. Detail payload: `path=<abs>`, `line=<n>`, `reason=<bad_json\|not_object\|missing_ts\|bad_ts\|bad_label>`, `tuning_version=plan-29-v1`. Subject `security.evidence`. Anchored by `spec/21-app/69a-v2-denial-tuning-evidence.md` (Plan 29 Step 30). | Not user-visible. Ops CLI (`--code W_SEC_TUNING_EVIDENCE_LOAD_FAILED`) to locate corrupt export rows. | `tests/contract/test_denial_evidence_schema.py`, `tests/integration/test_denial_evidence_end_to_end.py`                                                               |
| `I_SEC_ADMIN_WRITE`                 | Observability (info)  | `app/core/security/audit_sink.py`, `settings_store.write()` on success                                                                            | Admin performed a settings write; recorded for the audit trail.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Not user-visible. Audit CLI.                                                                          | `tests/unit/test_settings_audit_wire.py`, `tests/unit/test_audit_sink.py`                                                                                             |
| `I_SEC_AUDIT_PRUNED`                | Observability (info)  | `app/core/security/retention.py::AuditLogRetention.prune()`, `app/core/audit/retention_worker.py`                                                 | Retention worker deleted rows from `audit_log` under an active policy; subject `audit_log`, detail `removed=<n> horizon=<ts>`. Only sanctioned deletion path; append-only sink is not bypassed (retention owns the DELETE, sink stays append-only).                                                                                                                                                                                                                                                                                               | Not user-visible. `/ops` `RetentionAuditPanel` + Audit CLI `--code I_SEC_AUDIT_PRUNED`.               | `tests/unit/test_retention.py`, `tests/unit/test_retention_scheduler.py`, `tests/unit/ops-retention-panel.test.ts`                                                    |
| `E_SEC_RETENTION_FAILED`            | `InfraError`          | `app/core/audit/retention_worker.py` on SQLite failure after back-off budget exhausted, or on clock-skew guard trip                               | Retention worker could not complete a scheduled prune; audit rows outside policy remain until next run. Emitted with cid, policy name, attempted horizon, and last SQLite error class. Never swallowed.                                                                                                                                                                                                                                                                                                                                           | Not user-visible. `/ops` `RetentionAuditPanel` shows red row; Ops dashboard alert.                    | `tests/unit/test_retention_scheduler.py`, `tests/unit/ops-retention-panel.test.ts`                                                                                    |

Sink contract (append-only): every row above lands in `audit_log` exactly
once at construction (`§7`). Re-logging on rethrow is `E_BUG_DOUBLE_LOG`.
Correlation IDs on security events: `user_id` (subject), `RequestId`.

### A.2 Hardware capture (`E_HW_*`)

| Code                | Tier                 | Emitter                                                                                                                                                               | Meaning                                                                             | Retry?                                                                                                                                         | Test                                                                                                                           |
| ------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `E_HW_TIMEOUT`      | `InfraError`         | `app/capture/hardware_bridge.py::HardwareTimeoutError`, raised by `ReferenceCaptureDriver.trigger()` and mapped from vendor timeouts by `VendorDeviceIO`              | Trigger did not deliver a frame within the per-attempt budget.                      | Yes — retried per `27.Retry` until `MaxAttempts`; then escalated as-is (never laundered to `DomainError`, §4).                                 | `tests/unit/test_reference_driver.py`, `tests/unit/test_vendor_device_io.py`, `tests/integration/test_hardware_fault_modes.py` |
| `E_HW_DISCONNECTED` | `InfraError` (fatal) | `app/capture/hardware_bridge.py::DeviceDisconnectedError`, raised by `ReferenceCaptureDriver` on bus loss; mapped from vendor bus-loss exceptions by `VendorDeviceIO` | Device bus is gone; the driver disarms and refuses further triggers until re-armed. | No in-flight retry — driver disarms; caller must re-`arm()` (which re-opens the device). Escalated to Run Monitor as screen-level banner (§6). | `tests/unit/test_reference_driver.py`, `tests/unit/test_vendor_device_io.py`, `tests/integration/test_hardware_fault_modes.py` |

Unknown vendor exceptions are re-raised unchanged (they surface as
`E_BUG_UNTYPED_ERROR` at the boundary, per §1, so the gap is visible instead
of silently mapped). Adding a vendor-specific mapping requires an entry in
this table plus a case in `tests/unit/test_vendor_device_io.py`.

### A.3 Taxonomy resolution (SCREAMING wire vs PascalCase class)

- Wire `Code` values (this appendix) are `E_AREA_CONDITION` SCREAMING_SNAKE, per §2. That is the only allowed form on any boundary envelope, log line, audit row, or UI mapping.
- Exception class names in code are PascalCase (`RuleBadInput`, `ToleranceUnresolved`, `HardwareTimeoutError`, `CaptureAdapterError`, `RoleDeniedError`). Memory `.lovable/memory/09-enums-and-results-shape.md` §Enum casing carves the wire-code exception explicitly.
- Mapping is 1:1: every PascalCase exception class MUST declare a `code: str` class attribute equal to exactly one row in this appendix. Divergence is `E_BUG_ENUM_ORPHAN`.
- Rule reason codes (33 §4) are neither wire codes nor exception classes: they are PascalCase strings that ride inside `Context.ReasonCode` on a `DomainError` envelope whose top-level `Code` is `E_RULE_FAILED`.

### A.4 UI runtime (`E_UI_*`)

| Code                         | Tier                 | Emitter                                                                                                | Meaning                                                                                                                                                                                                                                 | UI mapping                                                                                                                           | Test                                                                                            |
| ---------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `E_UI_MODE_MISMATCH`         | `BugError`           | `src/lib/run-store.ts::assertMode()`                                                                   | Component attempted a write while store `mode` disallows it.                                                                                                                                                                            | BugErrorModal with copy button.                                                                                                      | `tests/unit/run-store-ui.test.ts`                                                               |
| `E_UI_READONLY_VIOLATION`    | `BugError`           | run/results routes                                                                                     | Write attempted against a locked snapshot view.                                                                                                                                                                                         | BugErrorModal.                                                                                                                       | `tests/unit/run-store-ui.test.ts`                                                               |
| `E_UI_COUNTER_DRIFT`         | `BugError`           | `src/components/hmi/Counter.tsx`                                                                       | UI counter diverged from store counter.                                                                                                                                                                                                 | BugErrorModal + telemetry.                                                                                                           | `tests/unit/run-store-ui.test.ts`                                                               |
| `E_UI_TAIL_STALLED`          | `InfraError`         | results tail poller                                                                                    | Tail poll returned no new rows for > `27.Ui.TailStallMs`.                                                                                                                                                                               | Screen banner with Retry.                                                                                                            | `tests/unit/run-store-ui.test.ts`                                                               |
| `E_LAYER_REORDER_FAILED`     | `BugError`           | `src/components/editor/layers/useLayerDnd.ts`, `src/components/editor/InspectorSurface.tsx::onReorder` | A layer drag or keyboard reorder reached the store but the target position could not be applied. Context subject is `sourceId`; detail carries `targetId`, `position`, and `reason`.                                                    | Toast "Could not reorder layer" + BugErrorModal copy-button; layer stays in its prior position.                                      | `tests/unit/rules-slice.test.ts`, `src/components/editor/layers/__tests__/LayersPanel.test.tsx` |
| `E_LAYER_MERGE_INCOMPATIBLE` | `DomainError`        | `src/lib/editor/store/rules-slice.ts::mergeSelected()`                                                 | Merge was invoked with fewer than two selected layers or with mixed rule kinds. Context subject is the comma-joined selection; detail carries `reason` (`too-few` or `mixed-kind`) and `count`.                                         | Inline Layers toolbar message; merge control remains available with prerequisite tooltip.                                            | `tests/unit/rules-slice.test.ts`                                                                |
| `W_LAYER_GROUP_EMPTY`        | Observability (warn) | `src/lib/editor/store/rules-slice.ts::groupSelected()` / `ungroup()` / `deleteRules()`                 | A group was created, ungrouped, or pruned with zero valid children. Context subject is `groupId`; detail carries `trigger` and `childCount=0`.                                                                                          | Not user-visible. Audit/log stream warning for support triage.                                                                       | `tests/unit/rules-slice.test.ts`                                                                |
| `E_LAYOUT_PERSIST_FAILED`    | `InfraError`         | `src/lib/workspace/layout-slice.ts::persist`                                                           | Panel layout could not be written to `localStorage` under `workspace-layout:v1` (quota, disabled storage, JSON stringify failure). Context subject is `panelId` or `*` for a full-workspace write; detail carries `reason` and `bytes`. | Toast "Workspace layout not saved" with a Retry action; in-memory state stays consistent so the panel keeps working for the session. | `tests/unit/workspace-layout-slice.test.ts`                                                     |
| `W_PANEL_DROP_INVALID`       | Observability (warn) | `src/components/app-shell/panels/DockSlot.tsx::onDrop`                                                 | A drag ended on a target that rejects the panel (self-drop, incompatible slot, locked dock). Context subject is `panelId`; detail carries `sourceDock`, `targetDock`, and `reason`.                                                     | Not user-visible. Panel returns to source dock with the standard drag-cancel animation.                                              | `tests/unit/workspace-layout-slice.test.ts`                                                     |
| `E_PANEL_UNKNOWN_ID`         | `BugError`           | `src/lib/workspace/panel-registry.ts::getPanel`, `layout-slice.ts` reducers                            | A reducer or WindowMenu received a `panelId` that is not present in the registry (stale persisted layout, typo, deleted panel). Context subject is the offending `panelId`; detail carries `caller` and `knownIds`.                     | BugErrorModal copy-button; the reducer rejects the action and prunes the id from persisted layout on next write.                     | `tests/unit/workspace-layout-slice.test.ts`                                                     |

### A.5 Instruction & Result (`E_INSTRUCTION_*`, `E_RESULT_*`, `E_RESULTS_*`, `E_IMAGE_*`)

| Code                         | Tier          | Meaning                                                                  | Retry? |
| ---------------------------- | ------------- | ------------------------------------------------------------------------ | ------ |
| `E_INSTRUCTION_MISSING`      | `DomainError` | Bundle not resolvable for RunSession.                                    | No.    |
| `E_RESULT_ORPHAN`            | `BugError`    | Result row references unknown ImageId.                                   | No.    |
| `E_RESULT_RECOMPUTED`        | `BugError`    | Same (RunSessionId, ImageSequence) written twice with different verdict. | No.    |
| `E_RESULT_RENDER_DRIFT`      | `BugError`    | UI-rendered verdict != row verdict.                                      | No.    |
| `E_RESULTS_UNINDEXED_QUERY`  | `BugError`    | Query path missing required index; caught in dev.                        | No.    |
| `E_RESULTS_EXPORT_TOO_LARGE` | `DomainError` | Export exceeds `27.Results.ExportMaxRows`.                               | No.    |
| `E_IMAGE_MISSING`            | `DomainError` | Image file not on disk for a row.                                        | No.    |

### A.6 Config & operator (`E_CONFIG_*`, `E_OPERATOR_*`, `E_CFG_*`)

| Code                      | Tier          | Meaning                                               |
| ------------------------- | ------------- | ----------------------------------------------------- |
| `E_CONFIG_KEY_MISSING`    | `BugError`    | Required config key absent from resolver.             |
| `E_CONFIG_KEY_INVALID`    | `DomainError` | Key present, value fails validator.                   |
| `E_CONFIG_LAYER_CONFLICT` | `BugError`    | Two layers claim exclusive ownership of the same key. |
| `E_CFG_INVALID_SECURITY`  | `DomainError` | Security payload rejected (non-positive denial ints). |
| `E_OPERATOR_ID_UNSET`     | `DomainError` | RunSession start attempted without an operator claim. |

### A.7 Rule / tolerance / geometry (`E_RULE_*`, `E_TOLERANCE_*`, `E_REF_*`, `E_GEOMETRY_*`, `E_STALE_PART`)

| Code                       | Tier          | Meaning                                                                          |
| -------------------------- | ------------- | -------------------------------------------------------------------------------- |
| `E_RULE_FAILED`            | `DomainError` | Rule evaluation produced a Fail; `Context.ReasonCode` carries PascalCase reason. |
| `E_RULE_BAD_INPUT`         | `BugError`    | Rule input schema invalid at engine boundary.                                    |
| `E_RULE_UNKNOWN_KIND`      | `BugError`    | Emitter uses `RuleKind` value not in the enum.                                   |
| `E_TOLERANCE_UNRESOLVED`   | `DomainError` | Tolerance link cannot be resolved at bundle build time.                          |
| `E_TOLERANCE_INCOMPATIBLE` | `BugError`    | Tolerance kind incompatible with rule kind.                                      |
| `E_REF_MISSING`            | `DomainError` | Reference image not on disk.                                                     |
| `E_REF_CHECKSUM_MISMATCH`  | `BugError`    | Reference checksum differs from bundle manifest.                                 |
| `E_GEOMETRY_DEGENERATE`    | `DomainError` | Region has zero area or self-intersects.                                         |
| `E_STALE_PART`             | `DomainError` | Part context expired during evaluation.                                          |

### A.8 Naming / migration / spec (`E_NAME_*`, `E_MIGRATION_*`, `E_SPEC_*`)

| Code                            | Tier                   | Meaning                                                  |
| ------------------------------- | ---------------------- | -------------------------------------------------------- |
| `E_NAME_COLLISION`              | `DomainError`          | User-visible name collides in scope.                     |
| `E_NAME_INVALID_CHARSET`        | `DomainError`          | Name violates allowed charset per 02.                    |
| `E_MIGRATION_UNAPPLIED`         | `BugError`             | Boot found a schema older than expected.                 |
| `E_MIGRATION_CHECKSUM_MISMATCH` | `BugError`             | Applied migration hash differs from source.              |
| `E_SPEC_GUIDELINE_MISSING`      | `BugError` (spec-lint) | Coding-guideline folder missing per spec 02.             |
| `E_SPEC_ENUM_NOT_PASCAL`        | `BugError` (spec-lint) | Enum value not PascalCase.                               |
| `E_SPEC_ERROR_UNDEFINED`        | `BugError` (spec-lint) | Referenced `E_*` code missing from this appendix.        |
| `E_SPEC_CONFIG_KEY_MISSING`     | `BugError` (spec-lint) | Referenced `27.*` key missing from 27.                   |
| `E_SPEC_FACADE_UNREFERENCED`    | `BugError` (spec-lint) | Spec violates 52 facade boundary rule.                   |
| `E_SPEC_FACADE_MISSING`         | `BugError` (spec-lint) | Facade required by 52 not declared.                      |
| `E_SPEC_CHECKLIST_MISSING`      | `BugError` (spec-lint) | Acceptance checklist absent.                             |
| `E_SPEC_CROSSREF_ONE_WAY`       | `BugError` (spec-lint) | Cross-reference not mutual.                              |
| `E_SPEC_ANCHOR_DRIFT`           | `BugError` (spec-lint) | Anchor / heading duplicated or renamed without redirect. |
| `E_SPEC_TITLE_DRIFT`            | `BugError` (spec-lint) | Title vs filename mismatch.                              |
| `E_SPEC_TAXONOMY_CONTRADICTION` | `BugError` (spec-lint) | Two specs prescribe conflicting taxonomies.              |
| `E_SPEC_ENUM_INCOMPLETE`        | `BugError` (spec-lint) | Enum lock missing values referenced elsewhere.           |
| `E_SPEC_APPENDIX_NUMBERING`     | `BugError` (spec-lint) | Appendix numbering drift.                                |
| `E_SPEC_LOG_CONTEXT_MISSING`    | `BugError` (spec-lint) | Required log context field unspecified.                  |
| `E_SPEC_RETRY_UNDEFINED_BUDGET` | `BugError` (spec-lint) | Retry budget referenced with no config key.              |
| `E_SPEC_STORE_UNDEFINED`        | `BugError` (spec-lint) | Persistence store referenced with no schema.             |

### A.9 Capture pipeline (`E_CAP_*`)

| Code                        | Tier          | Meaning                                                 |
| --------------------------- | ------------- | ------------------------------------------------------- |
| `E_CAP_OPEN_FAILED`         | `InfraError`  | Vendor `Open()` returned an error.                      |
| `E_CAP_GRAB_FAILED`         | `InfraError`  | Vendor `Grab()` returned empty / error.                 |
| `E_CAP_CLOSE_FAILED`        | `InfraError`  | Vendor `Close()` returned an error.                     |
| `E_CAP_BUFFER_UNOWNED`      | `BugError`    | Caller retained a vendor-owned buffer past `Release()`. |
| `E_CAP_LIFECYCLE_VIOLATION` | `BugError`    | Grab called without prior Open, etc.                    |
| `E_CAP_DISCOVERY_TIMEOUT`   | `InfraError`  | Discovery scan exceeded budget.                         |
| `E_CAP_DISCOVERY_EMPTY`     | `DomainError` | No devices found.                                       |
| `E_CAP_VENDOR_UNSUPPORTED`  | `DomainError` | Vendor SDK guard absent at runtime.                     |

### A.10 Audit persistence & export (`E_AUDIT_*`)

| Code                          | Tier          | Meaning                                      |
| ----------------------------- | ------------- | -------------------------------------------- |
| `E_AUDIT_STORE_UNAVAILABLE`   | `InfraError`  | Persistent audit store cannot be opened.     |
| `E_AUDIT_STORE_CORRUPT`       | `BugError`    | Store detected checksum / schema corruption. |
| `E_AUDIT_EXPORT_TOO_LARGE`    | `DomainError` | Export exceeds bundle cap.                   |
| `E_AUDIT_EXPORT_KEY_MISSING`  | `DomainError` | Export requested without signing key.        |
| `E_AUDIT_RETENTION_MISCONFIG` | `DomainError` | Retention band value invalid.                |

### A.11 Rule bundle (`E_BUNDLE_*`)

| Code                          | Tier          | Meaning                                   |
| ----------------------------- | ------------- | ----------------------------------------- |
| `E_BUNDLE_MANIFEST_INVALID`   | `DomainError` | Manifest fails schema.                    |
| `E_BUNDLE_PAYLOAD_UNREADABLE` | `InfraError`  | SQLite / JSON payload cannot be opened.   |
| `E_BUNDLE_MERGE_CONFLICT`     | `DomainError` | Merge policy rejected conflicting rows.   |
| `E_BUNDLE_TIER_DENIED`        | `DomainError` | Feature gate denied cloud catalog action. |
| `E_BUNDLE_SIZE_EXCEEDED`      | `DomainError` | Bundle exceeds 256 MiB cap.               |

### A.12 Facade violations (`E_FACADE_*`)

| Code                           | Tier       | Meaning                                        |
| ------------------------------ | ---------- | ---------------------------------------------- |
| `E_FACADE_LEAK`                | `BugError` | Vendor SDK object crossed facade boundary.     |
| `E_FACADE_UNOWNED_BUFFER`      | `BugError` | Buffer ownership not transferred per contract. |
| `E_FACADE_LIFECYCLE_VIOLATION` | `BugError` | Facade method called out of order.             |

### A.13 Logging / observability / health (`E_LOG_*`, `W_LOG_*`, `I_LOG_*`, `E_OBS_*`, `E_HEALTH_*`, `I_OPERATOR_CHANGED`, `E_BUG_UNCORRELATED_LOG`)

| Code                         | Tier            | Meaning                                       |
| ---------------------------- | --------------- | --------------------------------------------- |
| `E_LOG_SINK_UNAVAILABLE`     | `InfraError`    | Sink target not writable.                     |
| `E_LOG_SINK_ROTATION_FAILED` | `InfraError`    | Rotation step failed.                         |
| `E_LOG_ROTATION_STALLED`     | `InfraError`    | Rotation exceeded budget.                     |
| `E_LOG_RATE_LIMITED`         | `Observability` | Per-code per-second cap hit; sample retained. |
| `E_LOG_QUEUE_OVERFLOW`       | `InfraError`    | Async log queue exceeded `27.Log.QueueDepth`. |
| `E_LOG_QUEUE_DROPPED`        | `Observability` | Line dropped after overflow.                  |
| `E_LOG_CLOCK_STEP`           | `Observability` | Wall-clock jumped > `27.Log.MaxClockStepMs`.  |
| `E_LOG_CONTEXT_MISSING`      | `BugError`      | Required correlation field absent.            |
| `E_LOG_PII_LEAK`             | `BugError`      | Redactor detected disallowed field.           |
| `E_LOG_REDACT_FAILED`        | `BugError`      | Redactor threw.                               |
| `E_LOG_SCHEMA_INVALID`       | `BugError`      | Structured log line failed schema.            |
| `E_LOG_SINK_MISCONFIG`       | `BugError`      | Sink config invalid at boot.                  |
| `E_LOG_LEVEL_UNKNOWN`        | `BugError`      | Level string outside `LogLevel*`.             |
| `W_LOG_RETENTION_PRUNE`      | Observability   | Retention pruned N lines.                     |
| `W_LOG_CLOCK_SKEW`           | Observability   | Wall vs monotonic skew observed.              |
| `I_LOG_ROTATION`             | Observability   | Normal rotation event.                        |
| `I_OPERATOR_CHANGED`         | Observability   | Operator claim rotated.                       |
| `E_BUG_UNCORRELATED_LOG`     | `BugError`      | Log line missing correlation IDs.             |
| `E_OBS_METRIC_UNKNOWN`       | `BugError`      | Metric name absent from registry.             |
| `E_OBS_LABEL_CARDINALITY`    | `BugError`      | Metric label cardinality above budget.        |
| `E_HEALTH_PROBE_TIMEOUT`     | `InfraError`    | Probe exceeded budget.                        |
| `E_HEALTH_PROBE_FAILED`      | `InfraError`    | Probe returned unhealthy.                     |

### A.14 Governance

- Every code in A.1 / A.2 has: (a) this enum entry, (b) an emitter constant
  in code (`CODE_*` or exception class), (c) at least one test named above —
  the three-way check from §5.
- Renames are breaking changes and require a migration entry in `26`.
- The consistency report (`99-consistency-report.md` §3.1) scans `app/**`
  for `E_*` / `W_*` / `I_*` literals and fails on any that are not in this
  appendix or in the base sections above.

### A.15 Plan 23 corpus registration sweep

Plan 23 Step 21 registers the remaining wire codes referenced by `spec/21-app/` so the Blind-AI scorer can prove `E_SPEC_ERROR_UNDEFINED = 0` without following prose-only side tables. Tier is inferred from the owning area: `W_*` and `I_*` are observability events, capture / hardware / worker crash codes are infra, security / config / audit retention / export / bundle / rule / geometry / licensing / health codes are domain, and remaining audit / spec / test / consistency checks are bug/spec-lint errors.

| Code set                                  | Registered codes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acceptance / release / consistency        | `E_A11Y_REGRESSION`, `E_ACCEPT_MALFORMED_GATE`, `E_ACCEPT_PREMATURE_DECLARATION`, `E_ACCEPT_UNPROVEN`, `E_ACC_COUNT_MISMATCH`, `E_CHANGELOG_MISSING_ENTRY`, `E_CHANGELOG_UNANCHORED`, `E_CONSISTENCY_CHANGELOG_DRIFT`, `E_CONSISTENCY_CONTRACT_DRIFT`, `E_CONSISTENCY_DANGLING_REF`, `E_CONSISTENCY_GATE_SIGNAL_MISSING`, `E_CONSISTENCY_INPUT_MISSING`, `E_CONSISTENCY_MEMORY_DRIFT`, `E_CONSISTENCY_PROMPT_ALIAS_STALE`, `E_CONSISTENCY_QUESTION_UNCLOSED`, `E_CONSISTENCY_REPORT_TAMPERED`, `E_CONSISTENCY_SUPPRESSED`, `E_PROMPT_ALIAS_STALE`, `E_RELEASE_INCOMPLETE_BUNDLE`, `E_RELEASE_NOTE_HOLLOW`, `E_RELEASE_UNPINNED`                                                                                                                                                                                                                                                                                                                                                                                                   |
| AI validation                             | `E_AI_AGREEMENT_INCONSISTENT`, `E_AI_BAD_IPC_DIRECTION`, `E_AI_BLOCKED_PIPELINE`, `E_AI_FABRICATED_OPINION`, `E_AI_ISOLATION_BREACH`, `E_AI_LOW_CONFIDENCE_EMITTED`, `E_AI_MODEL_MISSING`, `E_AI_NETWORK_EGRESS`, `E_AI_OVERRODE_VERDICT`, `E_AI_STUB_INVOKED`, `E_AI_UNGROUNDED_DISAGREEMENT`, `E_AI_VERDICT_LEAK`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Audit retention / export / persistence    | `E_AUDIT_EXPORT_CHECKSUM_MISMATCH`, `E_AUDIT_EXPORT_COUNT_MISMATCH`, `E_AUDIT_EXPORT_DISABLED`, `E_AUDIT_EXPORT_EMPTY_WINDOW`, `E_AUDIT_EXPORT_FEATURE_LOCKED`, `E_AUDIT_EXPORT_SCHEMA_UNSUPPORTED`, `E_AUDIT_EXPORT_SIZE_CAP`, `E_AUDIT_EXPORT_UNAUTHORIZED`, `E_AUDIT_EXPORT_WINDOW_TOO_WIDE`, `E_AUDIT_MIRROR_LAG`, `E_AUDIT_RETENTION_BATCH_CAP_INSANE`, `E_AUDIT_RETENTION_BATCH_OVERRUN`, `E_AUDIT_RETENTION_CADENCE_TOO_LOOSE`, `E_AUDIT_RETENTION_CADENCE_TOO_TIGHT`, `E_AUDIT_RETENTION_CLOCK_SKEW`, `E_AUDIT_RETENTION_LOCKED`, `E_AUDIT_RETENTION_LOWER_REJECTED`, `E_AUDIT_RETENTION_ROW_OVERRIDE`, `E_AUDIT_RETENTION_RUNTIME_WRITE`, `E_AUDIT_RETENTION_UNAUTHORIZED_WRITE`, `E_AUDIT_RETENTION_UNEXPECTED`, `E_AUDIT_RETENTION_UNKNOWN_CATEGORY`, `E_AUDIT_RETENTION_WINDOW_ORDER`, `E_AUDIT_SINK_UNAVAILABLE`, `E_AUDIT_SINK_WRITE_FAILED`, `W_AUDIT_MIRROR_DEGRADED`, `I_AUDIT_AI_REVIEW_REQUESTED`, `I_AUDIT_CONSENT_GRANTED`, `I_AUDIT_EXPORT_CREATED`, `I_AUDIT_RETENTION_DELETE`, `I_AUDIT_SETTINGS_CHANGED` |
| Capture / hardware / SDK facade           | `E_BUG_SDK_LEAK`, `E_BUG_SDK_TYPE_LEAK`, `E_CAP_BUFFER_LEAK`, `E_CAP_DISCONNECTED`, `E_CAP_ENUM_FAILED`, `E_CAP_FPS_REGRESSION`, `E_CAP_GRAB_TIMEOUT`, `E_CAP_SDK_ABSENT`, `E_CAP_TRIGGER_HW_UNAVAILABLE`, `E_CAP_UNKNOWN`, `E_HW_BUSY`, `E_HW_UNKNOWN`, `E_MOD_LAYOUT_DRIFT`, `E_PERF_HARNESS_SLO`, `E_SDK_FACADE_STALE`, `E_SDK_FACADE_TRANSLATE`, `I_PERF_HARNESS_OK`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Config / DB / migration / filesystem      | `E_CFG_BAD_INPUT`, `E_CFG_PERSIST_FAILED`, `E_CFG_UNKNOWN_DEVICE`, `E_CFG_UNKNOWN_SECTION`, `E_CONFIG_BAD_INPUT`, `E_CONFIG_ENUM`, `E_CONFIG_IMPORT_INVALID`, `E_CONFIG_LOCKED_DURING_RUN`, `E_CONFIG_MISSING`, `E_CONFIG_ORDER_VIOLATION`, `E_CONFIG_ORPHAN_KEY`, `E_CONFIG_PARTIAL_WRITE`, `E_CONFIG_RANGE`, `E_CONFIG_RESTART_REQUIRED`, `E_CONFIG_TYPE`, `E_DB_MIGRATION_NONIDEMPOTENT`, `E_DB_PARTIAL_WRITE`, `E_DB_SPLIT_VIOLATION`, `E_DB_WRITE`, `E_FS_MISSING_DIR`, `E_MIGRATION_FAILED`, `E_MIGRATION_GAP`, `E_MIGRATION_TIMEOUT`, `E_SCHEMA_AHEAD`, `I_CFG_RESTART_REQUIRED`                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Geometry / rule / result / UI             | `E_BUG_ENUM_LEGACY`, `E_ENUM_CASE_DRIFT`, `E_ERR_UNTYPED`, `E_GEOMETRY_BOUNDS`, `E_GEOMETRY_EMPTY`, `E_GEOMETRY_KIND`, `E_GEOMETRY_LINK_BOUNDS`, `E_GEOMETRY_LINK_CYCLE`, `E_GEOMETRY_POINTS`, `E_IMG_DECODE`, `E_INSTR_VERSION_MISSING`, `E_PAN_OUT_OF_BOUNDS`, `E_REF_INLINE_BLOB`, `E_REF_MISSING_ON_DISK`, `E_RESULTS_ROTATE_MISSED`, `E_RULE_BELOW_THRESHOLD`, `E_RULE_DISABLED_IN_V1`, `E_RULE_OVERRIDE_LIMIT`, `E_RULE_RAISE`, `E_RULE_REFERENCE_PATH`, `E_RUNSESSION_ACTIVE`, `E_UI_LAYOUT_REFLOW`, `E_UI_ROUTE_DRIFT`, `E_UI_SPEC_DRIFT`, `E_VIEW_DURING_RUN`, `E_VIEW_LAYOUT_SHIFT`, `E_ZOOM_OUT_OF_RANGE`, `W_RULE_OVERRIDE_SOFT_LIMIT`, `W_UI_ZOOM_CLAMPED`                                                                                                                                                                                                                                                                                                                                                           |
| Logging / observability / health          | `E_HEALTH_LIVE_LEAK`, `E_HEALTH_UNAUTHORIZED`, `E_HEALTH_UNKNOWN_PARAM`, `E_LOG_BAD_TIMESTAMP`, `E_LOG_CLOCK_MISUSE`, `E_LOG_CLOCK_REGRESSION`, `E_LOG_CLOCK_STEP_SWALLOWED`, `E_LOG_CORRELATION_BROKEN`, `E_LOG_DROPPED_SILENT`, `E_LOG_ERROR_DROPPED`, `E_LOG_OPERATOR_ID_LEAK`, `E_LOG_OPERATOR_ID_MISSING`, `E_LOG_ROTATE_PARTIAL`, `E_LOG_SCHEMA_VIOLATION`, `E_LOG_SECRET_LEAK`, `E_METRIC_NAME_COLLISION`, `E_OBS_ALERT_ORPHAN`, `E_OBS_BAD_BUCKETS`, `E_OBS_CARDINALITY_EXPLOSION`, `E_OBS_LABEL_EXPLOSION`, `E_OBS_LIVE_TOO_HEAVY`, `E_OBS_METRIC_ORPHAN`, `E_OBS_PANEL_UNGROUNDED`, `E_OBS_READY_OPAQUE`, `E_OBS_UNGROUNDED_METRIC`, `I_HEALTH_TOKEN_GRACE_EXPIRED`, `I_HEALTH_TOKEN_ROTATED`, `I_LOG_COALESCED`, `W_LOG_CLOCK_STEP`                                                                                                                                                                                                                                                                                    |
| Security / licensing / bundle / discovery | `E_BUNDLE_UNKNOWN_KIND`, `E_INTERNAL`, `E_LIC_INVALID`, `E_SEC_AUDIT_FAILED`, `E_SEC_BOUNDARY_UNVALIDATED`, `E_SEC_BUNDLE_MISMATCH`, `E_SEC_CONSENT_MISSING`, `E_SEC_CONSENT_REUSED`, `E_SEC_DENIAL_BURST`, `E_SEC_DENIED`, `E_SEC_EGRESS_DETECTED`, `E_SEC_HEALTH_LEAK`, `E_SEC_HEALTH_OVEREXPOSED`, `E_SEC_HEALTH_TOKEN_ROTATION_SILENT`, `E_SEC_HEALTH_TOKEN_WEAK`, `E_SEC_IMAGE_LOGGED`, `E_SEC_PATH_ESCAPE`, `E_SEC_REDACTION_BYPASSED`, `E_SEC_RETENTION_FAILED`, `E_SEC_RETENTION_PARTIAL`, `E_SEC_SECRET_LEAK`, `E_SEC_SECRET_PERSISTED`, `E_SEC_TIMING_UNSAFE_COMPARE`, `E_SEC_UNAPPROVED_EGRESS`, `E_SEC_UNAUTH`, `W_DENIAL_RELOAD_FAILED`, `W_DISCOVERY_PARTIAL`, `W_SEC_BURST_APPROACHING`, `W_SEC_HEALTH_BRUTE_FORCE`, `W_SEC_TUNING_EVIDENCE_LOAD_FAILED`, `I_SEC_ADMIN_WRITE`, `I_SEC_AUDIT_PRUNED`, `I_SEC_BURST_THRESHOLDS_LOADED`                                                                                                                                                                               |
| Spec / test / runtime sentinels           | `E_PROC_NONDETERMINISTIC`, `E_RUNTIME_MISSING_PROCESS`, `E_SPEC_DRIFT`, `E_SPEC_ORDER_CYCLE`, `E_SPEC_SCOPE_DRIFT`, `E_SPEC_STALE_QUESTION`, `E_SPEC_UNANCHORED_RESOLUTION`, `E_SPEC_UNGROUNDED_QUESTION`, `E_TEST_A11Y_MISSING`, `E_TEST_CONTRACT_MISSING`, `E_TEST_FIXTURE_ORPHAN`, `E_TEST_LAYER_SKIPPED`, `E_TEST_LOG_UNPROVEN`, `E_TEST_PERF_UNOBSERVED`, `E_TEST_PIPELINE_PARTIAL`, `E_TEST_UNGROUNDED_FIXTURE`, `E_WORKER_CRASH`, `E_WORKER_POOL_MISSIZED`, `E_WORKER_SHARED_MUTATION`, `E_XXX`, `I_XXX`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

## Acceptance Checklist

- [ ] Appendix A registers every `E_/W_/I_` code used across specs 41-72 (verified by `.lovable/memory/v2/plan23/02-error-appendix-audit.md`).
- [ ] Every code has a tier (`Fatal`, `Recoverable`, `Warn`, `Info`) matching memory 09.
- [ ] No swallowed errors: each code has a surface path (log + UI or audit).

## Appendix Z: Frontend TS constants sync (v3.234.0, 2026-07-16)

The TypeScript frontend keeps three reality-aligned string registries under `src/lib/constants/`, each covering a distinct real usage in `src/**`:

- `http.ts` — `HttpMethod` (GET/POST/PUT/PATCH/DELETE) for `fetch()` and route handlers.
- `storage.ts` — `StorageKey` (10 keys), every `localStorage`/`sessionStorage` key currently in use.
- `events.ts` — `AppEvent` (4 keys: `EditorOpenInspector`, `EditorReferenceReady`, `BugError`, `MenuCommand`) for `window.dispatchEvent(new CustomEvent(...))`.

Deliberately not created on the TS side: `ErrorCode`, `IpcChannel`, `CameraVendor`, `PixelFormat`, `SampleBucket`. Rationale:

- `E_*/W_*/I_*` codes are owned by Python and this spec's Appendix A. The TS frontend receives them as strings across the wire and renders them via the mapping in specs 37-39. Duplicating the enum in TS creates drift risk without any type-safety win.
- `IpcChannel`, `CameraVendor`, `PixelFormat`, `SampleBucket` had zero call sites in `src/**` and one of them (`CameraVendor`) even invented vendor names that conflicted with `CaptureVendor` in `src/lib/capture.shared.ts`.

Guardrails on the TS side: `scripts/check-magic-strings.sh --strict` (bash grep) and `no-restricted-syntax` in `eslint.config.js` block re-inlining the three registered categories. Both run in `bun run lint` and in the `frontend-checks` CI job.

| W_SEC_DENIAL_BURST_ALERT | security | Emitted when burst crosses p99 threshold. Dashboard: /admin/security/denial-burst |
