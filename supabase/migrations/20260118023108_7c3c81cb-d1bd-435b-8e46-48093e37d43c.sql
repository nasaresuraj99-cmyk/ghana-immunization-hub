-- Allow creating facilities from the app (needed for inventory facility_id UUID)
-- Existing project uses permissive RLS elsewhere; keep consistent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'facilities'
      AND policyname = 'Allow all inserts on facilities'
  ) THEN
    CREATE POLICY "Allow all inserts on facilities"
    ON public.facilities
    FOR INSERT
    WITH CHECK (true);
  END IF;
END
$$;