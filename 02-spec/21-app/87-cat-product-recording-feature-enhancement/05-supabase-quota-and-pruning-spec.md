# 05 - Supabase Cloud Sync with 450MB Quota & 14-Day Pruning Policy Specification

- **Specification ID**: `SPEC-87-05-SUPABASE-QUOTA-PRUNING`
- **Module**: `AppRuntime / Telemetry / SupabaseStorageGovernance`
- **Status**: Target Architecture Specification
- **Date**: 2026-10-31
- **Related Specs**:
  - `02-spec/21-app/87-cat-product-recording-feature-enhancement/01-runner-optimization-and-terminal-spec.md`
  - `02-spec/21-app/87-cat-product-recording-feature-enhancement/02-v6-v7-letterly-prompts-spec.md`
  - `02-spec/21-app/87-cat-product-recording-feature-enhancement/03-multi-action-export-and-email-spec.md`
  - `02-spec/21-app/87-cat-product-recording-feature-enhancement/04-supabase-450mb-retention-spec.md`

---

## 1. Executive Summary & Strategic Objectives

Industrial vision inspection stations deployed on factory assembly lines generate significant volumes of telemetry data during diagnostic sessions: high-resolution canvas screenshots, DOM event streams, Split-DB error logs, and rule recipes. Unmanaged ingestion of this visual data into cloud storage accounts (such as Supabase Free and Pro tiers) inevitably results in rapid storage exhaustion, unexpected billing overages, or hard service cutoffs.

To guarantee zero-maintenance, self-governing cloud telemetry, this specification establishes the **Supabase Storage Governance Protocol**:
1. **Hard 450MB Storage Limit**: Enforces a strict 450 Megabyte aggregate ceiling across relational table rows and object storage buckets. Uploads that would breach this threshold are rejected or queued locally until space is cleared.
2. **14-Day Rolling Pruning Policy**: Enforces an automated rolling retention window. Any bug report record and associated storage bucket artifact older than 14 days (`created_at < NOW() - INTERVAL '14 days'`) is systematically deleted prior to new data ingestion.
3. **Dual-Tier Synchronizer Architecture**: Harmonizes client-side direct PostgREST synchronization (`src/services/telemetry/supabase-client.ts`) with backend loopback proxy delivery (`BE/routes/bug_reports.py` and `BE/bug_reports/supabase_client.py`).
4. **Resilient Local Fallback**: When Supabase quota cannot be freed, network connectivity is lost, or the circuit breaker opens, artifacts fail over cleanly to local disk (`.logs/recorded-bugs/<session_id>/`) and client `localStorage` queues without data loss.

---

## 2. Storage Architecture & Schema Contracts

Telemetry data in Supabase is partitioned across relational tables (`public.bug_reports`, `public.bug_attachments`) and binary object storage (`cat-vision-telemetry` bucket).

### 2.1 Database Schema Definition (`BE/bug_reports/schema.sql`)

```sql
-- Supabase Schema for CAT Vision Diagnostic Bug Reporting
-- Storage Governance: 450MB Cap + 14-Day Rolling Eviction

create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  ticket_id text unique,
  node_id text,
  title text not null,
  category text not null default 'ui_glitch',
  status text not null default 'pending'
    check (status in ('pending', 'downloaded', 'resolved', 'pruned')),
  initial_route text,
  events_count integer not null default 0,
  has_screenshot boolean not null default false,
  is_synced boolean not null default true,
  reporter_context jsonb not null default '{}'::jsonb,
  split_db_errors jsonb not null default '[]'::jsonb,
  active_recipe jsonb not null default '{}'::jsonb,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.bug_attachments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.bug_reports (id) on delete cascade,
  file_name text not null,
  mime_type text not null default 'image/png',
  size_bytes bigint not null default 0,
  storage_path text not null,
  delivery_note text,
  created_at timestamptz not null default now()
);

-- Indexes for ultra-fast retention lookups and quota aggregation
create index if not exists bug_reports_created_at_idx
  on public.bug_reports (created_at asc);

create index if not exists bug_reports_ticket_idx
  on public.bug_reports (ticket_id);

create index if not exists bug_attachments_report_idx
  on public.bug_attachments (report_id);

create index if not exists bug_attachments_size_idx
  on public.bug_attachments (size_bytes);
```

