-- Function to safely update invite relationship type
CREATE OR REPLACE FUNCTION update_invite_relationship_type(p_invite_id uuid, p_relationship_type text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Cast the text input to the relationship_type enum and update the invite
  UPDATE invites 
  SET relationship_type = p_relationship_type::relationship_type
  WHERE id = p_invite_id;
END;
$$;

-- Function to safely create relationship with proper type casting
CREATE OR REPLACE FUNCTION create_relationship_with_type(p_node_id_1 uuid, p_node_id_2 uuid, p_relationship_type text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO relationships (node_id_1, node_id_2, type)
  VALUES (p_node_id_1, p_node_id_2, p_relationship_type::relationship_type);
END;
$$; 