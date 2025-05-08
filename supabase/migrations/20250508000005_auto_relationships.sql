-- Add a column to nodes table to track the invite used to create it
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS created_from_invite uuid REFERENCES invites(id);

-- Create a function to handle automatic relationship creation
CREATE OR REPLACE FUNCTION handle_node_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_invite record;
BEGIN
  -- If this node was created from an invite
  IF NEW.created_from_invite IS NOT NULL THEN
    -- Get the invite details
    SELECT * INTO v_invite FROM invites WHERE id = NEW.created_from_invite;
    
    IF FOUND THEN
      -- Create the relationship
      INSERT INTO relationships (node_id_1, node_id_2, type)
      VALUES (v_invite.invited_by, NEW.id, v_invite.relationship_type);
      
      -- Update invite status
      UPDATE invites 
      SET status = 'accepted',
          accepted_at = NOW()
      WHERE id = NEW.created_from_invite;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS auto_create_relationship ON nodes;
CREATE TRIGGER auto_create_relationship
  AFTER INSERT ON nodes
  FOR EACH ROW
  EXECUTE FUNCTION handle_node_creation();

-- Add relationship_type column to invites if it doesn't exist
ALTER TABLE invites ADD COLUMN IF NOT EXISTS relationship_type text; 