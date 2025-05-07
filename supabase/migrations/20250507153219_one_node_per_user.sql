ALTER TABLE nodes
ADD CONSTRAINT unique_user_node UNIQUE (user_id);

-- Allow INSERT only if user_id = auth.uid()
CREATE POLICY "Logged-in users can create their own node"
ON nodes FOR INSERT
WITH CHECK (user_id = auth.uid()::uuid);

