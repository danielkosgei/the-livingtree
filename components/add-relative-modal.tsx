'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserPlus, Copy, Check, Share2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useToast } from '@/components/ui/use-toast'

type RelationshipType = 
  | 'parent' | 'child' | 'sibling' | 'spouse'
  | 'uncle' | 'aunt' | 'cousin' | 'grandparent' 
  | 'grandchild' | 'in_law' | 'niece' | 'nephew'

export function AddRelativeModal() {
  const [open, setOpen] = useState(false)
  const [relationshipType, setRelationshipType] = useState<RelationshipType | ''>('')
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  async function generateInviteLink() {
    if (!relationshipType) {
      toast({
        title: "Please select a relationship",
        description: "You must specify how this person is related to you.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    
    try {
      const supabase = createClient()
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: "Authentication error",
          description: "You must be logged in to invite relatives.",
          variant: "destructive"
        })
        setIsLoading(false)
        return
      }
      
      // Get the user's node
      const { data: userNode } = await supabase
        .from('nodes')
        .select('id')
        .eq('user_id', user.id)
        .single()
        
      if (!userNode) {
        toast({
          title: "Profile not found",
          description: "Please create your profile first.",
          variant: "destructive"
        })
        setIsLoading(false)
        return
      }

      // Generate a unique invite code
      const inviteCode = Math.random().toString(36).substring(2, 10)
      
      // Store the invite in the database
      const { error } = await supabase
        .from('invites')
        .insert({
          invited_by: userNode.id,
          invite_code: inviteCode,
          status: 'pending',
          relationship_type: relationshipType
        })
        
      if (error) {
        throw error
      }
      
      // Build the invite URL
      const baseUrl = window.location.origin
      const link = `${baseUrl}/join?code=${inviteCode}&type=${relationshipType}&from=${userNode.id}`
      
      setInviteLink(link)
      
      toast({
        title: "Invite link generated!",
        description: "You can now share this link with your relative.",
      })
    } catch (error) {
      console.error('Error generating invite:', error)
      toast({
        title: "Failed to generate invite",
        description: "There was a problem creating the invitation link.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  function copyToClipboard() {
    if (!inviteLink) return
    
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      
      toast({
        title: "Copied to clipboard!",
        description: "The invite link has been copied to your clipboard.",
      })
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs flex items-center gap-1.5">
          <UserPlus className="h-4 w-4" />
          Add Relative
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a Family Member</DialogTitle>
          <DialogDescription>
            Create an invitation link to share with your relative.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="relationship">How are they related to you?</Label>
            <Select 
              value={relationshipType} 
              onValueChange={(value) => setRelationshipType(value as RelationshipType)}
            >
              <SelectTrigger id="relationship" className="w-full">
                <SelectValue placeholder="Select relationship type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Immediate Family</SelectLabel>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="sibling">Sibling</SelectItem>
                  <SelectItem value="spouse">Spouse / Partner</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Extended Family</SelectLabel>
                  <SelectItem value="grandparent">Grandparent</SelectItem>
                  <SelectItem value="grandchild">Grandchild</SelectItem>
                  <SelectItem value="aunt">Aunt</SelectItem>
                  <SelectItem value="uncle">Uncle</SelectItem>
                  <SelectItem value="cousin">Cousin</SelectItem>
                  <SelectItem value="niece">Niece</SelectItem>
                  <SelectItem value="nephew">Nephew</SelectItem>
                  <SelectItem value="in_law">In-law</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          
          {!inviteLink ? (
            <Button 
              onClick={generateInviteLink} 
              disabled={!relationshipType || isLoading}
              className="w-full"
            >
              {isLoading ? 'Generating...' : 'Generate Invite Link'}
            </Button>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="invite-link">Invite Link</Label>
              <div className="flex gap-2">
                <Input 
                  id="invite-link" 
                  value={inviteLink} 
                  readOnly 
                  className="flex-1"
                />
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={copyToClipboard}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                This link will allow your relative to join your family tree.
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex sm:justify-between">
          {inviteLink && (
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setInviteLink('')
                  setRelationshipType('')
                }}
              >
                Reset
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Share functionality for mobile
                  if (navigator.share) {
                    navigator.share({
                      title: 'Join my family tree',
                      text: 'I\'ve invited you to join my family tree on LivingTree.',
                      url: inviteLink
                    })
                  } else {
                    copyToClipboard()
                  }
                }}
                className="flex items-center gap-1.5"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          )}
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 