### 2.2 Storage Bucket Specifications

- **Bucket ID**: `cat-vision-telemetry`
- **Public Visibility**: `false` (Private bucket with authenticated access)
- **Object Key Schema**: `<ticket_id>/<file_name>.png` (e.g. `CV-LOK91-AB12/canvas.png`, `CV-LOK91-AB12/step-01-click.png`)
- **MIME Types Permitted**: `image/png`, `image/jpeg`, `application/json`, `text/markdown`

---

## 3. Storage Usage Tracking & Pre-Upload Quota Verification

### 3.1 450MB Storage Limit Invariant

The maximum permitted storage footprint is:
$$\text{StorageLimitBytes} = 450 \times 1024 \times 1024 = 471{,}859{,}200 \text{ bytes}$$

Aggregate storage consumption is computed as the sum of:
1. **Object Storage**: Total bytes of all objects in bucket `cat-vision-telemetry`.
2. **Relational Attachments**: Total `size_bytes` recorded in `bug_attachments`.
3. **Relational Payloads**: Estimated database row overhead for `bug_reports` (computed as $\text{count} \times 8192 \text{ bytes}$ average row payload).

$$\text{CurrentUsageBytes} = \sum (\text{bug\_attachments.size\_bytes}) + (\text{Count}(\text{bug\_reports}) \times 8192)$$

### 3.2 Pre-Upload Quota Verification Algorithm

Before any new diagnostic report or image artifact is committed to Supabase:
1. **Estimate Incoming Payload Size**:
   $$\text{IncomingBytes} = \text{Length}(\text{json\_body}) + \sum \text{ByteLength}(\text{screenshots})$$
2. **Query Current Storage Usage**:
   Invoke `get_storage_usage()` via PostgREST RPC or aggregate query.
3. **Evaluate Quota Condition**:
   $$\text{ProjectedUsageBytes} = \text{CurrentUsageBytes} + \text{IncomingBytes}$$
   - If $\text{ProjectedUsageBytes} \le \text{StorageLimitBytes}$: Proceed with upload.
   - If $\text{ProjectedUsageBytes} > \text{StorageLimitBytes}$:
     a. Trigger Phase 1 Eviction: Execute 14-day rolling pruning.
     b. Recalculate usage after pruning.
     c. If $\text{ProjectedUsageBytes} \le \text{StorageLimitBytes}$: Proceed with upload.
     d. If still over 450MB: Reject upload with `E_SUPABASE_QUOTA_EXCEEDED`, surface toast warning to operator, and enqueue report to local disk storage (`.logs/recorded-bugs/`).

### 3.3 Storage Usage Query Implementation (SQL RPC)

```sql
create or replace function public.get_telemetry_storage_usage()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_attachment_bytes bigint;
  v_report_count bigint;
  v_estimated_row_bytes bigint;
  v_total_bytes bigint;
  v_quota_bytes bigint := 471859200; -- 450 MB
begin
  select coalesce(sum(size_bytes), 0) into v_attachment_bytes from public.bug_attachments;
  select count(*) into v_report_count from public.bug_reports;
  v_estimated_row_bytes := v_report_count * 8192;
  v_total_bytes := v_attachment_bytes + v_estimated_row_bytes;

  return jsonb_build_object(
    'attachment_bytes', v_attachment_bytes,
    'report_count', v_report_count,
    'total_bytes', v_total_bytes,
    'quota_bytes', v_quota_bytes,
    'is_quota_exceeded', (v_total_bytes >= v_quota_bytes),
    'available_bytes', greatest(0, v_quota_bytes - v_total_bytes)
  );
end;
$$;
```

---

## 4. Automated 14-Day Rolling Pruning & Eviction Policy

### 4.1 Eviction Rule & Timing

Any diagnostic report older than 14 calendar days is eligible for automatic deletion:
$$\text{CutoffTimestamp} = \text{NOW}() - \text{INTERVAL '14 days'}$$

Eviction is triggered at two execution hooks:
1. **Periodic Pre-Flight Hook**: Executed immediately prior to any report ingestion in `uploadBugReportToSupabase` or backend `POST /bug-reports`.
2. **Explicit Maintenance API Hook**: Callable on-demand by backend daemon or operator via `POST /bug-reports/prune`.

