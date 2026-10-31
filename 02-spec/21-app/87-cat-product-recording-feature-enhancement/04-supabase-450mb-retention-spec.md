# 04 - Supabase 450MB Quota & 14-Day Auto-Pruning Specification

- **Specification ID**: `SPEC-87-04`
- **Module**: `AppRuntime / Telemetry / SupabaseStorage`
- **Status**: Verified Specification
- **Date**: 2026-10-31

---

## 1. Executive Summary

To prevent cloud database and object storage bloat in factory deployments, strict retention quotas are enforced:
1. **450MB Storage Limit**: The total storage consumed by recorded bug sessions and visual attachments in Supabase must never exceed 450MB.
2. **14-Day Pruning Policy**: Any bug session and associated screenshot objects older than 14 days (2 weeks) are automatically deleted before or during sync.

---

## 2. Retention Algorithm

```
Total Usage >= 450MB OR Old Records Exist (> 14 days)?
   │
   ├── YES ──> Query sessions where created_at < NOW() - 14 DAYS
   │           Delete associated screenshot files from storage bucket
   │           Delete records from bug_reports table
   │           Verify storage is under 450MB quota
   │
   └── NO  ──> Proceed with upload of current session
```
