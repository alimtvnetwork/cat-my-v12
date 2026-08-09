# 71. Audit Retention (Plan 20, v2.0.4)

Status: Draft. Owner: platform. Locked decisions marked `[LOCKED]`, deferred items marked `[TBD]`.
Version pinned: v2.25.0 (Plan 20 Steps 1-4). Later steps land under v2.0.4.

Cross-refs: `spec/21-app/41-logging.md`, `spec/21-app/44-security-privacy.md`, `spec/21-app/27-config-surface.md`, `spec/21-app/70-rule-bundle-import-export.md` §70.11 (event shape reuse), `spec/21-app/46-open-questions.md`.

## §71.1 Purpose + Scope `[LOCKED]`

### 71.1.1 Purpose

Bound the growth of the audit sink so that operational queries stay fast, evidence stays intact for the window a category needs, and rotation never silently drops rows. Every audit row in scope has exactly one retention policy and every deletion is itself audited.

### 71.1.2 In Scope

Every row written to the audit sink (`app/core/audit/audit_sink.py`), including:

- Security events: `E_SEC_DENIAL_BURST`, `E_SEC_*` taxonomy from Plan 19.
- Capture failures: `CaptureError` rows with `E_CAP_*` codes from Plan 17.
- Rule bundle events: `RuleBundleRequested`, `RuleBundleExported`, `RuleBundleImported`, `RuleBundleDenied`, `RuleBundleFailed` from spec 70 §70.11.
- License events: `LicenseValidated`, `LicenseActivationRequested`, `LicenseActivationDenied` from spec 60.
- Admin-write events: settings mutations with prior/next JSON from Plan 19 §5.
- Discovery + device selection events from Plan 15.

### 71.1.3 Out of Scope (Non-Goals)

- Export of raw payload bodies outside the audit sink. Export packages event metadata only (see §71.5).
- Cross-tenant or cross-machine aggregation. Retention is per-machine.
- Retroactive re-labeling of already-written rows. Policy assignment is at write time.
- Deletion of `results.jsonl` payloads. Those are governed by `spec/21-app/24-results-json.md` §7 (Q-04 resolution).
- Application logs on disk (`spec/21-app/41-logging.md`). Log rotation stays in spec 41; §71 only covers the audit sink.

### 71.1.4 Success Criteria

- Every audit row has a resolvable `retentionPolicy` at read time.
- Rotation runs are idempotent, transactional per policy, and observable.
- Emergency truncation is never required in normal operation.

## §71.2 Retention Windows `[LOCKED]`

### 71.2.1 Retention Policy Enum

PascalCase, no underscores. Enum lives in `app/core/audit/retention_policy.py`.

```python
class RetentionPolicy(str, Enum):
    RetentionShort = "RetentionShort"        # 30 days
    RetentionStandard = "RetentionStandard"  # 180 days
    RetentionLong = "RetentionLong"          # 400 days
    RetentionForensic = "RetentionForensic"  # 900 days
```

Window semantics: a row is eligible for deletion when `now() - row.Ts >= windowDays`. Windows are inclusive of the last day (`>=`, not `>`), so a 30-day row written at `T` is deleted on the first rotation run at or after `T + 30d`.

### 71.2.2 Category Mapping (single source of truth)

Each category maps to exactly one policy. Per-row overrides are forbidden (`E_AUDIT_RETENTION_ROW_OVERRIDE`).

| Category                     | Policy              | Rationale                                                               |
| ---------------------------- | ------------------- | ----------------------------------------------------------------------- |
| `E_SEC_DENIAL_BURST`         | `RetentionStandard` | Security posture reviews target the last 6 months.                      |
| `E_SEC_*` (other)            | `RetentionStandard` | Same cadence as denial-burst; keeps taxonomy consistent.                |
| `E_CAP_*` (CaptureError)     | `RetentionShort`    | High volume during hardware regressions; 30 days matches triage window. |
| `RuleBundleRequested`        | `RetentionShort`    | Diagnostic; low audit value past 30 days.                               |
| `RuleBundleExported`         | `RetentionLong`     | Provenance for artifacts distributed to other machines.                 |
| `RuleBundleImported`         | `RetentionLong`     | Provenance for the receiving machine.                                   |
| `RuleBundleDenied`           | `RetentionStandard` | License and integrity denials feed security posture reviews.            |
| `RuleBundleFailed`           | `RetentionStandard` | Correlates with capture and rule-engine failures.                       |
| `LicenseValidated`           | `RetentionStandard` | Aligns with tier review cadence.                                        |
| `LicenseActivationRequested` | `RetentionLong`     | Ties activation records to machine binding history.                     |
| `LicenseActivationDenied`    | `RetentionStandard` | Security signal.                                                        |
| Admin-write (settings)       | `RetentionForensic` | Config drift investigations need a wide window.                         |
| Discovery + selection        | `RetentionStandard` | Ties device changes to inspection outcomes.                             |

