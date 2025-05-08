'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { disableRelationshipsRLS } from '@/app/actions/fix-permissions'

export default function AdminPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  
  async function handleFixRelationships() {
    setLoading(true)
    setResult(null)
    
    try {
      const result = await disableRelationshipsRLS()
      setResult({ success: true, message: 'Successfully fixed relationship permissions' })
    } catch (error) {
      setResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="container max-w-md py-8">
      <Card>
        <CardHeader>
          <CardTitle>Database Administration</CardTitle>
          <CardDescription>
            Apply fixes to the database configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Fix Relationships Permissions</h3>
            <p className="text-sm text-muted-foreground mb-3">
              This will disable RLS on the relationships table to allow creation of relationships.
            </p>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-md text-amber-800 text-sm mb-4">
              <p><strong>Note:</strong> This is a temporary solution for this prototype. 
              In a production environment, you should implement proper RLS policies instead.</p>
            </div>
            <Button 
              onClick={handleFixRelationships} 
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Applying...' : 'Apply Fix'}
            </Button>
          </div>
          
          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'} className="mt-4">
              <AlertTitle>
                {result.success ? 'Success' : 'Error'}
              </AlertTitle>
              <AlertDescription>
                {result.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 