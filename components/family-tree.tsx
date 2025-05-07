'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TreeDeciduous, Plus, UserPlus, User } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

type TreeNode = {
  id: string
  user_id: string
  full_name: string
  birth_date: string | null
  death_date: string | null
  privacy: string
  redaction: string
}

export function FamilyTree() {
  const [userNode, setUserNode] = useState<TreeNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [relatives, setRelatives] = useState<TreeNode[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadUserNode() {
      setLoading(true)
      const supabase = createClient()
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Get the user's node
      const { data: node, error } = await supabase
        .from('nodes')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error loading node:', error)
        setError('Failed to load your family tree')
        setLoading(false)
        return
      }

      setUserNode(node)

      // Get any relatives (TODO: implement proper relationships)
      const { data: relativeNodes, error: relativesError } = await supabase
        .from('nodes')
        .select('*')
        .neq('user_id', user.id)
        .limit(5)

      if (!relativesError && relativeNodes) {
        setRelatives(relativeNodes)
      }

      setLoading(false)
    }

    loadUserNode()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <TreeDeciduous className="h-12 w-12 text-primary/30 animate-pulse mb-4" />
        <p className="text-muted-foreground">Loading your family tree...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
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
      <div className="flex flex-col items-center justify-center min-h-[400px] max-w-md mx-auto text-center">
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

  return (
    <div className="family-tree-container">
      <div className="flex flex-col items-center mb-8">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <TreeDeciduous className="h-6 w-6 text-primary" />
          Your Family Tree
        </h2>
        <p className="text-muted-foreground text-center max-w-md">
          View and manage your family connections. Add relatives to grow your tree.
        </p>
      </div>

      <div className="relative tree-visualization p-8 bg-gradient-to-b from-primary/5 to-background rounded-xl mb-8">
        {/* User's node at the center */}
        <div className="flex justify-center mb-12">
          <UserNodeCard node={userNode} isCurrentUser={true} />
        </div>

        {/* Relatives */}
        {relatives.length > 0 ? (
          <div className="relative">
            <div className="w-[1px] h-8 bg-border absolute top-[-3rem] left-1/2 transform -translate-x-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 place-items-center relative">
              {relatives.map((relative) => (
                <div key={relative.id} className="relative">
                  <div className="connection-line"></div>
                  <UserNodeCard node={relative} isCurrentUser={false} />
                </div>
              ))}
              <AddRelativeCard />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-[1px] h-8 bg-border mb-4"></div>
            <AddRelativeCard />
          </div>
        )}
      </div>

      <style jsx>{`
        .connection-line {
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          width: 1px;
          height: 20px;
          background-color: var(--border);
        }
      `}</style>
    </div>
  )
}

function UserNodeCard({ node, isCurrentUser }: { node: TreeNode, isCurrentUser: boolean }) {
  return (
    <Card className={`w-48 shadow-md ${isCurrentUser ? 'border-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${isCurrentUser ? 'bg-primary/10' : 'bg-muted'}`}>
            <User className={`h-8 w-8 ${isCurrentUser ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <h3 className="font-medium text-sm truncate w-full">{node.full_name}</h3>
          {node.birth_date && (
            <p className="text-xs text-muted-foreground">
              b. {new Date(node.birth_date).getFullYear()}
              {node.death_date && ` - d. ${new Date(node.death_date).getFullYear()}`}
            </p>
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
    <Card className="w-48 h-[138px] border-dashed shadow-none bg-transparent flex items-center justify-center">
      <CardContent className="p-4 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
          <UserPlus className="h-6 w-6 text-muted-foreground" />
        </div>
        <Button variant="ghost" size="sm" className="text-xs">
          Add Relative
        </Button>
      </CardContent>
    </Card>
  )
} 