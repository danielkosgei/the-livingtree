-- Disable RLS on all tables
ALTER TABLE nodes DISABLE ROW LEVEL SECURITY;
ALTER TABLE relationships DISABLE ROW LEVEL SECURITY;
ALTER TABLE clusters DISABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE memories DISABLE ROW LEVEL SECURITY;
ALTER TABLE invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE votes DISABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view nodes in shared clusters" ON nodes;
DROP POLICY IF EXISTS "Users can update their own node" ON nodes;
DROP POLICY IF EXISTS "Users can delete their own node" ON nodes;
DROP POLICY IF EXISTS "View relationships involving self" ON relationships;
DROP POLICY IF EXISTS "View clusters where member" ON clusters;
DROP POLICY IF EXISTS "View members in own clusters" ON cluster_members;
DROP POLICY IF EXISTS "Join cluster if node matches" ON cluster_members;
DROP POLICY IF EXISTS "View memories in clusters" ON memories;
DROP POLICY IF EXISTS "Add memories to cluster" ON memories;

-- Create or replace the trigger function to handle relationship creation
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
      -- Create the relationship using the safe function
      PERFORM create_relationship_with_type(v_invite.invited_by, NEW.id, v_invite.relationship_type);
      
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