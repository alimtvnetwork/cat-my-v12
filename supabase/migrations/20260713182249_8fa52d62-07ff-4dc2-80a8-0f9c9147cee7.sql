-- License persistence + audit trail (spec/21-app/60-licensing.md).
-- Singleton current state + append-only verification audit. Server-only
-- access via service_role; RLS denies all client roles.

CREATE TABLE public.license_state (
  id               text        PRIMARY KEY DEFAULT 'singleton' CHECK (id = 'singleton'),
  license_id       text,
  tier             text        NOT NULL DEFAULT 'TierOne',
  status           text        NOT NULL DEFAULT 'Missing',
  serial_number    text,
  machine_hash     text,
  expires_at       timestamptz,
  features         jsonb       NOT NULL DEFAULT '[]'::jsonb,
  record           jsonb,
  verified_at      timestamptz NOT NULL DEFAULT now(),
  server_response_id text,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.license_state TO service_role;
ALTER TABLE public.license_state ENABLE ROW LEVEL SECURITY;
-- No client policies: only service_role (server code) touches this table.

CREATE TABLE public.license_audit (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id         text,
  status             text        NOT NULL,
  tier               text        NOT NULL,
  reason             text,
  features           jsonb       NOT NULL DEFAULT '[]'::jsonb,
  server_response_id text,
  actor              text,
  verified_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX license_audit_verified_at_idx ON public.license_audit (verified_at DESC);

GRANT ALL ON public.license_audit TO service_role;
ALTER TABLE public.license_audit ENABLE ROW LEVEL SECURITY;
-- No client policies: audit is server-authored.

CREATE OR REPLACE FUNCTION public.license_state_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER license_state_updated_at
BEFORE UPDATE ON public.license_state
FOR EACH ROW EXECUTE FUNCTION public.license_state_touch_updated_at();