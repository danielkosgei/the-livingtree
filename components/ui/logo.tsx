'use client'

import { TreeDeciduous } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface LogoProps {
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
  asLink?: boolean
}

export function Logo({ 
  className, 
  showText = true, 
  size = 'md',
  asLink = true 
}: LogoProps) {
  const sizes = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  }

  const content = (
    <div className={cn(
      "flex items-center gap-2 text-primary transition-colors hover:opacity-90",
      className
    )}>
      <div className="relative">
        <TreeDeciduous className={cn(
          "relative z-10",
          sizes[size]
        )} />
        <div className="absolute inset-0 animate-pulse-slow blur-sm opacity-50">
          <TreeDeciduous className={sizes[size]} />
        </div>
      </div>
      {showText && (
        <span className={cn(
          "font-semibold tracking-tight",
          textSizes[size]
        )}>
          LivingTree
        </span>
      )}
    </div>
  )

  if (asLink) {
    return (
      <Link href="/" className="hover:no-underline">
        {content}
      </Link>
    )
  }

  return content
} 