### 4.2 Cascading Pruning Sequence

To avoid orphaned binary objects in Supabase Storage:
1. **Query Expired Report Keys**:
   Select all `bug_attachments.storage_path` for reports matching `created_at < NOW() - INTERVAL '14 days'`.
2. **Batch Delete Storage Objects**:
   Issue `POST /storage/v1/object/cat-vision-telemetry` with HTTP method `DELETE` and payload listing expired paths:
   ```json
   {
     "prefixes": ["CV-STALE01/", "CV-STALE02/"]
   }
   ```
3. **Delete Expired Relational Rows**:
   ```sql
   delete from public.bug_reports
   where created_at < (now() - interval '14 days');
   ```
   Foreign key `references public.bug_reports (id) on delete cascade` automatically deletes child rows in `bug_attachments`.

### 4.3 Database Pruning Stored Procedure (`BE/bug_reports/schema.sql`)

```sql
create or replace function public.prune_expired_bug_reports(p_days integer default 14)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_deleted_reports bigint;
  v_deleted_attachments bigint;
  v_freed_bytes bigint;
  v_cutoff timestamptz;
begin
  v_cutoff := now() - (p_days || ' days')::interval;

  -- Compute freed bytes from attachments to be removed
  select coalesce(sum(a.size_bytes), 0), count(a.id)
    into v_freed_bytes, v_deleted_attachments
    from public.bug_attachments a
    join public.bug_reports r on r.id = a.report_id
   where r.created_at < v_cutoff;

  -- Delete reports (cascades to bug_attachments)
  with deleted as (
    delete from public.bug_reports
     where created_at < v_cutoff
    returning id
  )
  select count(*) into v_deleted_reports from deleted;

  return jsonb_build_object(
    'cutoff_timestamp', v_cutoff,
    'deleted_reports_count', v_deleted_reports,
    'deleted_attachments_count', v_deleted_attachments,
    'freed_bytes', v_freed_bytes,
    'is_pruned', (v_deleted_reports > 0)
  );
end;
$$;
```

---

## 5. Dual-Delivery Architecture: Client-Side & Backend Delivery

Diagnostic bug reports are delivered through two distinct channels:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          OPERATOR ACTION                               │
│           (Export Modal -> "Save to Supabase" / "Record Bug")          │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
    [Mode A: Direct Client-Side]            [Mode B: Backend Loopback]
    (Browser / Vite UI)                     (Local Loopback HTTP / IPC)
    `src/services/telemetry/`               `BE/routes/bug_reports.py`
                 │                                       │
                 ▼                                       ▼
    1. Pre-flight 14-day pruning            1. Loopback auth check (127.0.0.1)
    2. Check 450MB quota cap                2. Pre-flight 14-day pruning
    3. Upload canvas PNG to Storage         3. Check 450MB quota cap
    4. Insert row into `bug_reports`        4. Save metadata + screenshots
    5. Offline queue on failure             5. Deliver via SMTP + Supabase
                 │                                       │
                 └───────────────────┬───────────────────┘
                                     ▼
                      ┌─────────────────────────────┐
                      │    Supabase Cloud Project   │
                      │  - PostgREST REST API       │
                      │  - Object Storage Bucket    │
                      └─────────────────────────────┘
```

### 5.1 Client-Side PostgREST Client (`src/services/telemetry/supabase-client.ts`)

#### Parameter Struct: `SupabaseUploadParams`
```typescript
export interface SupabaseUploadParams {
  payload: SupabaseBugReportPayload;
  quotaCapBytes?: number; // Defaults to 471,859,200 (450MB)
  retentionDays?: number; // Defaults to 14 days
  hasPreflightPrune?: boolean; // Defaults to true
}

export interface SupabaseQuotaCheckResult {
  isQuotaExceeded: boolean;
  currentUsageBytes: number;
  quotaCapBytes: number;
  availableBytes: number;
}

