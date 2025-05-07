-- ========== EXTENSIONS ==========
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========== ENUM TYPES ==========
CREATE TYPE redaction_level AS ENUM ('none', 'partial', 'full');
CREATE TYPE privacy_level AS ENUM ('public', 'cluster_only', 'private');
CREATE TYPE relationship_type AS ENUM (
  'parent', 'child', 'sibling', 'spouse',
  'uncle', 'aunt', 'cousin', 'grandparent', 'grandchild',
  'in_law', 'niece', 'nephew'
);
CREATE TYPE cluster_role AS ENUM ('member', 'moderator', 'admin');
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE vote_value AS ENUM ('approve', 'reject');

-- ========== TABLES ==========

-- Nodes (people in the tree)
CREATE TABLE nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  full_name text NOT NULL,
  birth_date date,
  death_date date,
  redaction redaction_level DEFAULT 'none',
  privacy privacy_level DEFAULT 'cluster_only',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Relationships between nodes
CREATE TABLE relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id_1 uuid REFERENCES nodes(id) ON DELETE CASCADE,
  node_id_2 uuid REFERENCES nodes(id) ON DELETE CASCADE,
  type relationship_type NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT unique_relationship UNIQUE (node_id_1, node_id_2, type),
  CONSTRAINT no_self_link CHECK (node_id_1 != node_id_2)
);

-- Clusters (groups of relatives)
CREATE TABLE clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  description text,
  created_by uuid REFERENCES nodes(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Memberships of nodes in clusters
CREATE TABLE cluster_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid REFERENCES clusters(id) ON DELETE CASCADE,
  node_id uuid REFERENCES nodes(id) ON DELETE CASCADE,
  role cluster_role DEFAULT 'member',
  joined_at timestamp with time zone DEFAULT now(),
  UNIQUE (cluster_id, node_id)
);

-- Memories shared within clusters
CREATE TABLE memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  content_url text,
  created_by uuid REFERENCES nodes(id),
  cluster_id uuid REFERENCES clusters(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now()
);

-- Invites for onboarding
CREATE TABLE invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invited_by uuid REFERENCES nodes(id) ON DELETE CASCADE,
  invitee_email text,
  invite_code text UNIQUE NOT NULL,
  status invite_status DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone
);

-- Votes for consensus actions
CREATE TABLE votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid REFERENCES clusters(id) ON DELETE CASCADE,
  voter_node_id uuid REFERENCES nodes(id) ON DELETE CASCADE,
  target_node_id uuid REFERENCES nodes(id) ON DELETE CASCADE,
  vote vote_value NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT one_vote_per_target_per_voter UNIQUE (cluster_id, voter_node_id, target_node_id)
);

-- ========== RLS POLICIES ==========

-- Enable RLS
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Nodes: SELECT if user shares a cluster
CREATE POLICY "Users can view nodes in shared clusters"
  ON nodes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cluster_members cm
      WHERE cm.node_id = nodes.id
      AND cm.cluster_id IN (
        SELECT cluster_id FROM cluster_members
        WHERE node_id = auth.uid()::uuid
      )
    )
  );

-- Nodes: UPDATE if user owns the node
CREATE POLICY "Users can update their own node"
  ON nodes FOR UPDATE
  USING (nodes.user_id = auth.uid()::uuid);

-- Nodes: DELETE if user owns the node
CREATE POLICY "Users can delete their own node"
  ON nodes FOR DELETE
  USING (nodes.user_id = auth.uid()::uuid);

-- Relationships: view own connections
CREATE POLICY "View relationships involving self"
  ON relationships FOR SELECT
  USING (
    relationships.node_id_1 = auth.uid()::uuid
    OR relationships.node_id_2 = auth.uid()::uuid
  );

-- Clusters: view if member
CREATE POLICY "View clusters where member"
  ON clusters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cluster_members
      WHERE cluster_id = clusters.id
      AND node_id = auth.uid()::uuid
    )
  );

-- Cluster Members: view members in own clusters
CREATE POLICY "View members in own clusters"
  ON cluster_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cluster_members cm
      WHERE cm.node_id = auth.uid()::uuid
      AND cm.cluster_id = cluster_members.cluster_id
    )
  );

-- Cluster Members: insert if node matches
CREATE POLICY "Join cluster if node matches"
  ON cluster_members FOR INSERT
  WITH CHECK (node_id = auth.uid()::uuid);

-- Memories: view if in cluster
CREATE POLICY "View memories in clusters"
  ON memories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cluster_members
      WHERE cluster_id = memories.cluster_id
      AND node_id = auth.uid()::uuid
    )
  );

-- Memories: insert if in cluster
CREATE POLICY "Add memories to cluster"
  ON memories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cluster_members
      WHERE cluster_id = memories.cluster_id
      AND node_id = auth.uid()::uuid
    )
  );
