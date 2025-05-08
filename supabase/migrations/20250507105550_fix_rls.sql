-- Drop existing policies
DROP POLICY IF EXISTS "Users can view nodes in shared clusters" ON nodes;
DROP POLICY IF EXISTS "Users can update their own node" ON nodes;
DROP POLICY IF EXISTS "Users can delete their own node" ON nodes;
DROP POLICY IF EXISTS "Users can view their own node" ON nodes;
DROP POLICY IF EXISTS "Users can create their own node" ON nodes;
DROP POLICY IF EXISTS "View members in own clusters" ON cluster_members;
DROP POLICY IF EXISTS "Join cluster if node matches" ON cluster_members;
DROP POLICY IF EXISTS "View relationships involving self" ON relationships;
DROP POLICY IF EXISTS "Manage relationships" ON relationships;

-- Simple policy to allow users to view and manage their own node
CREATE POLICY "Manage own node"
  ON nodes
  USING (user_id = auth.uid()::uuid)
  WITH CHECK (user_id = auth.uid()::uuid);

-- Simple policy to allow users to view nodes in their clusters
CREATE POLICY "View nodes in clusters"
  ON nodes FOR SELECT
  USING (
    id IN (
      SELECT n.id
      FROM nodes n
      JOIN cluster_members cm ON cm.node_id = n.id
      WHERE cm.cluster_id IN (
        SELECT cluster_id
        FROM cluster_members
        WHERE node_id IN (
          SELECT id FROM nodes WHERE user_id = auth.uid()::uuid
        )
      )
    )
  );

-- Simple policy for cluster members
CREATE POLICY "Manage cluster membership"
  ON cluster_members
  USING (
    node_id IN (
      SELECT id FROM nodes WHERE user_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    node_id IN (
      SELECT id FROM nodes WHERE user_id = auth.uid()::uuid
    )
  );

-- Policy to allow users to view relationships they're part of
CREATE POLICY "View relationships"
  ON relationships FOR SELECT
  USING (
    node_id_1 IN (SELECT id FROM nodes WHERE user_id = auth.uid()::uuid)
    OR node_id_2 IN (SELECT id FROM nodes WHERE user_id = auth.uid()::uuid)
  );

-- Policy to allow users to create relationships
CREATE POLICY "Create relationships"
  ON relationships FOR INSERT
  WITH CHECK (
    -- Either the user owns node 1
    node_id_1 IN (SELECT id FROM nodes WHERE user_id = auth.uid()::uuid)
    -- Or they own node 2
    OR node_id_2 IN (SELECT id FROM nodes WHERE user_id = auth.uid()::uuid)
  ); 