export interface SupabasePruningResult {
  isPruned: boolean;
  deletedReportsCount: number;
  freedBytes: number;
}
```

#### Execution Logic
1. Load configuration: URL, publishable key, bucket name.
2. If `config.isEnabled === false`: Immediately store in `cat_vision_offline_supabase_queue` in `localStorage`.
3. If `hasPreflightPrune === true`: Invoke `POST /rest/v1/rpc/prune_expired_bug_reports` with `{ p_days: 14 }`.
4. Perform quota verification via `POST /rest/v1/rpc/get_telemetry_storage_usage`.
5. If `isQuotaExceeded === true`:
   - Attempt emergency eviction of oldest session records.
   - If still exceeded, fall back to offline queue with message: `"Upload deferred: Supabase storage exceeds 450MB quota."`.
6. Convert base64 canvas screenshot into `Uint8Array` Blob and upload to `${supabaseUrl}/storage/v1/object/${bucketName}/${ticketId}/canvas.png` with `x-upsert: true`.
7. POST report JSON to `${supabaseUrl}/rest/v1/bug_reports`.
8. On network error or HTTP $\ge 400$: Push into offline queue for background retry.

### 5.2 Backend Loopback Delivery (`BE/bug_reports/supabase_client.py`)

#### Python Parameter Structs & Type Definitions
```python
from dataclasses import dataclass
from typing import Any, Optional

@dataclass(frozen=True)
class QuotaStatus:
    total_bytes: int
    quota_bytes: int
    is_quota_exceeded: bool
    available_bytes: int

@dataclass(frozen=True)
class PruningSummary:
    deleted_reports_count: int
    deleted_attachments_count: int
    freed_bytes: int
    is_pruned: bool
```

#### Circuit Breaker & Safe HTTP Operations
- Uses Python standard library `urllib.request` (zero external dependencies).
- Bounded timeout: 15.0 seconds.
- Circuit breaker: opens after 3 consecutive failures for 60.0 seconds.
- Normalizes URLs: strips trailing slashes and redundant `/rest/v1` prefixes.
- Pre-upload hook:
  ```python
  def verify_quota_and_prune(self, incoming_bytes: int = 0) -> QuotaStatus:
      """Executes 14-day pruning then verifies 450MB quota cap."""
      self.prune_expired_records(days=14)
      usage = self.get_storage_usage()
      
      if usage.total_bytes + incoming_bytes > usage.quota_bytes:
          logger.warning(
              "supabase_quota_exceeded",
              extra={"total_bytes": usage.total_bytes, "quota": usage.quota_bytes}
          )
      
      return usage
  ```

---

## 6. Security, RLS & Secret Redaction

1. **Role-Based RLS Policies**:
   - Production projects require authenticated JWT access.
   - Factory edge terminals connect using scoped publishable keys authorized only for `INSERT` on `bug_reports` and `bug_attachments`, and `SELECT` on stored procedures.
2. **Secret Scrubbing Before Ingestion**:
   - Any payload sent to Supabase is scrubbed of sensitive fields:
     - API keys, passwords, bearer tokens, and private paths are masked with `[REDACTED]`.
     - Operator passwords in `reporter_context` are dropped.
3. **Local Filesystem Isolation**:
   - Screenshot binaries referenced in bug prompts are saved in `.logs/recorded-bugs/<session_id>/` and never copied into repository source trees or `src/assets`.

---

## 7. Verification Matrix & Edge Cases

| Test Case ID | Scenario | Precondition | Expected Behavior |
| :--- | :--- | :--- | :--- |
| `TC-SUPA-01` | Normal report upload | Storage usage = 50MB, zero expired records | Upload succeeds, canvas image stored in bucket, row created in `bug_reports`. |
| `TC-SUPA-02` | 14-Day Pruning Trigger | 5 records created 16 days ago (total 15MB) | Pre-flight hook deletes 5 expired reports and corresponding bucket PNGs; freed bytes reported. |
| `TC-SUPA-03` | Hard Quota Breach | Current storage = 445MB, incoming payload = 10MB | Pruning executes; if storage remains $>450\text{MB}$, upload aborted, report saved to local queue. |
| `TC-SUPA-04` | Supabase Unreachable | Network severed or invalid URL | Circuit breaker logs failure, report stored in `localStorage` offline queue, UI shows offline notification. |
| `TC-SUPA-05` | Idempotent Pruning | Zero expired records exist | `prune_expired_bug_reports` returns `deleted_reports_count: 0`, `is_pruned: false` without error. |
| `TC-SUPA-06` | Loopback Authorization | Request sent from external IP to `POST /bug-reports` | Returns HTTP 403 Forbidden (`bug reporting is only available from this machine`). |
