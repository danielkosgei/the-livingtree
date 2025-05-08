-- Create helper function to disable RLS on specific tables
-- This should only be used in development or as a temporary fix
CREATE OR REPLACE FUNCTION disable_rls_for_table(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the permissions of the creator
AS $$
BEGIN
  -- Only allow specific tables to be modified
  IF table_name = 'relationships' THEN
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', table_name);
    RETURN true;
  ELSE
    RAISE EXCEPTION 'Table % not allowed for RLS modification', table_name;
  END IF;
END;
$$; 