### 71.2.3 Override Rules

Config-surface overrides (see §71.4) may only raise a category's retention, never lower it below the mapping in §71.2.2. Attempting to lower raises `E_AUDIT_RETENTION_LOWER_REJECTED` at validation time; the write never lands.

### 71.2.4 Failure Codes

- `E_AUDIT_RETENTION_ROW_OVERRIDE`: caller tried to write a row with an explicit `retentionPolicy` that disagrees with §71.2.2.
- `E_AUDIT_RETENTION_LOWER_REJECTED`: config override tried to shrink a policy window.
- `E_AUDIT_RETENTION_UNKNOWN_CATEGORY`: audit sink received a row whose category is not in §71.2.2.

## §71.3 Rotation Worker Contract `[LOCKED]`

### 71.3.1 Cadence

- Default period: `6h`.
- Minimum period: `1h` (values below raise `E_AUDIT_RETENTION_CADENCE_TOO_TIGHT`).
- Maximum period: `24h` (values above raise `E_AUDIT_RETENTION_CADENCE_TOO_LOOSE`).
- Runs are aligned to wall-clock hour boundaries; a missed window (process down) triggers exactly one catch-up run on next start, not backfill of every missed slot.

### 71.3.2 Transaction Shape

- One transaction per policy per run (four transactions per full pass, in order: `RetentionShort`, `RetentionStandard`, `RetentionLong`, `RetentionForensic`).
- Batch cap: `1000` rows per transaction. If more rows are eligible, the worker commits and immediately opens a new transaction until the policy is drained or the run's wall-clock budget (`5 minutes` per policy) elapses. Wall-clock budget elapsed without draining raises `E_AUDIT_RETENTION_BATCH_OVERRUN` and defers the remainder to the next scheduled run.
- Deletes are `DELETE ... WHERE retentionPolicy = ? AND Ts < ? LIMIT 1000` (SQLite `LIMIT` on `DELETE` is enabled via `SQLITE_ENABLE_UPDATE_DELETE_LIMIT`; if the runtime build lacks it, the worker uses a `rowid IN (SELECT rowid ... LIMIT 1000)` fallback).

### 71.3.3 Correlation

Every rotation run is assigned a `CorrelationId` (UUIDv4). Every emitted Ops event, worker log line, and self-audit row (see §71.3.5) carries the same `CorrelationId`. Nested per-policy transactions reuse the run-level `CorrelationId` with a `policy` field for disambiguation.

### 71.3.4 Failure + Back-off

- Transient SQLite errors (`SQLITE_BUSY`, `SQLITE_LOCKED`): exponential back-off starting at `250ms`, doubling, capped at `8s`, max 5 attempts per transaction. On exhaustion: emit `AuditRetentionFailed` with reason `E_AUDIT_RETENTION_LOCKED`, skip that policy for this run, continue to the next policy.
- Clock skew guard: if `now() < lastRunAtWallClock`, the worker refuses to run and raises `E_AUDIT_RETENTION_CLOCK_SKEW`. The Ops tile surfaces the skew delta. No deletes happen until wall clock advances past `lastRunAtWallClock`.
- Any unhandled exception during a transaction rolls the transaction back and emits `AuditRetentionFailed` with reason `E_AUDIT_RETENTION_UNEXPECTED`. The worker continues to the next policy; it does not abort the run.

### 71.3.5 Self-Audit

Rotation itself writes a single `AuditRetentionRun` row per run (policy `RetentionForensic`) capturing: `CorrelationId`, `startedAt`, `finishedAt`, per-policy `{rowsDeleted, transactions, budgetElapsed}`, `reasonCode` (`Ok` or the failure code that ended the run). This row is never itself subject to short-window deletion because it lands under `RetentionForensic`.

### 71.3.6 Ops Events

