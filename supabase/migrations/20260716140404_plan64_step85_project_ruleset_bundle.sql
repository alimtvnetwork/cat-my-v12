-- Plan 64 step 85: project + ruleset + run + assets bundle.
--
-- Root cause of prior gap: every server fn added in steps 66-84 returned
-- synthetic ids because the tables did not exist. This migration lands
-- the full schema so those fns can flip from synthetic to real inserts.
--
-- Tables:
--   public.projects              - one row per user Project
--   public.rulesets              - global Rule Sets (owned by a user)
--   public.project_rulesets      - join Project<->Ruleset with override mode
--   public.project_categories    - per-project categories
--   public.camera_settings       - reusable camera setting profile
--   public.runs                  - runs of a project against a ruleset
--   public.shape_assets          - Design Mode compiled SVG shapes
--   public.palette_layouts       - per-user palette dock/float positions
-- Plus view: public.recent_projects (top-10 per user, opened_at desc)
--
-- All tables: RLS on, owner-scoped policies, GRANT to authenticated +
-- service_role, no anon access (this is auth-only app data).

------------------------------------------------------------------------
-- projects
------------------------------------------------------------------------
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  camera_settings_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX projects_owner_opened_idx ON public.projects (owner_id, opened_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_owner_all ON public.projects
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

------------------------------------------------------------------------
-- rulesets
------------------------------------------------------------------------
CREATE TABLE public.rulesets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  parent_ruleset_id uuid REFERENCES public.rulesets(id) ON DELETE SET NULL,
  override_mode text NOT NULL DEFAULT 'reference'
    CHECK (override_mode IN ('reference', 'snapshot')),
  body jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rulesets_owner_idx ON public.rulesets (owner_id, updated_at DESC);
CREATE INDEX rulesets_parent_idx ON public.rulesets (parent_ruleset_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rulesets TO authenticated;
GRANT ALL ON public.rulesets TO service_role;
ALTER TABLE public.rulesets ENABLE ROW LEVEL SECURITY;

CREATE POLICY rulesets_owner_all ON public.rulesets
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

------------------------------------------------------------------------
-- project_rulesets (join with per-row override mode)
------------------------------------------------------------------------
CREATE TABLE public.project_rulesets (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ruleset_id uuid NOT NULL REFERENCES public.rulesets(id) ON DELETE CASCADE,
  override_mode text NOT NULL DEFAULT 'reference'
    CHECK (override_mode IN ('reference', 'snapshot')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, ruleset_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_rulesets TO authenticated;
GRANT ALL ON public.project_rulesets TO service_role;
ALTER TABLE public.project_rulesets ENABLE ROW LEVEL SECURITY;

-- Owner of the parent project owns the join row.
CREATE POLICY project_rulesets_owner_all ON public.project_rulesets
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_rulesets.project_id AND p.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_rulesets.project_id AND p.owner_id = auth.uid()
  ));

------------------------------------------------------------------------
-- project_categories
------------------------------------------------------------------------
CREATE TABLE public.project_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  auto_apply boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, name)
);
CREATE INDEX project_categories_project_idx ON public.project_categories (project_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_categories TO authenticated;
GRANT ALL ON public.project_categories TO service_role;
ALTER TABLE public.project_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_categories_owner_all ON public.project_categories
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_categories.project_id AND p.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_categories.project_id AND p.owner_id = auth.uid()
  ));

------------------------------------------------------------------------
-- camera_settings
------------------------------------------------------------------------
CREATE TABLE public.camera_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  fov numeric,
  shutter_us integer,
  pockets integer,
  gain numeric,
  resolution_w integer,
  resolution_h integer,
  extras jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX camera_settings_owner_idx ON public.camera_settings (owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.camera_settings TO authenticated;
GRANT ALL ON public.camera_settings TO service_role;
ALTER TABLE public.camera_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY camera_settings_owner_all ON public.camera_settings
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

ALTER TABLE public.projects
  ADD CONSTRAINT projects_camera_settings_fk
  FOREIGN KEY (camera_settings_id) REFERENCES public.camera_settings(id) ON DELETE SET NULL;

------------------------------------------------------------------------
-- runs
------------------------------------------------------------------------
CREATE TABLE public.runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX runs_project_started_idx ON public.runs (project_id, started_at DESC);
CREATE INDEX runs_owner_idx ON public.runs (owner_id, started_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.runs TO authenticated;
GRANT ALL ON public.runs TO service_role;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY runs_owner_all ON public.runs
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

------------------------------------------------------------------------
-- shape_assets (Design Mode compiled SVG)
------------------------------------------------------------------------
CREATE TABLE public.shape_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  sha256 text NOT NULL,
  svg text NOT NULL,
  view_box text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, sha256)
);
CREATE INDEX shape_assets_owner_idx ON public.shape_assets (owner_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shape_assets TO authenticated;
GRANT ALL ON public.shape_assets TO service_role;
ALTER TABLE public.shape_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY shape_assets_owner_all ON public.shape_assets
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

------------------------------------------------------------------------
-- palette_layouts (per-user dock/float positions)
------------------------------------------------------------------------
CREATE TABLE public.palette_layouts (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.palette_layouts TO authenticated;
GRANT ALL ON public.palette_layouts TO service_role;
ALTER TABLE public.palette_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY palette_layouts_owner_all ON public.palette_layouts
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

------------------------------------------------------------------------
-- recent_projects view (top 10 per owner)
------------------------------------------------------------------------
CREATE VIEW public.recent_projects
WITH (security_invoker = true) AS
SELECT
  p.id AS project_id,
  p.owner_id,
  p.name,
  p.opened_at
FROM public.projects p
ORDER BY p.opened_at DESC;

GRANT SELECT ON public.recent_projects TO authenticated;
GRANT ALL ON public.recent_projects TO service_role;

------------------------------------------------------------------------
-- updated_at trigger helpers
------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER rulesets_set_updated_at
  BEFORE UPDATE ON public.rulesets
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER camera_settings_set_updated_at
  BEFORE UPDATE ON public.camera_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
