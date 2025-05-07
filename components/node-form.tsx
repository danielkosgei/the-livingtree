'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { createOrUpdateNode, NodeFormData } from '@/app/actions/node'
import { Loader2, TreeDeciduous, HomeIcon } from 'lucide-react'

type NodeFormProps = {
  initialData?: NodeFormData
}

export function NodeForm({ initialData }: NodeFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPersonalNode, setIsPersonalNode] = useState(!initialData)
  const [success, setSuccess] = useState(false)
  
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(event.currentTarget)
    
    // Remove death_date for personal nodes
    if (isPersonalNode) {
      formData.delete('death_date')
    }
    
    const data: NodeFormData = {
      full_name: formData.get('full_name') as string,
      birth_date: formData.get('birth_date') as string || undefined,
      death_date: formData.get('death_date') as string || undefined,
      privacy: formData.get('privacy') as NodeFormData['privacy'],
      redaction: 'none' // Default value, will be configured elsewhere
    }

    try {
      await createOrUpdateNode(data)
      setSuccess(true)
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TreeDeciduous className="h-6 w-6 text-primary" />
          <CardTitle className="text-2xl">{initialData ? 'Update Your Profile' : 'Create Your Profile'}</CardTitle>
        </div>
        <CardDescription>
          {isPersonalNode 
            ? 'Enter your details to create your personal profile in the family tree.' 
            : 'Update your profile information.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="profile-form" onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              name="full_name"
              placeholder="Enter your full name"
              required
              defaultValue={initialData?.full_name}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="birth_date">Birth Date</Label>
            <Input
              id="birth_date"
              name="birth_date"
              type="date"
              defaultValue={initialData?.birth_date}
              className="w-full"
            />
          </div>

          {!isPersonalNode && (
            <div className="space-y-2">
              <Label htmlFor="death_date">Death Date</Label>
              <Input
                id="death_date"
                name="death_date"
                type="date"
                defaultValue={initialData?.death_date}
                className="w-full"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="privacy">Privacy Level</Label>
            <Select name="privacy" defaultValue={initialData?.privacy || 'cluster_only'}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select privacy level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="cluster_only">Cluster Only</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Controls who can see your profile information in the family tree.
            </p>
          </div>

          {isPersonalNode && (
            <div className="bg-muted p-4 rounded-md text-sm text-muted-foreground">
              <p className="font-medium mb-1">This is your personal profile</p>
              <p>After completing your profile, you'll be taken to the family tree where you can add family members and explore your connections.</p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 text-green-800 p-3 rounded-md flex items-center gap-2">
              <div className="flex-1">
                Profile saved successfully! Redirecting to your family tree...
              </div>
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
        </form>
      </CardContent>
      <CardFooter className="flex justify-end gap-3 border-t pt-6">
        {initialData && (
          <Button variant="outline" type="button" onClick={() => router.push('/')} className="flex items-center gap-2">
            <HomeIcon className="h-4 w-4" />
            Go to Tree
          </Button>
        )}
        <Button form="profile-form" type="submit" disabled={isLoading || success} className="min-w-28">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : success ? (
            'Saved!'
          ) : (
            initialData ? 'Update Profile' : 'Create Profile'
          )}
        </Button>
      </CardFooter>
    </Card>
  )
} 