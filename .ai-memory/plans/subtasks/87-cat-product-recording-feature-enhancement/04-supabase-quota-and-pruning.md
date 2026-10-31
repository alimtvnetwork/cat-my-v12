# Subtask 04: Supabase 450MB Quota & 14-Day Pruning Execution Plan

- **Task**: `cat-product-recording-feature-enhancement - Task 04`
- **Owner**: Worker 1 & Worker 2
- **Status**: READY_FOR_EXECUTION
- **Priority**: P0 (Non-Negotiable Architecture Invariant)
- **Specification Reference**: `02-spec/21-app/87-cat-product-recording-feature-enhancement/05-supabase-quota-and-pruning-spec.md`
- **Target Files**:
  - `BE/bug_reports/schema.sql`
  - `BE/bug_reports/supabase_client.py`
  - `BE/routes/bug_reports.py`
  - `src/services/telemetry/supabase-client.ts`
  - `src/components/telemetry/SupabaseSettingsModal.tsx`
  - `src/components/recorder/RecorderExportModal.tsx`

---

## 1. Context & Objectives

Cloud telemetry synchronization must be self-sustaining and budget-capped on factory edge installations. Uncapped uploads rapidly exhaust Supabase project limits. This execution plan implements:
1. **Pre-Upload Storage Quota Calculation**: Continuous accounting of aggregate bytes across `bug_attachments` and `bug_reports`, enforcing a hard ceiling of 450MB ($471{,}859{,}200$ bytes).
2. **14-Day Rolling Pruning Policy**: Automated cascade deletion of records and storage bucket artifacts older than 14 days (`created_at < NOW() - INTERVAL '14 days'`) executed as a pre-flight hook before uploads.
3. **Graceful Fallback & Offline Queueing**: Fallback to local disk persistence (`.logs/recorded-bugs/<session_id>/`) and browser `localStorage` queueing whenever quota cannot be cleared or cloud connectivity is severed.

---

## 2. Step-by-Step Implementation Milestones

### Milestone 4.1: Database Schema & Stored Procedure Authoring
- **Target File**: `BE/bug_reports/schema.sql`
- **Action**: Add automated storage calculation and pruning stored procedures.
  - Define `public.get_telemetry_storage_usage()`:
    - Calculates sum of `bug_attachments.size_bytes` plus estimated row overhead ($8\text{KB} \times \text{count}$).
    - Compares aggregate against $471{,}859{,}200$ bytes ($450\text{MB}$).
    - Returns JSON: `{ attachment_bytes, report_count, total_bytes, quota_bytes, is_quota_exceeded, available_bytes }`.
  - Define `public.prune_expired_bug_reports(p_days integer default 14)`:
    - Selects expired reports where `created_at < NOW() - (p_days || ' days')::interval`.
    - Deletes matching rows from `public.bug_reports` (foreign keys cascade to `public.bug_attachments`).
    - Returns JSON: `{ cutoff_timestamp, deleted_reports_count, deleted_attachments_count, freed_bytes, is_pruned }`.
  - Ensure indexes on `created_at asc` and `size_bytes` exist for sub-millisecond query execution.

### Milestone 4.2: Backend PostgREST Client Enhancements
- **Target File**: `BE/bug_reports/supabase_client.py`
- **Action**: Extend `SupabaseClient` with storage governance methods using stdlib `urllib`:
  - Add dataclasses for typed return values:
    - `QuotaStatus`: `total_bytes: int`, `quota_bytes: int`, `is_quota_exceeded: bool`, `available_bytes: int`.
    - `PruningSummary`: `deleted_reports_count: int`, `deleted_attachments_count: int`, `freed_bytes: int`, `is_pruned: bool`.
  - Implement `get_storage_usage(self) -> QuotaStatus`:
    - Calls RPC `/rest/v1/rpc/get_telemetry_storage_usage`.
    - Fallback calculation via `select("bug_attachments", "?select=size_bytes")` if RPC is unavailable.
  - Implement `prune_expired_records(self, days: int = 14) -> PruningSummary`:
    - Calls RPC `/rest/v1/rpc/prune_expired_bug_reports` with `{ "p_days": days }`.
  - Implement `verify_quota_and_prune(self, incoming_bytes: int = 0) -> QuotaStatus`:
    - Executes 14-day pruning first.
    - Re-evaluates usage; if `usage.total_bytes + incoming_bytes > 471859200`, raises `SupabaseError("Supabase storage limit of 450MB reached. Upload deferred to local queue.")`.

