-- Bug-report tables for Supabase (spec 54, AGM two-role pattern
-- adapted to a single bug-reporting purpose).
--
-- HOW TO APPLY: paste this file into the Supabase dashboard SQL
-- editor and run it. The backend verifies both tables via
-- POST /bug-reports/test (table check) before any upload.
--
-- SECURITY NOTE (honest, same caveat as AGM): the RLS policies below
-- are commented out on purpose. Enabling permissive anon/authenticated
-- policies (as AGM ships) lets anyone with the project key read and
-- write bug reports. Uncomment them only for a throwaway project, and
-- tighten them (e.g. authenticated-only + service-role writes) for
-- anything real. Bug reports contain stack traces: treat them as
-- semi-sensitive and redact secrets before upload (the backend does
-- this for known secret-shaped Details keys).

create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
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
    check (status in ('pending', 'downloaded', 'resolved')),
  reporter_context jsonb not null default '{}'::jsonb,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.bug_attachments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.bug_reports (id) on delete cascade,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  storage_path text,
  delivery_note text,
  created_at timestamptz not null default now()
);

create index if not exists bug_reports_status_idx
  on public.bug_reports (status, created_at desc);
create index if not exists bug_reports_correlation_idx
  on public.bug_reports (correlation_id);
create index if not exists bug_attachments_report_idx
  on public.bug_attachments (report_id);

-- Optional permissive policies (see SECURITY NOTE above):
-- alter table public.bug_reports enable row level security;
-- alter table public.bug_attachments enable row level security;
-- create policy "bug_reports_full_access" on public.bug_reports
--   for all to anon, authenticated using (true) with check (true);
-- create policy "bug_attachments_full_access" on public.bug_attachments
--   for all to anon, authenticated using (true) with check (true);
