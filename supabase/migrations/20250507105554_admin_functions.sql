-- Admin function to create relationship that bypasses RLS
CREATE OR REPLACE FUNCTION admin_create_relationship(node1 uuid, node2 uuid, rel_type text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the permissions of the creator (typically an admin)
AS $$
DECLARE
  result json;
BEGIN
  -- Insert the relationship directly, bypassing RLS
  INSERT INTO relationships (node_id_1, node_id_2, type)
  VALUES (node1, node2, rel_type)
  RETURNING to_json(relationships.*) INTO result;
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error creating relationship: %', SQLERRM;
END;
$$;

-- Function to get all debug info
CREATE OR REPLACE FUNCTION get_debug_info()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the permissions of the creator
AS $$
DECLARE
  all_nodes json;
  all_relationships json;
  all_invites json;
  rls_status json;
BEGIN
  -- Get nodes
  SELECT json_agg(n.*) FROM nodes n INTO all_nodes;
  
  -- Get relationships
  SELECT json_agg(r.*) FROM relationships r INTO all_relationships;
  
  -- Get invites
  SELECT json_agg(i.*) FROM invites i INTO all_invites;
  
  -- Get RLS status
  SELECT json_agg(json_build_object(
    'table_name', relname,
    'has_rls', relrowsecurity
  ))
  FROM pg_class
  WHERE relname IN ('nodes', 'relationships', 'invites')
  INTO rls_status;
  
  RETURN json_build_object(
    'nodes', COALESCE(all_nodes, '[]'::json),
    'relationships', COALESCE(all_relationships, '[]'::json),
    'invites', COALESCE(all_invites, '[]'::json),
    'rls_status', COALESCE(rls_status, '[]'::json)
  );
END;
$$; 