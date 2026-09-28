import React, { useState, useMemo } from 'react'
import type { ManualParameter } from '@/types/manualEntry'
import { ManualParameterCard } from './ManualParameterCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  ClipboardList,
  Calendar,
  Layers,
} from 'lucide-react'

interface ManualParameterListProps {
  parameters: ManualParameter[]
  onAddClick: () => void
  onEdit: (item: ManualParameter) => void
  onDelete: (id: string) => void
  onClearAll?: () => void
}

export const ManualParameterList: React.FC<ManualParameterListProps> = ({
  parameters,
  onAddClick,
  onEdit,
  onDelete,
  onClearAll,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  const filteredParameters = useMemo(() => {
    return parameters.filter(
      (p) =>
        p.parameter.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.unit && p.unit.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.reference && p.reference.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  }, [parameters, searchQuery])

  // Group parameters sequence-wise by reportId or entry date/timestamp
  const groupedSessions = useMemo(() => {
    const map: Record<string, { key: string; date: string; rawDate: Date; items: ManualParameter[] }> = {}
    const order: string[] = []

    filteredParameters.forEach((item) => {
      const dateObj = item.createdAt ? new Date(item.createdAt) : new Date()
      // Grouping key: reportId if available, else date timestamp (up to minute)
      const key = item.reportId 
        ? `report-${item.reportId}` 
        : `date-${dateObj.toISOString().slice(0, 16)}`

      if (!map[key]) {
        map[key] = {
          key,
          rawDate: dateObj,
          date: dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          items: [],
        }
        order.push(key)
      }
      map[key].items.push(item)
    })

    // Sort sessions in reverse chronological order (newest entry sequence first)
    return order
      .map((k) => map[k])
      .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())
  }, [filteredParameters])

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <Input
            placeholder="Search parameters by name, unit, or range..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-mist-200 bg-white p-1 shadow-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-teal-50 text-teal-600 font-semibold'
                  : 'text-ink-soft hover:text-ink'
              }`}
              title="Sequence Group View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === 'table'
                  ? 'bg-teal-50 text-teal-600 font-semibold'
                  : 'text-ink-soft hover:text-ink'
              }`}
              title="Table List View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {parameters.length > 0 && onClearAll && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAll}
              className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
            >
              Clear All
            </Button>
          )}

          <Button
            onClick={onAddClick}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Value
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {parameters.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-mist-200 bg-white p-12 text-center shadow-xs">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 mb-4">
            <ClipboardList className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-ink">No Health Parameters Added Yet</h3>
          <p className="mt-1 max-w-sm text-xs text-ink-soft">
            Click <strong>"Add Value"</strong> to manually enter your medical lab results, vitals, or health parameters.
          </p>
          <Button
            onClick={onAddClick}
            className="mt-5 bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Your First Parameter
          </Button>
        </div>
      ) : filteredParameters.length === 0 ? (
        <div className="rounded-xl border border-mist-200 bg-white p-8 text-center">
          <p className="text-sm font-medium text-ink">No parameters matched "{searchQuery}"</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery('')}
            className="mt-2 text-xs text-teal-600"
          >
            Clear Search Filter
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Sequence-Wise Group View: Each Entry Session in a Single Row with 3-Card Window & Horizontal Scroll */
        <div className="space-y-6">
          {groupedSessions.map((session, sIdx) => {
            const hasMoreThanThree = session.items.length > 3
            return (
              <div
                key={session.key}
                className="space-y-3 rounded-2xl border border-mist-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm animate-rise"
              >
                {/* Entry Session Header under Date */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-mist-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold text-ink">
                          Entry Sequence #{groupedSessions.length - sIdx}
                        </span>
                        <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-bold text-teal-800">
                          {session.items.length} {session.items.length === 1 ? 'Value' : 'Values'}
                        </span>
                      </div>
                      <p className="text-xs text-ink-soft font-medium mt-0.5">
                        Recorded on: <strong className="text-ink-soft">{session.date}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Single Row Horizontal Scroll Container (3 Cards Display Width) */}
                <div className="relative">
                  <div className="flex gap-4 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-teal-600/30 scrollbar-track-mist-100">
                    {session.items.map((item) => (
                      <div
                        key={item.id}
                        className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)] shrink-0"
                      >
                        <ManualParameterCard
                          item={item}
                          onEdit={onEdit}
                          onDelete={onDelete}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Responsive Table View */
        <div className="overflow-hidden rounded-xl border border-mist-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-mist-200 bg-mist-50/80 font-semibold text-ink-soft">
                <tr>
                  <th className="px-4 py-3">Parameter Name</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Reference Value</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist-100">
                {filteredParameters.map((item) => (
                  <tr key={item.id} className="hover:bg-mist-50/50 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-ink">{item.parameter}</td>
                    <td className="px-4 py-3.5 font-extrabold text-ink">{item.value}</td>
                    <td className="px-4 py-3.5 text-ink-soft">{item.unit || '-'}</td>
                    <td className="px-4 py-3.5 text-ink-soft">{item.reference || '-'}</td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEdit(item)}
                          className="rounded-lg p-1.5 text-ink-soft hover:bg-teal-50 hover:text-teal-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(item.id)}
                          className="rounded-lg p-1.5 text-ink-soft hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