Reuse the event shape from spec 70 §70.11:

- `AuditRetentionStarted { CorrelationId, scheduledAt, cadenceSeconds }`
- `AuditRetentionPolicyCompleted { CorrelationId, policy, rowsDeleted, transactions, batchOverrun }`
- `AuditRetentionCompleted { CorrelationId, totalRowsDeleted, elapsedMs }`
- `AuditRetentionFailed { CorrelationId, policy, reasonCode }`

Events log counts only. No row bodies, no primary keys, no user PII.

## §71.4 Config Surface `[LOCKED]`

### 71.4.1 New Keys (extends `spec/21-app/27-config-surface.md` §2)

| Key                                   | Type            | Default | App | Task | Runtime | Consumer                  |
| ------------------------------------- | --------------- | ------- | --- | ---- | ------- | ------------------------- |
| `audit.retention.cadenceHours`        | int 1 to 24     | `6`     | Yes | No   | No      | Rotation worker (§71.3.1) |
| `audit.retention.batchRowCap`         | int 100 to 5000 | `1000`  | Yes | No   | No      | Rotation worker (§71.3.2) |
| `audit.retention.policyBudgetSeconds` | int 30 to 900   | `300`   | Yes | No   | No      | Rotation worker (§71.3.2) |
| `audit.retention.shortDays`           | int 30 to 180   | `30`    | Yes | No   | No      | Policy window (§71.2.1)   |
| `audit.retention.standardDays`        | int 180 to 540  | `180`   | Yes | No   | No      | Policy window (§71.2.1)   |
| `audit.retention.longDays`            | int 400 to 900  | `400`   | Yes | No   | No      | Policy window (§71.2.1)   |
| `audit.retention.forensicDays`        | int 900 to 2555 | `900`   | Yes | No   | No      | Policy window (§71.2.1)   |
| `audit.retention.exportEnabled`       | bool            | `true`  | Yes | No   | No      | Export server fn (§71.5)  |

### 71.4.2 Layer + Writer Rules

- App-layer only. Rows land in `root.db:AppSetting` and are never mirrored into `task.db` or `rules.db`.
- Runtime overrides forbidden. Attempting a runtime write raises `E_AUDIT_RETENTION_RUNTIME_WRITE`.
- Only callers gated by `requireCaptureAdmin` (Plan 15 Step 8) may write these keys. Any other caller raises `E_AUDIT_RETENTION_UNAUTHORIZED_WRITE`.

### 71.4.3 Validation

Each write goes through `SettingsStore.write` (Plan 19 §4). Validators enforce:

1. Range check against the type column above.
2. Lower-bound floor from §71.2.3 (may only raise a policy window).
3. Monotonic ordering: `shortDays <= standardDays <= longDays <= forensicDays`. Violations raise `E_AUDIT_RETENTION_WINDOW_ORDER`.
4. Batch cap sanity: `batchRowCap <= policyBudgetSeconds * 20` (20 rows per second floor). Violations raise `E_AUDIT_RETENTION_BATCH_CAP_INSANE`.

### 71.4.4 Hot-Reload

Follows Plan 19 §5 (SettingsStore commit triggers hot-reload). The rotation worker rereads its knobs at the start of every run; a mid-run write does not preempt the current run. The Ops tile (§71.6) reflects the new cadence on the next scheduled tick.

### 71.4.5 Admin-Write Audit

Every write to an `audit.retention.*` key emits an admin-write audit row (policy `RetentionForensic`) with prior and next JSON, per Plan 19 §5.

### 71.4.6 Failure Codes Summary

- `E_AUDIT_RETENTION_CADENCE_TOO_TIGHT`
- `E_AUDIT_RETENTION_CADENCE_TOO_LOOSE`
- `E_AUDIT_RETENTION_WINDOW_ORDER`
- `E_AUDIT_RETENTION_BATCH_CAP_INSANE`
- `E_AUDIT_RETENTION_RUNTIME_WRITE`
- `E_AUDIT_RETENTION_UNAUTHORIZED_WRITE`
- `E_AUDIT_RETENTION_LOWER_REJECTED`

## §71.5 Export Contract `[LOCKED]`

### 71.5.1 Purpose

Produce a signed, self-describing bundle of audit metadata that a customer support engineer or auditor can carry off the machine without dragging along raw payload bodies. Export is initiated from the Ops UI, gated by `requireCaptureAdmin`, and never runs automatically.

