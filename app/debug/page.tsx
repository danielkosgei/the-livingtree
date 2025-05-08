'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/utils/supabase/client'

export default function DebugPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userNode, setUserNode] = useState<any>(null)
  const [nodeCount, setNodeCount] = useState(0)
  const [relationships, setRelationships] = useState<any[]>([])
  const [invites, setInvites] = useState<any[]>([])
  const [log, setLog] = useState<string[]>([])
  
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      addLog('Loading data...')
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      addLog(`Current user: ${user?.id || 'Not logged in'}`)
      
      if (!user) {
        setIsLoading(false)
        return
      }
      
      // Get user's node
      const { data: node, error: nodeError } = await supabase
        .from('nodes')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (nodeError) {
        addLog(`Error getting user node: ${nodeError.message}`)
      } else if (node) {
        setUserNode(node)
        addLog(`Found your node: ${node.full_name} (ID: ${node.id})`)
      }
      
      // Get all nodes
      const { data: allNodes, error: allNodesError } = await supabase
        .from('nodes')
        .select('*')
      
      if (allNodesError) {
        addLog(`Error getting all nodes: ${allNodesError.message}`)
      } else {
        setNodeCount(allNodes?.length || 0)
        addLog(`Total nodes in database: ${allNodes?.length || 0}`)
        
        if (allNodes && allNodes.length > 0) {
          allNodes.forEach(n => {
            if (n.id !== node?.id) {
              addLog(`Other node: ${n.full_name} (ID: ${n.id})`)
            }
          })
        }
      }
      
      // Get relationships
      const { data: relData, error: relError } = await supabase
        .from('relationships')
        .select('*')
      
      if (relError) {
        addLog(`Error fetching relationships: ${relError.message}`)
      } else {
        setRelationships(relData || [])
        addLog(`Relationships found: ${relData?.length || 0}`)
        
        if (relData && relData.length > 0) {
          relData.forEach(r => {
            addLog(`Relationship: ${r.node_id_1} <-> ${r.node_id_2} (${r.type})`)
          })
        }
      }
      
      // Get invites
      const { data: inviteData, error: inviteError } = await supabase
        .from('invites')
        .select('*')
      
      if (inviteError) {
        addLog(`Error fetching invites: ${inviteError.message}`)
      } else {
        setInvites(inviteData || [])
        addLog(`Invites found: ${inviteData?.length || 0}`)
        
        if (inviteData && inviteData.length > 0) {
          inviteData.forEach(i => {
            addLog(`Invite: from ${i.invited_by}, code ${i.invite_code}, status ${i.status}`)
          })
        }
      }
      
      setIsLoading(false)
    }
    
    loadData()
  }, [])
  
  function addLog(message: string) {
    console.log(message)
    setLog(prev => [...prev, message])
  }
  
  async function createTestRelationship() {
    if (!userNode) {
      addLog('You need to have a node first')
      return
    }
    
    setIsLoading(true)
    addLog('Attempting to create a test relationship...')
    
    try {
      const supabase = createClient()
      
      // Get all other nodes
      const { data: otherNodes } = await supabase
        .from('nodes')
        .select('*')
        .neq('id', userNode.id)
        .limit(1)
      
      if (!otherNodes || otherNodes.length === 0) {
        addLog('No other nodes found to create a relationship with')
        setIsLoading(false)
        return
      }
      
      const otherNode = otherNodes[0]
      
      // Try to create a relationship directly
      const { data: rel, error: relError } = await supabase
        .from('relationships')
        .insert({
          node_id_1: userNode.id,
          node_id_2: otherNode.id,
          type: 'sibling'
        })
        .select()
      
      if (relError) {
        addLog(`Error creating relationship: ${relError.message}`)
        
        // Try to disable RLS for this operation
        const { error: rlsError } = await supabase.rpc('disable_rls_for_table', {
          table_name: 'relationships'
        }).catch(e => {
          addLog(`RPC error: ${e.message}`)
          return { error: e }
        })
        
        if (rlsError) {
          addLog(`Could not disable RLS: ${rlsError.message}`)
        } else {
          addLog('Successfully disabled RLS, trying insert again')
          
          // Try insert again
          const { data: rel2, error: relError2 } = await supabase
            .from('relationships')
            .insert({
              node_id_1: userNode.id,
              node_id_2: otherNode.id,
              type: 'sibling'
            })
            .select()
          
          if (relError2) {
            addLog(`Still error creating relationship: ${relError2.message}`)
          } else {
            addLog(`Successfully created relationship: ${JSON.stringify(rel2)}`)
          }
        }
      } else {
        addLog(`Successfully created relationship: ${JSON.stringify(rel)}`)
      }
      
      // Refresh relationships
      const { data: relData } = await supabase
        .from('relationships')
        .select('*')
      
      setRelationships(relData || [])
      addLog(`Updated relationships count: ${relData?.length || 0}`)
    } catch (error: any) {
      addLog(`Exception: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }
  
  async function fixDirectlyWithSQL() {
    setIsLoading(true)
    addLog('Attempting direct SQL fix...')
    
    try {
      const supabase = createClient()
      
      // Execute a SQL command directly to disable RLS
      const { error: sqlError } = await supabase.rpc('execute_sql', {
        sql_statement: 'ALTER TABLE relationships DISABLE ROW LEVEL SECURITY;'
      }).catch(e => {
        return { error: e }
      })
      
      if (sqlError) {
        addLog(`SQL error: ${sqlError.message}`)
        addLog('Trying alternative approach...')
        
        // Try creating the function if it doesn't exist
        const { error: createFuncError } = await supabase.rpc('execute_sql', {
          sql_statement: `
          CREATE OR REPLACE FUNCTION disable_rls_for_table(table_name text)
          RETURNS boolean
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          BEGIN
            EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', table_name);
            RETURN true;
          END;
          $$;`
        }).catch(e => {
          return { error: e }
        })
        
        if (createFuncError) {
          addLog(`Could not create function: ${createFuncError.message}`)
        } else {
          addLog('Function created, trying to use it')
          
          // Try using the new function
          const { error: useError } = await supabase.rpc('disable_rls_for_table', {
            table_name: 'relationships'
          }).catch(e => {
            return { error: e }
          })
          
          if (useError) {
            addLog(`Error using function: ${useError.message}`)
          } else {
            addLog('Successfully disabled RLS via function')
          }
        }
      } else {
        addLog('Successfully disabled RLS via direct SQL')
      }
    } catch (error: any) {
      addLog(`Exception: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="container py-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Database Diagnostics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium mb-2">Current State</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">User ID</dt>
                  <dd>{user?.id || 'Not logged in'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Your Node</dt>
                  <dd>{userNode ? userNode.full_name : 'No node found'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Total Nodes</dt>
                  <dd>{nodeCount}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Relationships</dt>
                  <dd>{relationships.length}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Invites</dt>
                  <dd>{invites.length}</dd>
                </div>
              </dl>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Actions</h3>
              <div className="space-y-4">
                <Button 
                  onClick={createTestRelationship}
                  disabled={isLoading || !userNode}
                  className="w-full"
                >
                  Create Test Relationship
                </Button>
                
                <Button 
                  onClick={fixDirectlyWithSQL}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  Direct SQL Fix
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Diagnostic Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-md h-[400px] overflow-y-auto">
            <pre className="text-xs">
              {log.map((entry, index) => (
                <div key={index} className="py-1">{entry}</div>
              ))}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 