import type { Exercise } from '../data/program'
import { asymmetry, today, useData } from '../lib/storage'

/** Écart gauche / droite de la dernière séance, par exercice unilatéral. */
export function AsymmetryPanel({ exercises }: { exercises: Exercise[] }) {
  const data = useData()
  const rows = exercises
    .filter((e) => e.perSide)
    .map((e) => ({ ex: e, a: asymmetry(data, e.id, today(), true) }))
    .filter((r): r is { ex: Exercise; a: NonNullable<ReturnType<typeof asymmetry>> } => !!r.a)
    .sort((x, y) => Math.abs(y.a.pct) - Math.abs(x.a.pct))

  return (
    <div className="b-card p-4">
      <h3 className="text-[16px] font-black uppercase tracking-wide tracking-tight">Asymétrie gauche / droite</h3>
      <p className="mb-3 mt-1 text-[12px] font-semibold text-ink/70">Travail (poids × reps) de la dernière séance. Objectif : écart sous 10 %.</p>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-[13px] font-semibold text-ink/60">Valide des séries G et D sur un exercice unilatéral pour voir l’écart.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ ex, a }) => {
            const total = a.l + a.r
            const lPct = Math.round((a.l / total) * 100)
            const gap = Math.abs(a.pct)
            return (
              <li key={ex.id}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px] font-bold">
                  <span className="truncate">{ex.name}</span>
                  <span className={`shrink-0 border-2 border-ink px-1.5 text-[11px] font-black italic rounded-xl ${gap >= 15 ? 'bg-rose' : gap >= 10 ? 'bg-sun' : 'bg-mint'}`}>
                    {gap === 0 ? '=' : `${a.pct > 0 ? 'D' : 'G'} +${gap} %`}
                  </span>
                </div>
                <div className="flex h-5 border-2 border-ink text-[10px] font-black rounded-xl">
                  <span className="flex items-center bg-sky pl-1.5" style={{ width: `${lPct}%` }}>
                    G
                  </span>
                  <span className="flex flex-1 items-center justify-end bg-peach pr-1.5">D</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
