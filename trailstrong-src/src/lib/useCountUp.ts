import { useEffect, useRef, useState } from 'react'

/** Nombre qui défile jusqu'à sa nouvelle valeur (compteur de progression). */
export function useCountUp(value: number, ms = 600) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = from.current
    if (start === value || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      from.current = value
      setShown(value)
      return
    }
    const t0 = performance.now()
    let raf = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms)
      const eased = 1 - Math.pow(1 - k, 3)
      setShown(Math.round(start + (value - start) * eased))
      if (k < 1) raf = requestAnimationFrame(step)
      else from.current = value
    }
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      from.current = value
    }
  }, [value, ms])
  return shown
}
