'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/utils/supabase/client'
import { TreeDeciduous, UserPlus, ArrowRight } from 'lucide-react'

export default function JoinPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [inviterName, setInviterName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const fromNodeId = searchParams.get('from')
  
  useEffect(() => {
    async function validateInvite() {
      setLoading(true)
      
      if (!code || !type || !fromNodeId) {
        setError('Invalid invitation link. Please ask for a new link.')
        setLoading(false)
        return
      }
      
      const supabase = createClient()
      
      // Check if invite exists
      const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .select('*')
        .eq('invite_code', code)
        .eq('status', 'pending')
        .single()
        
      if (inviteError || !invite) {
        setError('This invitation is invalid or has already been used.')
        setLoading(false)
        return
      }
      
      // Get inviter's name
      const { data: inviterNode, error: inviterError } = await supabase
        .from('nodes')
        .select('full_name')
        .eq('id', fromNodeId)
        .single()
        
      if (!inviterError && inviterNode) {
        setInviterName(inviterNode.full_name)
      }
      
      setLoading(false)
    }
    
    validateInvite()
  }, [code, type, fromNodeId])
  
  function formatRelationship(type: string | null) {
    if (!type) return 'relative'
    
    const relationshipLabels: Record<string, string> = {
      parent: 'parent',
      child: 'child',
      sibling: 'sibling',
      spouse: 'spouse or partner',
      uncle: 'uncle',
      aunt: 'aunt',
      cousin: 'cousin',
      grandparent: 'grandparent',
      grandchild: 'grandchild',
      in_law: 'in-law',
      niece: 'niece',
      nephew: 'nephew'
    }
    
    return relationshipLabels[type] || 'relative'
  }
  
  async function handleAcceptInvite() {
    if (!code) return
    
    setLoading(true)
    
    try {
      const supabase = createClient()
      
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // User is already logged in - redirect to profile creation
        router.push(`/profile?invited=true&code=${code}&type=${type}&from=${fromNodeId}`)
      } else {
        // User needs to login/signup first
        router.push(`/login?invited=true&code=${code}&type=${type}&from=${fromNodeId}`)
      }
    } catch (err) {
      console.error('Error accepting invite:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className="container max-w-md py-10">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <TreeDeciduous className="h-12 w-12 text-primary/30 animate-pulse mb-4" />
          <p className="text-muted-foreground">Validating invitation...</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="container max-w-md py-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center text-center">
              <TreeDeciduous className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-destructive">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="container max-w-md py-10">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl">You've Been Invited</CardTitle>
          <CardDescription>
            {inviterName} has invited you to join their family tree as their {formatRelationship(type)}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p>
              By accepting this invitation, you'll be connected with {inviterName} and able to 
              create your profile in the family tree.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button 
            className="w-full flex items-center gap-2" 
            size="lg"
            onClick={handleAcceptInvite}
            disabled={loading}
          >
            Accept Invitation
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 