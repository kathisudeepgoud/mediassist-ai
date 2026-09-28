import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border',
  {
    variants: {
      variant: {
        default: 'bg-teal-50 text-teal-700 border-teal-200',
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        success: 'bg-teal-50 text-teal-700 border-teal-200',
        warning: 'bg-amber-100 text-amber-600 border-amber-100/60',
        danger: 'bg-rose-100 text-rose-500 border-rose-100',
        outline: 'bg-white text-ink-soft border-mist-200',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
