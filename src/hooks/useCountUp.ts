import { useEffect, useState } from 'react'

export function useCountUp(target: number, durationMs = 1000, decimals = 0) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let raf: number
    const start = performance.now()
    const from = 0

    function tick(now: number) {
      const progress = Math.min((now - start) / durationMs, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = from + (target - from) * eased
      setValue(Number(current.toFixed(decimals)))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs, decimals])

  return value
}
