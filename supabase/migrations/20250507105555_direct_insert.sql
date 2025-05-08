-- Create a function for directly inserting relationships
-- This bypasses RLS completely using a trigger

-- Create a view for direct inserts
CREATE OR REPLACE VIEW direct_relationships AS
SELECT * FROM relationships;

-- First, make sure relationships table has a trigger
DROP TRIGGER IF EXISTS direct_relationship_insert ON direct_relationships;

-- Create a function to handle the inserts
CREATE OR REPLACE FUNCTION process_direct_relationship_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert directly into the relationships table
  INSERT INTO relationships (node_id_1, node_id_2, type)
  VALUES (NEW.node_id_1, NEW.node_id_2, NEW.type);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger on the view
CREATE TRIGGER direct_relationship_insert
INSTEAD OF INSERT ON direct_relationships
FOR EACH ROW
EXECUTE FUNCTION process_direct_relationship_insert();

-- Create a simpler function that can be called from server actions
CREATE OR REPLACE FUNCTION create_relationship_direct(
  node_id_1 uuid,
  node_id_2 uuid,
  relationship_type text
) RETURNS boolean AS $$
BEGIN
  INSERT INTO relationships (node_id_1, node_id_2, type)
  VALUES (node_id_1, node_id_2, relationship_type);
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 