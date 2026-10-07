import { ShieldAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface DoctorReportsTabProps {
  alerts: any[]
  alertsLoading: boolean
  alertFilter: 'ALL' | 'NEW' | 'REVIEWED'
  onFilterChange: (filter: 'ALL' | 'NEW' | 'REVIEWED') => void
  onReviewPatient: (alert: any) => void
}

export function DoctorReportsTab({
  alerts,
  alertsLoading,
  alertFilter,
  onFilterChange,
  onReviewPatient,
}: DoctorReportsTabProps) {
  return (
    <Card className="border-mist-200 bg-white shadow-xs">
      <CardHeader className="p-4 sm:p-5 border-b border-mist-100">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-ink">High-Risk Patient Clinical Alerts</CardTitle>
            <CardDescription className="text-xs text-ink-soft">
              Automated ML disease risk flags requiring physician attention.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={alertFilter === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFilterChange('ALL')}
              className="text-xs h-7"
            >
              All
            </Button>
            <Button
              variant={alertFilter === 'NEW' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFilterChange('NEW')}
              className="text-xs h-7"
            >
              Unreviewed
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {alertsLoading ? (
          <div className="p-8 text-center text-xs text-ink-soft">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-soft">No active clinical alerts</div>
        ) : (
          <div className="divide-y divide-mist-100">
            {alerts.map((alt) => (
              <div key={alt.id || alt.alertId} className="p-4 flex items-center justify-between hover:bg-mist-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-rose-50 text-rose-600 mt-0.5">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink text-xs">{alt.patientName || alt.patient_name}</span>
                      <Badge className="bg-rose-50 text-rose-600 border-rose-200 text-[10px]">
                        {alt.disease?.toUpperCase()} RISK: {((alt.riskProbability || alt.risk_probability || 0.8) * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <p className="text-[11px] text-ink-soft mt-0.5">
                      Report date: {alt.reportDate ? new Date(alt.reportDate).toLocaleDateString() : 'Recent'} | Patient ID: {alt.patientId}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => onReviewPatient(alt)}
                  className="bg-teal-600 text-white text-xs h-8 px-3"
                >
                  Review Patient
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
