'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/utils/supabase/client'
import { createNodeRelationship } from '@/app/actions/create-relationship'

export default function FixTreePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [nodes, setNodes] = useState<any[]>([])
  const [selectedNode1, setSelectedNode1] = useState<string>('')
  const [selectedNode2, setSelectedNode2] = useState<string>('')
  const [relationType, setRelationType] = useState<string>('sibling')
  const [message, setMessage] = useState<string>('')
  
  useEffect(() => {
    loadNodes()
  }, [])
  
  async function loadNodes() {
    setIsLoading(true)
    const supabase = createClient()
    
    try {
      const { data: nodesData, error } = await supabase
        .from('nodes')
        .select('*')
      
      if (error) {
        setMessage(`Error loading nodes: ${error.message}`)
      } else {
        setNodes(nodesData || [])
        
        if (nodesData && nodesData.length > 0) {
          setSelectedNode1(nodesData[0].id)
          if (nodesData.length > 1) {
            setSelectedNode2(nodesData[1].id)
          }
        }
      }
    } catch (e: any) {
      setMessage(`Exception: ${e.message}`)
    } finally {
      setIsLoading(false)
    }
  }
  
  async function handleCreateRelationship() {
    if (!selectedNode1 || !selectedNode2 || selectedNode1 === selectedNode2) {
      setMessage('Please select two different nodes')
      return
    }
    
    setIsLoading(true)
    setMessage('Creating relationship...')
    
    try {
      const result = await createNodeRelationship(selectedNode1, selectedNode2, relationType)
      setMessage(`Relationship created successfully: ${selectedNode1} <-> ${selectedNode2} (${relationType})`)
      
      // Check if the relationship was created
      const supabase = createClient()
      const { data, error } = await supabase
        .from('relationships')
        .select('*')
      
      if (error) {
        setMessage(message + `\nError checking relationships: ${error.message}`)
      } else {
        setMessage(message + `\nTotal relationships: ${data?.length || 0}`)
      }
    } catch (e: any) {
      setMessage(`Error creating relationship: ${e.message}`)
    } finally {
      setIsLoading(false)
    }
  }
  
  async function testViewRelationships() {
    setIsLoading(true)
    setMessage('Testing relationship permissions...')
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('relationships')
        .select('*')
      
      if (error) {
        setMessage(`Error viewing relationships: ${error.message}`)
      } else {
        setMessage(`Successfully viewed relationships. Found ${data?.length || 0} relationships.`)
        if (data && data.length > 0) {
          setMessage(message + '\nRelationships: ' + JSON.stringify(data, null, 2))
        }
      }
    } catch (e: any) {
      setMessage(`Exception: ${e.message}`)
    } finally {
      setIsLoading(false)
    }
  }
  
  async function disableRls() {
    setIsLoading(true)
    setMessage('Attempting to disable RLS...')
    
    try {
      const supabase = createClient()
      const { error } = await supabase.rpc('disable_rls_for_table', {
        table_name: 'relationships'
      })
      
      if (error) {
        setMessage(`Error disabling RLS: ${error.message}`)
      } else {
        setMessage('Successfully disabled RLS on relationships table')
      }
    } catch (e: any) {
      setMessage(`Exception: ${e.message}`)
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="container py-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Fix Family Tree Relationships</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-muted-foreground">
            This tool will help you create relationships between nodes directly.
          </p>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Node 1</label>
                <select 
                  className="w-full p-2 border rounded"
                  value={selectedNode1}
                  onChange={e => setSelectedNode1(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="">Select a node</option>
                  {nodes.map(node => (
                    <option key={`node1-${node.id}`} value={node.id}>
                      {node.full_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Node 2</label>
                <select 
                  className="w-full p-2 border rounded"
                  value={selectedNode2}
                  onChange={e => setSelectedNode2(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="">Select a node</option>
                  {nodes.map(node => (
                    <option key={`node2-${node.id}`} value={node.id}>
                      {node.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Relationship Type</label>
              <select 
                className="w-full p-2 border rounded"
                value={relationType}
                onChange={e => setRelationType(e.target.value)}
                disabled={isLoading}
              >
                <option value="sibling">Sibling</option>
                <option value="parent">Parent</option>
                <option value="child">Child</option>
                <option value="spouse">Spouse</option>
                <option value="cousin">Cousin</option>
                <option value="grandparent">Grandparent</option>
                <option value="grandchild">Grandchild</option>
                <option value="aunt">Aunt</option>
                <option value="uncle">Uncle</option>
                <option value="niece">Niece</option>
                <option value="nephew">Nephew</option>
                <option value="in_law">In-law</option>
              </select>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={handleCreateRelationship}
                disabled={isLoading || !selectedNode1 || !selectedNode2 || selectedNode1 === selectedNode2}
              >
                Create Relationship
              </Button>
              
              <Button 
                onClick={testViewRelationships}
                disabled={isLoading}
                variant="outline"
              >
                Test View Relationships
              </Button>
              
              <Button 
                onClick={disableRls}
                disabled={isLoading}
                variant="secondary"
              >
                Disable RLS
              </Button>
            </div>
          </div>
          
          {message && (
            <div className="mt-6 p-4 bg-muted rounded overflow-auto max-h-[300px]">
              <pre className="text-xs whitespace-pre-wrap">{message}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 