### 71.5.2 Container `[LOCKED]`

- Extension: `.catauditjsonl`.
- MIME: `application/vnd.catmy.audit+zip`.
- Outer format: ZIP, deterministic entry order, fixed mtime `1980-01-01T00:00:00Z` (mirrors spec 70 §70.3 rules).
- ZIP entries (all required unless noted):
  - `/manifest.json` (see §71.5.4)
  - `/events.jsonl` (see §71.5.5)
  - `/signature.sig` (optional; present when `audit.export.signingEnabled = true`)
- Size caps: total uncompressed 256 MiB, single entry 128 MiB. Exceeding either raises `E_AUDIT_EXPORT_SIZE_CAP`.

### 71.5.3 Server Function `[LOCKED]`

File: `src/lib/audit-export.functions.ts`. Shape:

```typescript
export const exportAuditBundle = createServerFn({ method: "POST" })
  .middleware([requireCaptureAdmin])
  .inputValidator((input: ExportAuditBundleInput) => ExportAuditBundleInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    /* returns ExportAuditBundleResult */
  });
```

Input (Zod-locked, PascalCase discriminants):

```typescript
type ExportAuditBundleInput = {
  fromTs: string; // ISO8601 inclusive
  toTs: string; // ISO8601 exclusive; toTs - fromTs <= 90 days
  policies: RetentionPolicy[]; // non-empty; subset of the enum
  categories?: string[]; // optional filter; missing = all in-scope categories
  includeAdminWrite: boolean; // default false; requires TierTwo+ per §71.5.7
};
```

Result:

```typescript
type ExportAuditBundleResult = {
  bundleId: string; // UUIDv4
  eventCount: number;
  bytes: number;
  payloadSha256Prefix8: string; // first 8 hex chars only; per spec 70 §70.11
  storagePath: string; // supabase://audit-bundles/<bundleId>.catauditjsonl
  signed: boolean;
};
```

Body of the bundle is written to the private backend storage bucket at `audit-bundles/<bundleId>.catauditjsonl`; the server function returns metadata only, never the bytes over RPC (per `tanstack-server-functions` Return Shape Rule). Admin retrieval uses `createAuditBundleDownloadUrl`, which returns a short-lived signed URL after `requireCaptureAdmin` and `AuditBundleExportSigned` pass.

```typescript
export const createAuditBundleDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateAuditBundleDownloadUrlInput) =>
    CreateAuditBundleDownloadUrlInputSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    /* returns CreateAuditBundleDownloadUrlResult */
  });
```

### 71.5.4 Manifest Contract `[LOCKED]`

`manifest.json` fields (all required unless noted):

- `schemaVersion` (int, current `1`)
- `bundleId` (UUIDv4)
- `producer` `{ appVersion, machineHash }`
- `window` `{ fromTs, toTs }`
- `policies` (`RetentionPolicy[]`)
- `categories` (`string[]`; resolved list even when input omitted the filter)
- `eventCount` (int, must match `events.jsonl` line count)
- `checksum` `{ algorithm: "Sha256", payloadHex }` (SHA-256 of `events.jsonl` bytes)
- `createdAt` (ISO8601)
- `signature?` `{ algorithm: "Ed25519", keyId, sigBase64 }` (present only when signed)

Import-side validators: `eventCount` mismatch raises `E_AUDIT_EXPORT_COUNT_MISMATCH`; checksum mismatch raises `E_AUDIT_EXPORT_CHECKSUM_MISMATCH`; unknown `schemaVersion` raises `E_AUDIT_EXPORT_SCHEMA_UNSUPPORTED`.

### 71.5.5 Payload Format `[LOCKED]`

`events.jsonl` is JSON Lines (one event per line, `\n` terminated, UTF-8, no BOM). Each line:

```
{ "eventId": "...", "ts": "...", "category": "...", "reasonCode": "...", "retentionPolicy": "...", "correlationId": "...", "actorId": "...", "summary": "..." }
```

- `summary` is a short, human-readable string derived at write time; never raw payload bodies, never signatures, never full digests, never operator PII beyond `actorId`.
- Rows are sorted by `(ts ASC, eventId ASC)` for reproducible bytes.
- No trailing newline after the last line (so line count equals `\n` count + 1).

### 71.5.6 Signing `[LOCKED shape, key mgmt TBD]`