### Milestone 4.3: Backend Route Integration & Loopback Verification
- **Target File**: `BE/routes/bug_reports.py`
- **Action**: Wire quota and retention enforcement into API endpoints:
  - In `POST /bug-reports`:
    - Call `supabase_client.verify_quota_and_prune(incoming_bytes)` prior to record insertion.
    - If quota is exceeded, catch error cleanly and divert payload to local machine disk (`.logs/recorded-bugs/<session_id>/`).
  - Add maintenance endpoint `POST /bug-reports/prune`:
    - Loopback-only authorization check (`127.0.0.1`, `::1`).
    - Accepts optional JSON `{ "retention_days": 14 }`.
    - Invokes `supabase_client.prune_expired_records(days)` and returns standard `BE.envelope.success(...)`.

### Milestone 4.4: Frontend Storage Calculation & Pre-Sync Enqueueing
- **Target File**: `src/services/telemetry/supabase-client.ts`
- **Action**: Implement client-side quota gating and automated pruning:
  - Add interface `SupabaseStorageStatus`:
    ```typescript
    export interface SupabaseStorageStatus {
      totalBytes: number;
      quotaBytes: number;
      isQuotaExceeded: boolean;
      availableBytes: number;
      usagePercentage: number;
    }
    ```
  - Implement `fetchSupabaseStorageUsage(config: SupabaseConfig): Promise<SupabaseStorageStatus>`:
    - Calls PostgREST RPC `get_telemetry_storage_usage`.
  - Implement `triggerClientPruning(config: SupabaseConfig, days: number = 14): Promise<boolean>`:
    - Calls PostgREST RPC `prune_expired_bug_reports`.
  - Update `uploadBugReportToSupabase`:
    - Run pre-flight `triggerClientPruning`.
    - Check quota status; if exceeded, enqueue to `cat_vision_offline_supabase_queue` and return `isOfflineQueued: true` with explanatory message.

### Milestone 4.5: Operator UI Quota Dashboard & Setting Controls
- **Target Files**:
  - `src/components/telemetry/SupabaseSettingsModal.tsx`
  - `src/components/recorder/RecorderExportModal.tsx`
- **Action**:
  - In `SupabaseSettingsModal.tsx`:
    - Add visual storage capacity gauge showing usage / 450MB with color coding:
      - `< 70%`: Emerald green.
      - `70% - 90%`: Amber warning.
      - `> 90%`: Crimson danger.
    - Add `"Prune Expired Data (> 14 Days)"` button with immediate feedback.
    - Add auto-prune toggle (`hasAutoPruning: boolean`).
  - In `RecorderExportModal.tsx`:
    - Surface quota warning badge if Supabase storage is near capacity.
    - Show offline queue counter if reports are pending synchronization.

### Milestone 4.6: Verification & Test Suite
- **Target Files**:
  - `BE/tests/test_bug_reports_supabase_pruning.py`
  - `src/services/telemetry/__tests__/supabase-client.test.ts`
- **Action**:
  - Author unit tests for `get_storage_usage` and `prune_expired_records`.
  - Mock PostgREST responses for 440MB vs 460MB states.
  - Test circuit breaker opening and fallback to local queue.

---

## 3. Strict Coding Constraints & Rules

1. **Boolean Standards**:
   - Only `is` and `has` prefixes are permitted (`isQuotaExceeded`, `hasAutoPruning`, `isPruned`, `isEnabled`).
   - Banned: `can`, `should`, `was`, `did`.
   - Positive polarity framing only.
2. **Parameter Structs**:
   - All multi-argument functions must receive a typed options/parameter struct (e.g. `SupabaseUploadParams`, `PruningOptions`).
3. **Vertical Line Gaps**:
   - Mandatory blank lines before `if`, after `}`, and before `return`.
4. **Zero-Nesting Guard Clauses**:
   - Invert conditions and return early to maintain nesting level $\le 2$.

---

## 4. Acceptance Criteria & Quality Gates

- [ ] `public.get_telemetry_storage_usage()` returns accurate byte counts and boolean `is_quota_exceeded`.
- [ ] `public.prune_expired_bug_reports(14)` removes rows older than 14 days and cascades to attachments.
- [ ] Backend `verify_quota_and_prune` halts cloud uploads when storage $\ge 450\text{MB}$.
- [ ] Fallback persistence to `.logs/recorded-bugs/<session_id>/` executes seamlessly upon quota rejection.
- [ ] UI gauge displays real-time capacity and updates immediately upon pruning.
- [ ] All automated unit tests pass 100% green without regressions.
