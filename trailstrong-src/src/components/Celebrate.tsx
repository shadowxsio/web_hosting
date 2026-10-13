import { useMemo } from 'react'

const COLORS = ['var(--color-sun)', 'var(--color-flame)', 'var(--color-rust)', 'var(--color-teal)', 'var(--color-mint)', 'var(--color-lilac)']

/** Confettis aux couleurs de l'écusson (séance complète). Purement décoratif. */
export function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        left: `${Math.random() * 100}%`,
        background: COLORS[i % COLORS.length],
        '--x': `${(Math.random() - 0.5) * 160}px`,
        '--r': `${(Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540)}deg`,
        '--d': `${1.3 + Math.random() * 0.9}s`,
        '--delay': `${Math.random() * 0.25}s`,
      })),
    [],
  )
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((style, i) => (
        <i key={i} style={style as React.CSSProperties} />
      ))}
    </div>
  )
}
