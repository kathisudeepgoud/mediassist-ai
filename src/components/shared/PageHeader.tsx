import * as React from 'react'
import { ChevronRight } from 'lucide-react'

interface PageHeaderProps {
  crumbs: string[]
  title: string
  description?: string
  actions?: React.ReactNode
}

export function PageHeader({ crumbs, title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 animate-rise sm:flex-row sm:items-end sm:justify-between">
      <div>
        <nav aria-label="Breadcrumb" className="mb-1 flex items-center gap-1.5 text-xs text-ink-soft">
          {crumbs.map((c, i) => (
            <React.Fragment key={c}>
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              <span className={i === crumbs.length - 1 ? 'font-medium text-teal-700' : ''}>{c}</span>
            </React.Fragment>
          ))}
        </nav>
        <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
