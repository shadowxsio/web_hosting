/**
 * Petit graphique SVG mono-série (pas de lib → bundle léger, hors-ligne).
 * Ligne 2 px, marqueurs 8 px, grille discrète, info-bulle au survol / toucher.
 */
import { useState } from 'react'

export interface Point {
  label: string
  value: number
  detail?: string
}

export function LineChart({ points, unit, kind = 'line' }: { points: Point[]; unit: string; kind?: 'line' | 'bar' }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 340
  const H = 170
  const pad = { l: 40, r: 22, t: 14, b: 24 }
  if (!points.length) return <p className="py-8 text-center text-sm text-ink/60">Pas encore de données — valide quelques séries !</p>

  const max = Math.max(...points.map((p) => p.value))
  const min = kind === 'bar' ? 0 : Math.min(...points.map((p) => p.value))
  const span = max - min || Math.max(1, max * 0.2)
  const tick = nice(span / (kind === 'bar' ? 3 : 2))
  const lo = kind === 'bar' ? 0 : Math.max(0, Math.floor((min - span * 0.1) / tick) * tick)
  const hi = Math.max(lo + tick, Math.ceil((max + span * 0.05) / tick) * tick)
  const iw = W - pad.l - pad.r
  const ih = H - pad.t - pad.b
  const step = points.length > 1 ? iw / (points.length - 1) : 0
  const bw = Math.min(28, (iw / points.length) * 0.6)
  const x = (i: number) => (kind === 'bar' ? pad.l + (iw / points.length) * (i + 0.5) : pad.l + (points.length > 1 ? i * step : iw / 2))
  const y = (v: number) => pad.t + ih - ((v - lo) / (hi - lo || 1)) * ih
  const ticks: number[] = []
  for (let v = lo; v <= hi + tick / 1000; v += tick) ticks.push(v)
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ')
  const every = Math.ceil(points.length / 6)
  const h = hover != null ? points[hover] : null

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const px = ((e.clientX - r.left) / r.width) * W
          let best = 0
          points.forEach((_, i) => {
            if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i
          })
          setHover(best)
        }}
        role="img"
        aria-label={`Graphique : ${points.map((p) => `${p.label} ${p.value} ${unit}`).join(', ')}`}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="rgba(27,20,36,0.15)" strokeWidth={1} />
            <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" fontSize={9} fill="#1b1424" fillOpacity={0.6} fontWeight={700}>
              {t >= 10000 ? `${Math.round(t / 1000)}k` : Math.round(t * 10) / 10}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          i % every === 0 || i === points.length - 1 ? (
            <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="#1b1424" fillOpacity={0.6} fontWeight={700}>
              {p.label}
            </text>
          ) : null,
        )}
        {kind === 'bar' ? (
          points.map((p, i) => (
            <path
              key={i}
              d={roundedTop(x(i) - bw / 2, y(p.value), bw, y(0) - y(p.value), 4)}
              fill="#f97316"
              opacity={hover == null || hover === i ? 1 : 0.45}
            />
          ))
        ) : (
          <>
            <path d={`${path} L${x(points.length - 1)} ${y(lo)} L${x(0)} ${y(lo)} Z`} fill="url(#area)" opacity={0.35} />
            <defs>
              <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#f97316" />
                <stop offset="1" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={path} fill="none" stroke="#f97316" strokeWidth={2} strokeLinejoin="round" />
            {points.map((p, i) => (
              <circle key={i} cx={x(i)} cy={y(p.value)} r={4} fill="#f97316" stroke="#1b1424" strokeWidth={2} />
            ))}
          </>
        )}
        {h && hover != null && (
          <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="#1b1424" strokeWidth={1} strokeDasharray="3 3" />
        )}
      </svg>
      {h && hover != null && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 border-2 border-ink bg-paper px-2.5 py-1.5 text-xs shadow-[3px_3px_0_#1b1424]"
          style={{ left: `${Math.min(85, Math.max(15, (x(hover) / W) * 100))}%` }}
        >
          <p className="text-ink/70">{h.label}</p>
          <p className="font-mono font-bold text-ink">
            {h.value.toLocaleString('fr-CA')} {unit}
          </p>
          {h.detail && <p className="text-ink/70">{h.detail}</p>}
        </div>
      )}
    </div>
  )
}

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h, w / 2)
  return `M${x} ${y + h} V${y + rr} Q${x} ${y} ${x + rr} ${y} H${x + w - rr} Q${x + w} ${y} ${x + w} ${y + rr} V${y + h} Z`
}

/** Pas « rond » (1, 2, 2,5, 5 × 10^n) pour des graduations lisibles. */
function nice(x: number) {
  const p = 10 ** Math.floor(Math.log10(Math.max(x, 1e-9)))
  const f = x / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p
}
