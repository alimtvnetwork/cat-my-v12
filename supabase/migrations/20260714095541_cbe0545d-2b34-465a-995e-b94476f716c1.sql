
-- Plan 22 v2.0.6.1: durable audit bundle storage
-- Admin-only SELECT on the private bucket. INSERT is service-role from server code.
CREATE POLICY "Admins can read audit-bundles"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'audit-bundles'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );
