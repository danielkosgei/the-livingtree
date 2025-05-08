import { createClient } from '@supabase/supabase-js'

// This is a special function for direct SQL execution - use with caution
export async function executeAdminSQL(sql: string) {
  // Check for Supabase service role key
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Service role key not found')
  }
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  try {
    // Execute the SQL directly using the service role
    const { data, error } = await supabase.rpc('pg_direct_execute', { sql })
    
    if (error) {
      console.error('SQL execution error:', error)
      throw new Error(`SQL execution failed: ${error.message}`)
    }
    
    return { success: true, data }
  } catch (error) {
    console.error('SQL execution exception:', error)
    throw error
  }
} 