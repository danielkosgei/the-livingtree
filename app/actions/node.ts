'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type NodeFormData = {
  full_name: string
  birth_date?: string
  death_date?: string
  privacy: 'public' | 'cluster_only' | 'private'
  redaction: 'none' | 'partial' | 'full'
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
      const { error } = await supabase
        .from('nodes')
        .insert({
          user_id: user.id,
          full_name: formData.full_name,
          birth_date: formData.birth_date || null,
          death_date: formData.death_date || null,
          privacy: formData.privacy,
          redaction: formData.redaction
        })

      if (error) {
        console.error('Error creating node:', error)
        throw new Error('Failed to create your profile')
      }
    }
    
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Error in createOrUpdateNode:', error)
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