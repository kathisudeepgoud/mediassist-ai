import React from 'react'
import type { ManualParameter } from '@/types/manualEntry'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Edit2, Trash2, Activity, CheckCircle2, AlertTriangle } from 'lucide-react'

interface ManualParameterCardProps {
  item: ManualParameter
  onEdit: (item: ManualParameter) => void
  onDelete: (id: string) => void
}

export const ManualParameterCard: React.FC<ManualParameterCardProps> = ({
  item,
  onEdit,
  onDelete,
}) => {
  // Helper to determine status color indicator if value & reference exist
  const getStatusBadge = () => {
    if (!item.reference) return null

    const valNum = parseFloat(item.value)
    const refMatch = item.reference.match(/([\d.]+)\s*[-–:]\s*([\d.]+)/)

    if (!isNaN(valNum) && refMatch) {
      const min = parseFloat(refMatch[1])
      const max = parseFloat(refMatch[2])
      if (valNum < min) {
        return (
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 gap-1 text-[11px]">
            <AlertTriangle className="h-3 w-3" /> Low
          </Badge>
        )
      }
      if (valNum > max) {
        return (
          <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 gap-1 text-[11px]">
            <AlertTriangle className="h-3 w-3" /> High
          </Badge>
        )
      }
      return (
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 gap-1 text-[11px]">
          <CheckCircle2 className="h-3 w-3" /> Normal
        </Badge>
      )
    }

    return null
  }

  return (
    <Card className="group relative overflow-hidden border border-mist-200 bg-white p-4 transition-all duration-200 hover:border-teal-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 transition-colors group-hover:bg-teal-600 group-hover:text-white">
            <Activity className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h4 className="truncate text-sm font-bold text-ink">{item.parameter}</h4>
            <div className="mt-0.5 flex items-center gap-1.5">
              {getStatusBadge()}
              {item.createdAt && (
                <span className="text-[11px] text-ink-soft">
                  {new Date(item.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 opacity-90 sm:opacity-70 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onEdit(item)}
            className="rounded-lg p-1.5 text-ink-soft hover:bg-teal-50 hover:text-teal-600 transition-colors"
            title="Edit Parameter"
            aria-label={`Edit ${item.parameter}`}
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="rounded-lg p-1.5 text-ink-soft hover:bg-rose-50 hover:text-rose-600 transition-colors"
            title="Delete Parameter"
            aria-label={`Delete ${item.parameter}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Parameter Details Grid */}
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-mist-100 pt-3">
        <div>
          <p className="text-[11px] font-medium text-ink-soft">Value</p>
          <p className="mt-0.5 text-base font-extrabold text-ink">
            {item.value}{' '}
            {item.unit && <span className="text-xs font-normal text-ink-soft">{item.unit}</span>}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-medium text-ink-soft">Reference Range</p>
          <p className="mt-0.5 text-xs font-semibold text-ink">
            {item.reference || <span className="text-ink-soft italic font-normal">Not specified</span>}
          </p>
        </div>
      </div>
    </Card>
  )
}
