'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TreeDeciduous, Plus, UserPlus, User, AlertCircle, Settings, Download, Share2, ZoomIn, ZoomOut } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { AddRelativeModal } from '@/components/add-relative-modal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type TreeNode = {
  id: string
  user_id: string
  full_name: string
  birth_date: string | null
  death_date: string | null
  privacy: string
  redaction: string
}

type Relationship = {
  id: string
  node_id_1: string
  node_id_2: string
  type: string
}

export function FamilyTree() {
  const [userNode, setUserNode] = useState<TreeNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [allNodes, setAllNodes] = useState<TreeNode[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    async function loadTreeData() {
      setLoading(true)
      const supabase = createClient()
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Get the user's node
      const { data: userNodeData, error: nodeError } = await supabase
        .from('nodes')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (nodeError) {
        console.error('Error loading node:', nodeError)
        setError('Failed to load your family tree')
        setLoading(false)
        return
      }

      if (!userNodeData) {
        setLoading(false)
        return
      }
      
      setUserNode(userNodeData)

      // Get ALL nodes
      const { data: nodeData, error: nodesError } = await supabase
        .from('nodes')
        .select('*')
      
      if (nodesError) {
        console.error('Error loading all nodes:', nodesError)
        setError('Failed to load the family tree')
        setLoading(false)
        return
      }

      if (nodeData) {
        const otherNodes = nodeData.filter(n => n.id !== userNodeData.id);
        setAllNodes(otherNodes);
      }

      // Get all relationships involving the user's node
      const { data: relationshipData, error: relationshipsError } = await supabase
        .from('relationships')
        .select('*')
        .or(`node_id_1.eq.${userNodeData.id},node_id_2.eq.${userNodeData.id}`)
      
      if (relationshipsError) {
        console.error('Error loading relationships:', relationshipsError)
        setDebugInfo('Issue with relationships: ' + JSON.stringify(relationshipsError))
      } else {
        if (relationshipData && relationshipData.length > 0) {
          setRelationships(relationshipData)
        } else {
          setDebugInfo('No relationships found. You may need to connect with relatives.')
        }
      }

      setLoading(false)
    }

    loadTreeData()
  }, [])

  // Helper function to find relationship type between current user and another node
  const getRelationshipType = (nodeId: string): string | null => {
    // Check relationships where user is node_id_1
    const relationship1 = relationships.find(r => r.node_id_1 === userNode?.id && r.node_id_2 === nodeId);
    if (relationship1) return relationship1.type;
    
    // Check relationships where user is node_id_2
    const relationship2 = relationships.find(r => r.node_id_2 === userNode?.id && r.node_id_1 === nodeId);
    if (relationship2) {
      // Invert the relationship type if needed
      if (relationship2.type === 'parent') return 'child';
      if (relationship2.type === 'child') return 'parent';
      if (relationship2.type === 'grandparent') return 'grandchild';
      if (relationship2.type === 'grandchild') return 'grandparent';
      if (relationship2.type === 'aunt' || relationship2.type === 'uncle') return 'niece/nephew';
      if (relationship2.type === 'niece' || relationship2.type === 'nephew') return 'aunt/uncle';
      // Other relationships stay the same (sibling, spouse, cousin, in_law)
      return relationship2.type;
    }
    
    return null;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <TreeDeciduous className="h-12 w-12 text-primary/30 animate-pulse mb-4" />
        <p className="text-muted-foreground">Loading your family tree...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md max-w-md text-center">
          <p className="font-semibold mb-2">Something went wrong</p>
          <p>{error}</p>
          <Button variant="outline" asChild className="mt-4">
            <Link href="/profile">Create Your Profile</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!userNode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen max-w-md mx-auto text-center">
        <TreeDeciduous className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Start Your Family Tree</h2>
        <p className="text-muted-foreground mb-6">
          You haven't created your profile yet. Create your profile to start building your family tree.
        </p>
        <Button asChild>
          <Link href="/profile">Create Your Profile</Link>
        </Button>
      </div>
    )
  }

  // Create related nodes array with relationships
  const relatedNodes = allNodes.map(node => {
    const relationshipType = getRelationshipType(node.id);
    return {
      ...node,
      relationship: relationshipType
    };
  }).filter(node => node.relationship !== null);

  // Group nodes by relationship type
  const groupedNodes = relatedNodes.reduce((groups, node) => {
    const relationship = node.relationship || 'other';
    if (!groups[relationship]) {
      groups[relationship] = [];
    }
    groups[relationship].push(node);
    return groups;
  }, {} as Record<string, any[]>);

  // Debug: count relationships for debugging
  const relatedCount = relatedNodes.length;
  const totalNodes = allNodes.length;

  return (
    <div className="family-tree-container min-h-screen relative">
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <TreeDeciduous className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Your Family Tree</h2>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                className="h-8 w-8"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom(z => Math.min(2, z + 0.1))}
                className="h-8 w-8"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Tree Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Download className="mr-2 h-4 w-4" />
                  Export Tree
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Tree
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Button variant="ghost" size="sm" asChild className="w-full justify-start">
                    <Link href="/profile">Edit Your Profile</Link>
                  </Button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Tree Content */}
      <div className="pt-14 min-h-screen bg-gradient-to-b from-primary/5 to-background">
        <div className="relative p-8" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
          {debugInfo && (
            <div className="fixed top-20 left-4 right-4 md:left-auto md:right-4 md:w-80 p-4 bg-amber-50 border border-amber-200 rounded-md shadow-lg z-40">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800">{debugInfo}</p>
                  <p className="text-xs text-amber-600 mt-1">Nodes count: {totalNodes}, Related: {relatedCount}</p>
                </div>
              </div>
            </div>
          )}

          {/* User's node at the center */}
          <div className="flex justify-center mb-16">
            <UserNodeCard node={userNode} isCurrentUser={true} />
          </div>

          {/* Family tree connections */}
          {relatedNodes.length > 0 ? (
            <div className="tree-connections">
              {/* Parents section */}
              {groupedNodes['parent'] && groupedNodes['parent'].length > 0 && (
                <div className="relative mb-20">
                  <div className="relationship-label">Parents</div>
                  <div className="w-[1px] h-16 bg-primary/30 absolute top-[-4rem] left-1/2 transform -translate-x-1/2"></div>
                  <div className="tree-branch">
                    <div className="horizontal-line"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
                      {groupedNodes['parent'].map((relative) => (
                        <div key={relative.id} className="relative">
                          <div className="vertical-line"></div>
                          <UserNodeCard node={relative} isCurrentUser={false} relationshipType="parent" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Siblings and Spouse sections side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
                {/* Siblings section */}
                {groupedNodes['sibling'] && groupedNodes['sibling'].length > 0 && (
                  <div className="relative">
                    <div className="relationship-label">Siblings</div>
                    <div className="tree-branch">
                      <div className="horizontal-line"></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {groupedNodes['sibling'].map((relative) => (
                          <div key={relative.id} className="relative">
                            <div className="vertical-line"></div>
                            <UserNodeCard node={relative} isCurrentUser={false} relationshipType="sibling" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Spouse section */}
                {groupedNodes['spouse'] && groupedNodes['spouse'].length > 0 && (
                  <div className="relative">
                    <div className="relationship-label">Spouse/Partner</div>
                    <div className="tree-branch spouse-branch">
                      <div className="horizontal-line"></div>
                      <div className="flex flex-wrap justify-center gap-6">
                        {groupedNodes['spouse'].map((relative) => (
                          <div key={relative.id} className="relative">
                            <div className="vertical-line"></div>
                            <UserNodeCard node={relative} isCurrentUser={false} relationshipType="spouse" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Children section */}
              {groupedNodes['child'] && groupedNodes['child'].length > 0 && (
                <div className="relative mb-20">
                  <div className="relationship-label">Children</div>
                  <div className="tree-branch">
                    <div className="horizontal-line"></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 justify-items-center">
                      {groupedNodes['child'].map((relative) => (
                        <div key={relative.id} className="relative">
                          <div className="vertical-line"></div>
                          <UserNodeCard node={relative} isCurrentUser={false} relationshipType="child" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Extended family grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Object.entries(groupedNodes)
                  .filter(([type]) => !['parent', 'child', 'sibling', 'spouse'].includes(type))
                  .map(([type, relatives]) => (
                    <div key={type} className="relative">
                      <div className="relationship-label capitalize">{type.replace('_', ' ')}s</div>
                      <div className="tree-branch">
                        <div className="horizontal-line"></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {relatives.map((relative) => (
                            <div key={relative.id} className="relative">
                              <div className="vertical-line"></div>
                              <UserNodeCard 
                                node={relative} 
                                isCurrentUser={false} 
                                relationshipType={type} 
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
              
              {/* Add relative option */}
              <div className="flex justify-center mt-12">
                <AddRelativeCard />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-[1px] h-8 bg-border mb-4"></div>
              <div className="text-center text-muted-foreground mb-4">
                <p>No connected family members found.</p>
                <p className="text-sm">Invite relatives to grow your tree!</p>
                {allNodes.length > 0 && (
                  <p className="text-xs mt-2 text-amber-600">
                    There are {allNodes.length} nodes in the database but no established relationships.
                  </p>
                )}
              </div>
              <AddRelativeCard />
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .tree-connections {
          position: relative;
        }
        
        .relationship-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--muted-foreground);
          text-align: center;
          margin-bottom: 1rem;
          letter-spacing: 0.025em;
        }
        
        .tree-branch {
          position: relative;
          padding-top: 24px;
          padding-bottom: 12px;
        }
        
        .horizontal-line {
          position: absolute;
          top: 0;
          left: 10%;
          right: 10%;
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            var(--primary) 20%,
            var(--primary) 80%,
            transparent 100%
          );
          opacity: 0.2;
        }
        
        .spouse-branch .horizontal-line {
          left: 20%;
          right: 20%;
        }
        
        .vertical-line {
          position: absolute;
          top: -24px;
          left: 50%;
          transform: translateX(-50%);
          width: 2px;
          height: 24px;
          background: linear-gradient(
            180deg,
            var(--primary) 0%,
            var(--primary) 90%,
            transparent 100%
          );
          opacity: 0.2;
        }

        @media (max-width: 768px) {
          .horizontal-line {
            left: 5%;
            right: 5%;
          }
          
          .spouse-branch .horizontal-line {
            left: 10%;
            right: 10%;
          }
        }
      `}</style>
    </div>
  )
}

function UserNodeCard({ 
  node, 
  isCurrentUser,
  relationshipType
}: { 
  node: TreeNode, 
  isCurrentUser: boolean,
  relationshipType?: string 
}) {
  return (
    <Card className={`w-48 transition-all duration-200 hover:shadow-lg ${
      isCurrentUser 
        ? 'border-primary shadow-md bg-primary/5' 
        : 'hover:border-primary/50'
    }`}>
      <CardContent className="p-4">
        <div className="flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-colors ${
            isCurrentUser ? 'bg-primary/20' : 'bg-muted hover:bg-primary/10'
          }`}>
            <User className={`h-8 w-8 ${
              isCurrentUser ? 'text-primary' : 'text-muted-foreground'
            }`} />
          </div>
          <h3 className="font-medium text-sm truncate w-full mb-1">{node.full_name}</h3>
          {node.birth_date && (
            <p className="text-xs text-muted-foreground mb-1">
              b. {new Date(node.birth_date).getFullYear()}
              {node.death_date && ` - d. ${new Date(node.death_date).getFullYear()}`}
            </p>
          )}
          {relationshipType && !isCurrentUser && (
            <span className="text-xs font-medium text-primary/70 capitalize">
              {relationshipType.replace('_', ' ')}
            </span>
          )}
          {isCurrentUser && (
            <Button variant="link" size="sm" className="mt-2 h-auto p-0" asChild>
              <Link href="/profile">Edit Profile</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function AddRelativeCard() {
  return (
    <Card className="w-48 h-[138px] border-dashed shadow-none bg-transparent hover:bg-primary/5 hover:border-primary/50 transition-all duration-200">
      <CardContent className="p-4 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3 group-hover:bg-primary/10">
          <UserPlus className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
        </div>
        <AddRelativeModal />
      </CardContent>
    </Card>
  )
} 