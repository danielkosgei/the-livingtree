-- Drop all existing policies
DROP POLICY IF EXISTS "Manage own node" ON nodes;
DROP POLICY IF EXISTS "View nodes in clusters" ON nodes;
DROP POLICY IF EXISTS "Users can view nodes in shared clusters" ON nodes;
DROP POLICY IF EXISTS "Users can update their own node" ON nodes;
DROP POLICY IF EXISTS "Users can delete their own node" ON nodes;
DROP POLICY IF EXISTS "Users can view their own node" ON nodes;
DROP POLICY IF EXISTS "Users can create their own node" ON nodes;
DROP POLICY IF EXISTS "View members in own clusters" ON cluster_members;
DROP POLICY IF EXISTS "Join cluster if node matches" ON cluster_members;
DROP POLICY IF EXISTS "Manage cluster membership" ON cluster_members;

-- Create the absolute simplest RLS policies

-- Allow all operations on nodes for the node owner
CREATE POLICY "Full access to own nodes"
ON nodes
USING (user_id = auth.uid()::uuid)
WITH CHECK (user_id = auth.uid()::uuid);

-- Basic cluster membership policy
CREATE POLICY "Manage own cluster membership"
ON cluster_members
USING (node_id IN (SELECT id FROM nodes WHERE user_id = auth.uid()::uuid))
WITH CHECK (node_id IN (SELECT id FROM nodes WHERE user_id = auth.uid()::uuid)); 