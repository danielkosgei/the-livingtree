export interface TreeNode {
  id: string;
  full_name: string;
  birth_date?: string;
  death_date?: string;
  privacy: string;
  redaction: string;
}

export interface Relationship {
  id: string;
  node_id_1: string;
  node_id_2: string;
  type: string;
  created_at: string;
}
