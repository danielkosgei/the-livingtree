-- Represents a person in the tree. May or may not be linked to an actual Supabase user.
create table nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  full_name text not null,
  birth_date date,
  death_date date,
  redaction redaction_level default 'none',
  privacy privacy_level default 'cluster_only',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Each row connects two people and defines a relationship
create table relationships (
  id uuid primary key default gen_random_uuid(),
  node_id_1 uuid references nodes(id) on delete cascade,
  node_id_2 uuid references nodes(id) on delete cascade,
  type relationship_type not null,
  created_at timestamp with time zone default now(),

  constraint unique_relationship unique (node_id_1, node_id_2, type),
  constraint no_self_link check (node_id_1 != node_id_2)
);

-- Family units, sibling groups, cousin rings, etc.
create table clusters (
  id uuid primary key default gen_random_uuid(),
  name text,
  description text,
  created_by uuid references nodes(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- Associate nodes with clusters adn assign a role to each node in the cluster
create table cluster_memberships (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid references clusters(id) on delete cascade,
  node_id uuid references nodes(id) on delete cascade,
  role cluster_role default 'member',
  joined_at timestamp with time zone default now(),
  unique (cluster_id, node_id)
);

-- Used to onboard new users into the tree via invite links
create table invites (
  id uuid primary key default gen_random_uuid(),
  invited_by uuid references nodes(id) on delete cascade,
  invitee_email text,
  invite_code text unique not null,
  status invite_status default 'pending',
  created_at timestamp with time zone default now(),
  accepted_at timestamp with time zone
);

-- Used to track votes on nodes in a cluster
create table votes (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid references clusters(id) on delete cascade,
  voter_node_id uuid references nodes(id) on delete cascade,
  target_node_id uuid references nodes(id) on delete cascade,
  vote vote_value not null,
  created_at timestamp with time zone default now(),
  constraint one_vote_per_target_per_voter unique (cluster_id, voter_node_id, target_node_id)
);
