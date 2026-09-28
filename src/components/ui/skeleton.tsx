import { cn } from '@/utils/cn'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-mist-200/70', className)}
      {...props}
    />
  )
}

export { Skeleton }
