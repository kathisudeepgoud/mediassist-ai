import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { api } from '@/services/api'
import { Skeleton } from '@/components/ui/skeleton'

export function RecentReportsTable() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getReports()
        setReports(res.reports || [])
      } catch {
        /* ignore */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return <Skeleton className="h-28 w-full" />
  }

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-6 w-6" />}
        title="No Reports Available"
        description="Upload your first medical report to see it summarized here."
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-mist-200 text-xs uppercase tracking-wide text-ink-soft">
            <th className="py-2.5 font-medium">Report</th>
            <th className="py-2.5 font-medium">Date</th>
            <th className="py-2.5 font-medium">Hospital</th>
            <th className="py-2.5 font-medium">Type</th>
            <th className="py-2.5 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
            {reports.slice(0, 5).map((r) => {
              const rType = r.type || 'Lab Report'
              const rDate = r.report_date || r.reportDate || new Date().toISOString()
              const rHospital = r.hospital || 'General Lab'
              const isManual = r.source === 'Manual Entry' || r.file_type === 'MANUAL' || r.fileType === 'MANUAL' || (r.type && r.type.toLowerCase().includes('manual'))
              const sourceTag = isManual ? 'Manual Entry' : (r.source || 'Uploaded PDF')
              const badgeVariant: 'success' | 'blue' | 'default' = isManual ? 'success' : sourceTag.includes('OCR') ? 'default' : 'blue'

              return (
                <tr key={r.id} className="border-b border-mist-100 last:border-0">
                  <td className="py-3 font-medium text-ink">{rType}</td>
                  <td className="py-3 text-ink-soft">
                    {new Date(rDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="py-3 text-ink-soft">{rHospital}</td>
                  <td className="py-3">
                    <Badge variant={badgeVariant}>{sourceTag}</Badge>
                  </td>
                <td className="py-3 text-right">
                  <Link to="/reports" className="text-xs font-medium text-teal-600 hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
