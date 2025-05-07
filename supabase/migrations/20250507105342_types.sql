-- Enum Definitions

-- Relationship types
create type relationship_type as enum (
  'parent', 'child', 'sibling', 'spouse',
  'aunt', 'uncle', 'niece', 'nephew',
  'grandparent', 'grandchild', 'cousin', 'in_law'
);

-- Cluster role types
create type cluster_role as enum (
  'member', 'moderator', 'admin'
);

-- Invite status
create type invite_status as enum (
  'pending', 'accepted', 'rejected'
);

-- Vote values
create type vote_value as enum (
  'approve', 'reject'
);

-- Redaction levels
create type redaction_level as enum (
  'none',         -- not redacted
  'partial',      -- some details hidden
  'Initials',     -- Initials shown but nothing else
  'obscured'     -- completely hidden from the tree
);

-- Privacy levels
create type privacy_level as enum (
  'public',       -- visible to all
  'cluster_only', -- visible only within clusters
  'private',      -- only visible to owner and approved admins
  'redacted'      -- redacted
);
