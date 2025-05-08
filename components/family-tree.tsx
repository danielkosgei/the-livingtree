'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TreeDeciduous, Plus, UserPlus, User, AlertCircle, Settings, Download, Share2, ZoomIn, ZoomOut } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { AddRelativeModal } from '@/components/add-relative-modal';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { useSupabase } from '@/hooks/use-supabase';
import { TreeNode, Relationship } from '@/types';

interface UserNodeCardProps {
  node: TreeNode;
  isCurrentUser: boolean;
  relationshipType?: string;
  style?: React.CSSProperties;
}

interface AddRelativeCardProps {
  onAdd: () => void;
  relationshipType?: string;
}

interface TreeLayoutNode {
  id: string;
  x: number;
  y: number;
}

interface TreeConnection {
  from: TreeLayoutNode;
  to: TreeLayoutNode;
}

interface TreeLayout {
  nodes: Record<string, TreeLayoutNode>;
  connections: TreeConnection[];
}

type NodePosition = {
  id: string;
  x: number;
  y: number;
  level: number;
};

interface TreeNode {
  id: string
  user_id: string
  full_name: string
  birth_date?: string
  death_date?: string
  privacy: string
  redaction: string
}

type Relationship = {
  id: string
  node_id_1: string
  node_id_2: string
  type: string
}

function calculateTreeLayout(nodes: TreeNode[], relationships: Relationship[], rootId: string): TreeLayout {
  const layout: Record<string, TreeLayoutNode> = {};
  const connections: TreeConnection[] = [];
  const processed = new Set<string>();
  const levelNodes: Record<number, string[]> = {};
  const horizontalSpacing = 300;
  const verticalSpacing = 180;

  // First pass: organize nodes by level and calculate width
  function organizeByLevel(nodeId: string, level: number): void {
    if (processed.has(nodeId)) return;
    processed.add(nodeId);

    if (!levelNodes[level]) levelNodes[level] = [];
    levelNodes[level].push(nodeId);

    // Process children
    const children = relationships
      .filter(r => r.node_id_1 === nodeId)
      .map(r => r.node_id_2);

    children.forEach(childId => organizeByLevel(childId, level + 1));
  }

  // Reset and do first pass
  processed.clear();
  organizeByLevel(rootId, 0);

  // Second pass: calculate positions
  processed.clear();
  function processLevel(nodeId: string, level: number, position: number): void {
    if (processed.has(nodeId)) return;
    processed.add(nodeId);

    // Calculate position
    const levelWidth = levelNodes[level].length;
    const x = (position - (levelWidth - 1) / 2) * horizontalSpacing;
    const y = level * verticalSpacing;
    layout[nodeId] = { id: nodeId, x, y };

    // Find and process children
    const children = relationships
      .filter(r => r.node_id_1 === nodeId)
      .map(r => r.node_id_2);

    // Process children and create connections
    children.forEach((childId, index) => {
      const childLevel = level + 1;
      const childLevelWidth = levelNodes[childLevel]?.length || 1;
      const childIndex = levelNodes[childLevel]?.indexOf(childId) || 0;
      processLevel(childId, childLevel, childIndex);
      
      // Add connection
      if (layout[nodeId] && layout[childId]) {
        connections.push({
          from: layout[nodeId],
          to: layout[childId]
        });
      }
    });
  }

  // Start from root
  processLevel(rootId, 0, 0);
  
  return {
    nodes: layout,
    connections
  };
}