- Algorithm: Ed25519 over the raw `events.jsonl` bytes (not the manifest).
- Signing key lives in `SUPABASE_*` secret store under key id `audit-export-<machineHash>`; loaded inside the handler, never at module scope.
- When `audit.export.signingEnabled = false`, `/signature.sig` is omitted and `manifest.signature` is absent. Import side treats an absent signature as `Unsigned` (allowed for local re-import; rejected by future cloud ingest paths).
- Key rotation cadence: `[TBD]`, tracked in `spec/21-app/46-open-questions.md` §7 as `RB-08` (added at next close-out).

### 71.5.7 Feature Gating + Errors `[LOCKED]`

Reuses the spec 60 licensing surface:

| Capability                   | Feature flag              | Minimum tier |
| ---------------------------- | ------------------------- | ------------ |
| Local export (unsigned)      | `AuditBundleExport`       | TierTwo      |
| Signed export                | `AuditBundleExportSigned` | TierThree    |
| Include admin-write category | `AuditBundleExportAdmin`  | TierThree    |

Errors (PascalCase):

- `E_AUDIT_EXPORT_UNAUTHORIZED`: caller lacks `requireCaptureAdmin`.
- `E_AUDIT_EXPORT_FEATURE_LOCKED`: caller tier lacks the required flag.
- `E_AUDIT_EXPORT_WINDOW_TOO_WIDE`: `toTs - fromTs > 90 days`.
- `E_AUDIT_EXPORT_SIZE_CAP`: bundle exceeds the caps in §71.5.2.
- `E_AUDIT_EXPORT_EMPTY_WINDOW`: 0 matching events (returns typed error, not a zero-byte bundle).
- `E_AUDIT_EXPORT_DISABLED`: `audit.retention.exportEnabled = false`.

### 71.5.8 Ops Events `[LOCKED]`

- `AuditBundleExportRequested { correlationId, window, policies, categories }`
- `AuditBundleExported { correlationId, bundleId, eventCount, bytes, payloadSha256Prefix8, signed }`
- `AuditBundleExportDenied { correlationId, reasonCode }`
- `AuditBundleExportFailed { correlationId, reasonCode }`
- `AuditBundleDownloadUrlIssued { correlationId, storagePath, expiresInSeconds }`

All four use policy `RetentionForensic`.

## §71.6 Ops UI Counters `[LOCKED]`

### 71.6.1 Route + Component

- Route: `src/routes/ops.tsx` (existing; extended, not replaced).
- Component: new `AuditRetentionTile` under `src/components/ops/audit-retention-tile.tsx`.
- Poll cadence: 15 seconds (fixed, not configurable in v2.0.4). Uses TanStack Query `refetchInterval: 15_000`.

### 71.6.2 Data Source `[LOCKED]`

File: `src/lib/audit-retention.functions.ts`. Shape:

```typescript
export const getAuditRetentionStatus = createServerFn({ method: "GET" })
  .middleware([requireCaptureAdmin])
  .handler(async ({ context }) => {
    /* returns AuditRetentionStatus */
  });
```

Return (Zod-locked):

```typescript
type AuditRetentionStatus = {
  lastRun: {
    correlationId: string;
    startedAt: string;
    finishedAt: string;
    reasonCode: string;
  } | null;
  nextScheduledAt: string;
  cadenceHours: number;
  clockSkewMs: number; // signed; negative if wall clock regressed
  policies: Array<{
    policy: RetentionPolicy;
    windowDays: number;
    oldestSurvivingTs: string | null;
    rowsPurgedLast24h: number;
    rowsPurgedLastRun: number;
    batchOverrunLastRun: boolean;
  }>;
  fetchedAt: string;
};
```

`getAuditRetentionStatus` reads from the audit sink and the `AuditRetentionRun` self-audit row (§71.3.5); it never triggers a rotation run.

### 71.6.3 Tile Layout `[LOCKED]`

Four sub-tiles inside `AuditRetentionTile`, one per policy, plus a header row:

- Header row: `Last run: <finishedAt relative>`, `Next: <nextScheduledAt relative>`, `Cadence: <cadenceHours>h`, `Clock skew: <clockSkewMs>ms` (skew shown red when `|clockSkewMs| >= 2000`, per Q-09).
- Per-policy sub-tile: policy name, window in days, `Oldest: <oldestSurvivingTs relative or "empty">`, `24h purged: <rowsPurgedLast24h>`, `Last run purged: <rowsPurgedLastRun>`, `Overrun` badge when `batchOverrunLastRun = true`.

