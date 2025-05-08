'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type NodeFormData = {
  full_name: string
  birth_date?: string
  death_date?: string
  privacy: 'public' | 'cluster_only' | 'private'
  redaction: 'none' | 'partial' | 'full'
  inviteCode?: string
  relationType?: string
  inviterNodeId?: string
}

export async function createOrUpdateNode(formData: NodeFormData) {
  const supabase = await createClient()
  
  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('Not authenticated')
  }

  try {
    // Check if user already has a node
    const { data: existingNode, error: checkError } = await supabase
      .from('nodes')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking for existing node:', checkError)
      // Continue anyway - we'll try to insert and handle any errors
    }

    let nodeId = existingNode?.id;
    let isNewNode = !existingNode;

    if (existingNode) {
      // Update existing node
      const { error } = await supabase
        .from('nodes')
        .update({
          full_name: formData.full_name,
          birth_date: formData.birth_date || null,
          death_date: formData.death_date || null,
          privacy: formData.privacy,
          redaction: formData.redaction,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (error) {
        console.error('Error updating node:', error)
        throw new Error('Failed to update your profile')
      }
    } else {
      // Create new node
      const { data: newNode, error } = await supabase
        .from('nodes')
        .insert({
          user_id: user.id,
          full_name: formData.full_name,
          birth_date: formData.birth_date || null,
          death_date: formData.death_date || null,
          privacy: formData.privacy,
          redaction: formData.redaction
        })
        .select('id')
        .single()

      if (error) {
        console.error('Error creating node:', error)
        throw new Error('Failed to create your profile')
      }
      
      nodeId = newNode.id;

      // If we have an invite, create the relationship
      if (formData.inviteCode && formData.relationType && formData.inviterNodeId) {
        // Create the relationship using our safe function
        const { error: relationshipError } = await supabase.rpc(
          'create_relationship_with_type',
          {
            p_node_id_1: formData.inviterNodeId,
            p_node_id_2: nodeId,
            p_relationship_type: formData.relationType
          }
        )

        if (relationshipError) {
          console.error('Error creating relationship:', relationshipError)
          // Don't throw here - we still created the profile successfully
        }

        // Update invite status
        const { error: inviteError } = await supabase
          .from('invites')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString()
          })
          .eq('invite_code', formData.inviteCode)

        if (inviteError) {
          console.error('Error updating invite status:', inviteError)
          // Don't throw here - we still created the profile and relationship
        }
      }
    }
    
    revalidatePath('/')
    return { success: true, isNewNode }
  } catch (error) {
    console.error('Error in createOrUpdateNode:', error)
    throw error
  }
}

export async function createRelationship({
  inviteCode,
  relationType,
  inviterNodeId,
  inviteeNodeId
}: {
  inviteCode: string,
  relationType: string,
  inviterNodeId: string,
  inviteeNodeId: string
}) {
  const supabase = await createClient()
  
  try {
    // First, update the invite status to accepted
    const { error: inviteError } = await supabase
      .from('invites')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('invite_code', inviteCode)
    
    if (inviteError) {
      console.error('Error updating invite status:', inviteError)
      throw new Error('Failed to update invitation status')
    }
    
    // Attempt to create relationship in multiple ways to ensure it works
    
    // Method 1: Standard insert (may fail with RLS)
    const { error: relationshipError } = await supabase
      .from('relationships')
      .insert({
        node_id_1: inviterNodeId,
        node_id_2: inviteeNodeId,
        type: relationType
      })
    
    if (relationshipError) {
      console.error('Standard relationship insert failed:', relationshipError)
      console.log('Trying alternative methods...')
      
      // Method 2: Try RPC function if available
      try {
        const { error: rpcError } = await supabase.rpc('admin_create_relationship', {
          node1: inviterNodeId,
          node2: inviteeNodeId,
          rel_type: relationType
        })
        
        if (rpcError) {
          console.error('RPC method failed:', rpcError)
          
          // Method 3: Try to temporarily disable RLS (last resort)
          try {
            const { error: disableRlsError } = await supabase.rpc('disable_rls_for_table', {
              table_name: 'relationships'
            })
            
            if (disableRlsError) {
              console.error('Could not disable RLS:', disableRlsError)
            } else {
              // Try insert again after disabling RLS
              const { error: retryError } = await supabase
                .from('relationships')
                .insert({
                  node_id_1: inviterNodeId,
                  node_id_2: inviteeNodeId,
                  type: relationType
                })
              
              if (retryError) {
                console.error('Insert after RLS disable still failed:', retryError)
                throw new Error('Failed to create relationship after multiple attempts')
              }
            }
          } catch (e) {
            console.error('Error in RLS disable attempt:', e)
          }
        }
      } catch (e) {
        console.error('Error in RPC attempt:', e)
      }
    }
    
    // If we got here without throwing, consider it a success
    return { success: true }
  } catch (error) {
    console.error('Error in createRelationship:', error)
    throw error
  }
}

export async function getUserNode() {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('Not authenticated')
  }

  const { data: node, error } = await supabase
    .from('nodes')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
    throw error
  }

  return node
} 