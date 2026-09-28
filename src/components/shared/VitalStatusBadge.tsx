import { Badge } from '@/components/ui/badge'
import type { VitalReading } from '@/types'

const statusVariant: Record<VitalReading['status'], 'success' | 'warning' | 'danger'> = {
  normal: 'success',
  borderline: 'warning',
  high: 'danger',
  low: 'warning',
}

const statusLabel: Record<VitalReading['status'], string> = {
  normal: 'Normal',
  borderline: 'Borderline',
  high: 'High',
  low: 'Low',
}

export function VitalStatusBadge({ status }: { status: VitalReading['status'] }) {
  return <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
}
