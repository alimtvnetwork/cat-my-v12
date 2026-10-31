-- Bug-report tables for Supabase (spec 54 & spec 87, AGM two-role pattern
-- adapted to diagnostic recording and bug-reporting purpose).
--
-- Storage Governance: 450MB Cap (471,859,200 bytes) + 14-Day Rolling Eviction
--
-- HOW TO APPLY: paste this file into the Supabase dashboard SQL
-- editor and run it. The backend verifies both tables via
-- POST /bug-reports/test (table check) before any upload.
--
-- SECURITY NOTE: the RLS policies below are commented out on purpose.
-- Enabling permissive anon/authenticated policies lets anyone with the
-- project key read and write bug reports. Tighten them for production.

create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  ticket_id text unique,
  node_id text,
  title text not null,
  code text,
  correlation_id text unique,
  message text,
  stack_trace text,
  endpoint text,
  trigger_component text,
  session_id text,
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

-- Backwards-compatibility migrations for existing tables
alter table public.bug_reports add column if not exists ticket_id text unique;
alter table public.bug_reports add column if not exists initial_route text;
alter table public.bug_reports add column if not exists events_count integer not null default 0;
alter table public.bug_reports add column if not exists has_screenshot boolean not null default false;
alter table public.bug_reports add column if not exists is_synced boolean not null default true;
alter table public.bug_reports add column if not exists split_db_errors jsonb not null default '[]'::jsonb;
alter table public.bug_reports add column if not exists active_recipe jsonb not null default '{}'::jsonb;

create table if not exists public.bug_attachments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.bug_reports (id) on delete cascade,
  file_name text not null,
  mime_type text not null default 'image/png',
  size_bytes bigint not null default 0,
  storage_path text,
  delivery_note text,
  created_at timestamptz not null default now()
);

-- Indexes for status, correlation, retention, and quota aggregation
create index if not exists bug_reports_status_idx
  on public.bug_reports (status, created_at desc);

create index if not exists bug_reports_correlation_idx
  on public.bug_reports (correlation_id);

create index if not exists bug_reports_created_at_idx
  on public.bug_reports (created_at asc);

create index if not exists bug_reports_ticket_idx
  on public.bug_reports (ticket_id);

create index if not exists bug_attachments_report_idx
  on public.bug_attachments (report_id);

create index if not exists bug_attachments_size_idx
  on public.bug_attachments (size_bytes);

-- =========================================================================
-- Storage Quota & 14-Day Pruning Stored Procedures
-- 450MB Storage Limit Invariant: 450 * 1024 * 1024 = 471,859,200 bytes
-- =========================================================================

-- Function: get_telemetry_storage_usage
-- Returns total storage consumed across relational attachments, estimated rows,
-- and binary storage objects (if storage schema is accessible).
create or replace function public.get_telemetry_storage_usage()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_attachment_bytes bigint;
  v_storage_object_bytes bigint := 0;
  v_report_count bigint;
  v_estimated_row_bytes bigint;
  v_total_bytes bigint;
  v_quota_bytes bigint := 471859200; -- 450 MB (450 * 1024 * 1024)
begin
  select coalesce(sum(size_bytes), 0) into v_attachment_bytes from public.bug_attachments;
  select count(*) into v_report_count from public.bug_reports;
  v_estimated_row_bytes := v_report_count * 8192;

  -- Attempt to account for Supabase storage bucket if storage schema is queryable
  begin
    if exists (
      select 1 from information_schema.tables 
      where table_schema = 'storage' and table_name = 'objects'
    ) then
      select coalesce(sum((metadata->>'size')::bigint), 0)
        into v_storage_object_bytes
        from storage.objects
       where bucket_id in ('cat-vision-telemetry', 'bug-reports');
    end if;
  exception when others then
    v_storage_object_bytes := 0;
  end;

  v_total_bytes := greatest(v_attachment_bytes, v_storage_object_bytes) + v_estimated_row_bytes;

  return jsonb_build_object(
    'attachment_bytes', v_attachment_bytes,
    'storage_object_bytes', v_storage_object_bytes,
    'report_count', v_report_count,
    'total_bytes', v_total_bytes,
    'quota_bytes', v_quota_bytes,
    'is_quota_exceeded', (v_total_bytes >= v_quota_bytes),
    'available_bytes', greatest(0, v_quota_bytes - v_total_bytes)
  );
end;
$$;

-- Function: prune_expired_bug_reports
-- Cascading deletion of reports and attachments older than p_retention_days (default 14).
create or replace function public.prune_expired_bug_reports(p_retention_days integer default 14)
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
  v_cutoff := now() - (p_retention_days || ' days')::interval;

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

-- Overload for p_days argument alias
create or replace function public.prune_expired_bug_reports(p_days integer)
returns jsonb
language plpgsql
security definer
as $$
begin
  return public.prune_expired_bug_reports(p_retention_days => p_days);
end;
$$;

-- Function: prune_oldest_bug_reports
-- Evicts oldest records sequentially until target freed byte budget is achieved.
create or replace function public.prune_oldest_bug_reports(p_target_bytes bigint)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_report record;
  v_deleted_reports bigint := 0;
  v_freed_bytes bigint := 0;
  v_attachment_bytes bigint;
begin
  for v_report in
    select id from public.bug_reports order by created_at asc
  loop
    exit when v_freed_bytes >= p_target_bytes;

    select coalesce(sum(size_bytes), 0) into v_attachment_bytes
      from public.bug_attachments where report_id = v_report.id;

    delete from public.bug_reports where id = v_report.id;

    v_deleted_reports := v_deleted_reports + 1;
    v_freed_bytes := v_freed_bytes + v_attachment_bytes + 8192;
  end loop;

  return jsonb_build_object(
    'deleted_reports_count', v_deleted_reports,
    'freed_bytes', v_freed_bytes,
    'is_pruned', (v_deleted_reports > 0)
  );
end;
$$;

-- Optional permissive policies:
-- alter table public.bug_reports enable row level security;
-- alter table public.bug_attachments enable row level security;
-- create policy "bug_reports_full_access" on public.bug_reports
--   for all to anon, authenticated using (true) with check (true);
-- create policy "bug_attachments_full_access" on public.bug_attachments
--   for all to anon, authenticated using (true) with check (true);
