-- Create function to get user node safely
CREATE OR REPLACE FUNCTION get_user_node(user_uuid UUID)
RETURNS SETOF nodes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM nodes
  WHERE user_id = user_uuid
  LIMIT 1;
END;
$$;

-- Create function to update user node safely
CREATE OR REPLACE FUNCTION update_user_node(
  user_uuid UUID,
  p_full_name TEXT,
  p_birth_date DATE,
  p_death_date DATE,
  p_privacy privacy_level,
  p_redaction redaction_level
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE nodes
  SET 
    full_name = p_full_name,
    birth_date = p_birth_date,
    death_date = p_death_date,
    privacy = p_privacy,
    redaction = p_redaction,
    updated_at = NOW()
  WHERE user_id = user_uuid;
END;
$$;

-- Create function to create user node safely
CREATE OR REPLACE FUNCTION create_user_node(
  user_uuid UUID,
  p_full_name TEXT,
  p_birth_date DATE,
  p_death_date DATE,
  p_privacy privacy_level,
  p_redaction redaction_level
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO nodes (
    user_id, 
    full_name, 
    birth_date, 
    death_date, 
    privacy, 
    redaction
  )
  VALUES (
    user_uuid,
    p_full_name,
    p_birth_date,
    p_death_date,
    p_privacy,
    p_redaction
  );
END;
$$; 