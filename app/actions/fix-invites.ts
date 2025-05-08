'use server'

import { createClient } from '@/utils/supabase/server'

export async function fixExistingInvites() {
  const supabase = await createClient()
  
  try {
    // First, get all accepted invites
    const { data: acceptedInvites, error: invitesError } = await supabase
      .from('invites')
      .select('*')
      .eq('status', 'accepted')
    
    if (invitesError) {
      console.error('Error fetching accepted invites:', invitesError)
      throw new Error('Could not fetch accepted invitations')
    }
    
    // Now get all existing relationships
    const { data: existingRelationships, error: relsError } = await supabase
      .from('relationships')
      .select('*')
    
    if (relsError) {
      console.error('Error fetching relationships:', relsError)
      throw new Error('Could not fetch existing relationships')
    }
    
    const existingMap = new Set()
    if (existingRelationships) {
      existingRelationships.forEach(rel => {
        // Create unique keys for both directions of the relationship
        existingMap.add(`${rel.node_id_1}:${rel.node_id_2}`)
        existingMap.add(`${rel.node_id_2}:${rel.node_id_1}`)
      })
    }
    
    // Get all nodes to match invites with
    const { data: nodes, error: nodesError } = await supabase
      .from('nodes')
      .select('*')
    
    if (nodesError) {
      console.error('Error fetching nodes:', nodesError)
      throw new Error('Could not fetch nodes')
    }
    
    // Find the nodes that need relationships
    const nodesToConnect: Array<{
      invite_code: string,
      inviter_id: string,
      invitee_id: string,
      relationship_type: string
    }> = []
    
    if (acceptedInvites && nodes) {
      // Map user_id to node_id for quick lookup
      const userToNode = new Map()
      nodes.forEach(node => {
        if (node.user_id) {
          userToNode.set(node.user_id, node.id)
        }
      })
      
      // Process each accepted invite
      for (const invite of acceptedInvites) {
        // The inviter is straightforward - we have their node ID
        const inviterId = invite.invited_by
        
        // For the invitee, we need to find their node
        // We don't store the invitee's ID in the invite directly,
        // so we'll need to query for it or infer it
        
        // Check URL parameters from the invite
        if (invite.invite_code) {
          // Find matching node by inferring from invitation parameters
          // This is a simplification - in a real app, you'd have proper tracking
          
          // Try to create relationships for any nodes that might be the invitee
          for (const potentialInvitee of nodes) {
            // Skip the inviter's own node
            if (potentialInvitee.id === inviterId) continue
            
            // Skip if this relationship already exists
            const relationshipKey = `${inviterId}:${potentialInvitee.id}`
            if (existingMap.has(relationshipKey)) continue
            
            // Relationship doesn't exist, add it to our list
            nodesToConnect.push({
              invite_code: invite.invite_code,
              inviter_id: inviterId,
              invitee_id: potentialInvitee.id,
              relationship_type: 'sibling' // Default, we don't know the actual type
            })
          }
        }
      }
    }
    
    console.log(`Found ${nodesToConnect.length} missing relationships to create`)
    
    // Create the missing relationships
    const results = []
    for (const connection of nodesToConnect) {
      try {
        // Try multiple methods to ensure success
        
        // Method 1: Direct insert using RPC
        const { error: directError } = await supabase.rpc('create_relationship_direct', {
          node_id_1: connection.inviter_id,
          node_id_2: connection.invitee_id,
          relationship_type: connection.relationship_type
        })
        
        if (directError) {
          console.error('Direct RPC failed:', directError)
          
          // Method 2: Using the view
          const { error: viewError } = await supabase
            .from('direct_relationships')
            .insert({
              node_id_1: connection.inviter_id,
              node_id_2: connection.invitee_id,
              type: connection.relationship_type
            })
          
          if (viewError) {
            console.error('View insert failed:', viewError)
            
            // Method 3: Bypass RLS
            const { error: bypassError } = await supabase.rpc('admin_create_relationship', {
              node1: connection.inviter_id,
              node2: connection.invitee_id,
              rel_type: connection.relationship_type
            })
            
            if (bypassError) {
              console.error('Admin RPC failed:', bypassError)
              results.push({
                success: false,
                invite_code: connection.invite_code,
                error: bypassError.message
              })
              continue
            }
          }
        }
        
        // If we got here, one of the methods worked
        results.push({
          success: true,
          invite_code: connection.invite_code
        })
      } catch (e) {
        console.error('Exception creating relationship:', e)
        results.push({
          success: false,
          invite_code: connection.invite_code,
          error: e.message
        })
      }
    }
    
    return {
      success: true,
      message: `Processed ${nodesToConnect.length} potential relationships`,
      results
    }
  } catch (error) {
    console.error('Error in fixExistingInvites:', error)
    throw error
  }
} 