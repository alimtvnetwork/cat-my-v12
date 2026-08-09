-- Plan 21 Step 4: Supabase mirror for audit_events (spec 72 §72.3, §72.4, §72.5)
CREATE TABLE IF NOT EXISTS public.audit_events (
  event_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts             timestamptz NOT NULL DEFAULT now(),
  code           text NOT NULL,
  policy         text NOT NULL,
  correlation_id text NOT NULL,
  actor          jsonb,
  payload        jsonb NOT NULL,
  schema_version smallint NOT NULL DEFAULT 1
);

-- Covering indexes (spec 72 §72.4)
CREATE INDEX IF NOT EXISTS ix_audit_events_policy_ts
  ON public.audit_events (policy, ts DESC);
CREATE INDEX IF NOT EXISTS ix_audit_events_ts_id
  ON public.audit_events (ts ASC, event_id ASC);
CREATE INDEX IF NOT EXISTS ix_audit_events_correlation
  ON public.audit_events (correlation_id);

-- Grants (spec 72 §72.5). No anon; SELECT for authenticated is gated by admin RLS below.
GRANT SELECT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Admin-only SELECT. INSERT/UPDATE/DELETE remain closed to authenticated;
-- service_role bypasses RLS for the Python sink writer.
DROP POLICY IF EXISTS "Admins can read audit events" ON public.audit_events;
CREATE POLICY "Admins can read audit events"
  ON public.audit_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));