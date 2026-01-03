-- Force PostgREST to reload its schema cache so new tables/functions are immediately available
-- This addresses transient "Could not find the table 'public.invoices' in the schema cache" errors

NOTIFY pgrst, 'reload schema';

-- Safe RPC to reload schema on demand
CREATE OR REPLACE FUNCTION public.reload_postgrest_schema()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END;
$$;

REVOKE ALL ON FUNCTION public.reload_postgrest_schema() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reload_postgrest_schema() TO anon, authenticated;