import * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({ icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-mist-200 bg-mist-50 px-6 py-14 text-center animate-rise', className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">{icon}</div>
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      <p className="max-w-sm text-sm text-ink-soft">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-1">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
