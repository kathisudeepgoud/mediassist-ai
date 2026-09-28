import { useEffect, useState } from 'react'
import { cn } from '@/utils/cn'

const statusColor: Record<string, string> = {
  Low: '#0f766e',
  Moderate: '#eab308',
  High: '#e6435f',
  'Insufficient Data': '#94a3b8',
}

export function RiskGauge({ percentage, status, size = 120 }: { percentage: number | null | undefined; status: string; size?: number }) {
  const isInsufficient = percentage === null || percentage === undefined || status === 'Insufficient Data'
  const [animated, setAnimated] = useState(0)
  const radius = (size - 14) / 2
  const circumference = 2 * Math.PI * radius
  const color = statusColor[status] ?? (isInsufficient ? '#94a3b8' : '#0f766e')

  useEffect(() => {
    if (!isInsufficient && typeof percentage === 'number') {
      const t = setTimeout(() => setAnimated(percentage), 100)
      return () => clearTimeout(t)
    } else {
      setAnimated(0)
    }
  }, [percentage, isInsufficient])

  const offset = isInsufficient ? circumference : circumference - (animated / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e3e9f0" strokeWidth={10} fill="none" />
        {!isInsufficient && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={10}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1)' }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-mono text-xl font-semibold')} style={{ color }}>
          {isInsufficient ? '--' : `${Math.round(animated)}%`}
        </span>
        <span className="text-[10px] text-ink-soft text-center px-1 font-medium truncate max-w-full">
          {status}
        </span>
      </div>
    </div>
  )
}
