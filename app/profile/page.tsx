import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { NodeForm } from '@/components/node-form'
import { NodeFormData } from '@/app/actions/node'

export default async function ProfilePage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get node but silently handle errors
  let node = null
  
  try {
    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (!error) {
      node = data
    }
  } catch (e) {
    console.error('Error fetching node, continuing without node data')
  }

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="text-2xl font-bold mb-8">
        {node ? 'Update Your Profile' : 'Create Your Profile'}
      </h1>
      <NodeForm initialData={node || undefined} />
    </div>
  )
} 