'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { UserPlus } from 'lucide-react'

interface AddRelativeCardProps {
  onAdd: () => void;
  relationshipType: string;
}

export function AddRelativeCard({ onAdd, relationshipType }: AddRelativeCardProps) {
  return (
    <Card className="border-dashed cursor-pointer hover:bg-accent/50 transition-colors" onClick={onAdd}>
      <CardContent className="p-4 flex items-center gap-2">
        <UserPlus className="h-4 w-4" />
        <span className="text-sm">Add {relationshipType}</span>
      </CardContent>
    </Card>
  )
}