Uses `--hmi-*` tokens only. No hardcoded hex. Numeric values use `tabular-nums`. No status conveyed by icon swap; background color changes signal state (per project core memory).

### 71.6.4 Status Colors `[LOCKED]`

- Normal: `--hmi-panel`.
- Warn: `--hmi-status-warn` when any of `batchOverrunLastRun = true`, `|clockSkewMs| >= 2000`, or `lastRun.reasonCode != "Ok"`.
- Fault: `--hmi-status-fault` when `lastRun == null` and `nextScheduledAt` is more than one cadence period in the past (rotation worker not running).

### 71.6.5 Accessibility `[LOCKED]`

- Each sub-tile has an `aria-label` composing policy name, oldest surviving age, and last-run purge count.
- Warn and fault states include a text badge, not color alone (WCAG 1.4.1).
- The tile is keyboard-focusable and exposes the raw `AuditRetentionStatus` fields via `aria-describedby` for screen readers.

### 71.6.6 Failure Modes `[LOCKED]`

- Query error: tile renders in fault state with the error `reasonCode`; never blanks out.
- `getAuditRetentionStatus` denial (missing admin): tile is not rendered; the Ops route falls back to the non-admin layout instead of throwing.
- Stale data guard: if `now() - fetchedAt > 60 seconds`, tile shows a `Stale` badge; the poll interval continues.

### 71.6.7 Non-Goals

- No inline mutation of retention config from the tile. Config edits live on the Settings screen and go through `SettingsStore.write` (Plan 19 §4).
- No inline export trigger from the tile. Export lives on its own Settings panel and calls `exportAuditBundle` (§71.5.3).
- No historical charting in v2.0.4. Trend visualization is deferred.

## §71.7 AuditRetentionFacade binding

| Facade member                   | Source                                            | Output                              | Error code                                                           |
| ------------------------------- | ------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| `ReadStatus()`                  | `getAuditRetentionStatus` and audit sink counters | `AuditRetentionStatus`              | `E_AUDIT_STORE_UNAVAILABLE`                                          |
| `RunRotation(correlationId)`    | retention worker                                  | `AuditRetentionRun`                 | `E_AUDIT_RETENTION_LOCKED`, `E_AUDIT_RETENTION_UNEXPECTED`           |
| `ValidatePolicyConfig(payload)` | settings validators                               | accepted policy windows and cadence | `E_AUDIT_RETENTION_WINDOW_ORDER`, `E_AUDIT_RETENTION_LOWER_REJECTED` |
| `ExportBundle(input)`           | `exportAuditBundle`                               | export metadata only                | `E_AUDIT_EXPORT_UNAUTHORIZED`, `E_AUDIT_EXPORT_SIZE_CAP`             |

The facade keeps worker, export, and Ops tile callers on the same retention vocabulary. It never returns raw row bodies to the UI.

## §71.8 Contract back-links

| Target                                          | Required use                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `spec/21-app/40-error-manage.md`                | Registers `E_AUDIT_RETENTION_*`, `E_AUDIT_EXPORT_*`, and mirror-degradation warning codes. |
| `spec/21-app/27-config-surface.md`              | Owns `audit.retention.*` keys, write layer, value ranges, and hot-reload behavior.         |
| `.lovable/memory/09-enums-and-results-shape.md` | Locks retention policy names as PascalCase via the `RetentionBand` enum.                   |

## §71.9 Implementation checklist

- [ ] Every audit row resolves to exactly one retention policy.
- [ ] Rotation runs with one transaction per policy.
- [ ] Batch cap and policy budget failures emit registered `E_AUDIT_RETENTION_*` codes.
- [ ] Every rotation run writes one self-audit row with `CorrelationId`.
- [ ] Export returns metadata only and writes bytes under `config/audit-exports/`.
- [ ] Ops tile handles empty, stale, warning, and fault states without blanking.
- [ ] Admin-only operations use the capture-admin gate.

## Acceptance Checklist

- [ ] Retention worker path `scripts/retention_worker.py` cited.
- [ ] Retention policy keys declared in spec 27; hot-reloadable.
- [ ] Deleted records emit `AuditRetentionPurged` per spec 72.