const UserNodeCard = React.memo<UserNodeCardProps>(({ node, isCurrentUser, relationshipType, style }) => {
  return (
    <Card className={cn(
      'relative min-w-[200px] transition-all duration-200 shadow-lg hover:shadow-xl',
      isCurrentUser ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'
    )} style={style}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <div className="font-medium">{node.full_name}</div>
            {node.birth_date && (
              <div className="text-xs text-muted-foreground">
                b. {new Date(node.birth_date).getFullYear()}
                {node.death_date && ` - d. ${new Date(node.death_date).getFullYear()}`}
              </div>
            )}
          </div>
        </div>
        {relationshipType && (
          <div className="mt-3 text-xs font-medium text-primary/80 capitalize border-t pt-2">
            {relationshipType.replace('_', ' ')}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

UserNodeCard.displayName = 'UserNodeCard';

const AddRelativeCard = React.memo<AddRelativeCardProps>(({ onAdd, relationshipType }) => {
  return (
    <Button
      variant="outline"
      className="h-auto p-4 border-dashed"
      onClick={onAdd}
    >
      <UserPlus className="w-4 h-4 mr-2" />
      Add {relationshipType ? relationshipType.replace('_', ' ') : 'relative'}
    </Button>
  );
});

AddRelativeCard.displayName = 'AddRelativeCard';

export function FamilyTree() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [userNode, setUserNode] = useState<TreeNode | null>(null);
  const [allNodes, setAllNodes] = useState<TreeNode[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showAddRelativeModal, setShowAddRelativeModal] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<string | null>(null);

  const user = useUser();
  const { toast } = useToast();
  const supabase = useSupabase();

  const treeLayout = useMemo(() => {
    if (!userNode) return null;
    return calculateTreeLayout(allNodes, relationships, userNode.id);
  }, [userNode, allNodes, relationships]);

  useEffect(() => {
    if (!user) return;
    loadUserNode();
  }, [user]);

  const loadUserNode = async () => {
    try {
      if (!user?.id) {
        throw new Error('No user ID found');
      }

      // First check if user node exists
      const { data: existingNode, error: fetchError } = await supabase
        .from('nodes')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError?.code === 'PGRST116') {
        // Node doesn't exist, create it
        const { data: newNode, error: createError } = await supabase
          .from('nodes')
          .insert([{
            user_id: user.id,
            full_name: user.user_metadata?.full_name || 'Anonymous',
            created_at: new Date().toISOString(),
          }])
          .select()
          .single();

        if (createError) throw createError;
        setUserNode(newNode);
      } else if (fetchError) {
        throw fetchError;
      } else {
        setUserNode(existingNode);
        await loadRelatedNodes(existingNode.id);
      }
    } catch (error: any) {
      console.error('Error loading user node:', error);
      setError(`Failed to load user data: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedNodes = async (nodeId: string) => {
    try {
      // Load relationships
      const { data: rels, error: relsError } = await supabase
        .from('relationships')
        .select('*')
        .or(`node_id_1.eq.${nodeId},node_id_2.eq.${nodeId}`);

      if (relsError) throw relsError;

      if (rels && rels.length > 0) {
        setRelationships(rels);

        // Load related nodes
        const relatedNodeIds = rels
          .map(r => [r.node_id_1, r.node_id_2])
          .flat()
          .filter(id => id !== nodeId);

        if (relatedNodeIds.length > 0) {
          const { data: nodes, error: nodesError } = await supabase
            .from('nodes')
            .select('*')
            .in('id', relatedNodeIds);

          if (nodesError) throw nodesError;
          if (nodes) setAllNodes(nodes);
        }
      }
    } catch (error: any) {
      console.error('Error loading related nodes:', error);
      setError(`Failed to load family tree data: ${error.message || 'Unknown error'}`);
    }
  };

  const handleAddRelative = async (data: any) => {
    try {
      // Create new node
      const { data: newNode, error: nodeError } = await supabase
        .from('tree_nodes')
        .insert([data])
        .single();

      if (nodeError) throw nodeError;

      // Create relationship
      const relationship = {
        node_id_1: userNode?.id,
        node_id_2: newNode.id,
        type: selectedRelationship,
      };

      const { error: relError } = await supabase
        .from('relationships')
        .insert([relationship]);

      if (relError) throw relError;

      // Refresh data
      await loadRelatedNodes(userNode?.id!);
      setShowAddRelativeModal(false);
      toast('Relative added successfully');
    } catch (error) {
      console.error('Error adding relative:', error);
      toast('Failed to add relative');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <TreeDeciduous className="h-4 w-4 animate-spin" />
          Loading family tree...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      </div>
    );
  }

  if (!treeLayout) return null;

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-sm border-b px-4 flex items-center justify-between z-10">
        <h1 className="text-lg font-semibold">Family Tree</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>
      {/* Tree container */}
      <div
        ref={containerRef}
        className="absolute inset-0 mt-16 flex items-center justify-center">
        <div
          className="relative"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: '50% 50%'
          }}
      >
        {/* Render nodes */}
        {treeLayout && Object.entries(treeLayout.nodes).map(([id, pos]) => {
          const node = allNodes.find(n => n.id === id) || userNode;
          if (!node) return null;

          return (
            <div
              key={id}
              className="absolute"
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px)`,
              }}
            >
              <UserNodeCard
                node={node}
                isCurrentUser={node.id === userNode?.id}
                style={{
                  transform: `translate(-50%, -50%)`,
                }}
              />
            </div>
          );
        })}

        {/* Render connections */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ transform: `scale(${zoom})` }}
        >
          {treeLayout.connections.map((conn, i) => {
            const startX = conn.from.x;
            const startY = conn.from.y;
            const endX = conn.to.x;
            const endY = conn.to.y;

            // Calculate control points for the curve
            const midY = (startY + endY) / 2;

            return (
              <path
                key={i}
                d={`M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`}
                stroke="currentColor"
                strokeOpacity={0.3}
                strokeWidth={1.5}
                fill="none"
                className="transition-all duration-200"
              />
            );
          })}
        </svg>
        </div>
      </div>

      {/* Add relative modal */}
      {showAddRelativeModal && (
        <AddRelativeModal
          onClose={() => setShowAddRelativeModal(false)}
          onSubmit={handleAddRelative}
          relationshipType={selectedRelationship}
        />
      )}

      {/* Controls */}
      <div className="fixed top-20 right-4 flex flex-col gap-4 z-20">
        {/* Zoom controls */}
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setZoom(prev => Math.min(prev + 0.1, 2))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Add relative buttons */}
        <div className="flex flex-col gap-2">
          <AddRelativeCard 
            onAdd={() => {
              setSelectedRelationship('parent');
              setShowAddRelativeModal(true);
            }}
            relationshipType="parent"
          />
          <AddRelativeCard 
            onAdd={() => {
              setSelectedRelationship('child');
              setShowAddRelativeModal(true);
            }}
            relationshipType="child"
          />
        </div>
      </div>
    </div>
  );
}