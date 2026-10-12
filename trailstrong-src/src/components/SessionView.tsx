import { CalendarDays, Clock, Plus } from 'lucide-react'
import { useState } from 'react'
import type { Exercise, Session } from '../data/program'
import { today, useData } from '../lib/storage'
import { AddExerciseSheet } from './AddExerciseSheet'
import { ExerciseCard } from './ExerciseCard'

export interface Group {
  session: Session
  exercises: Exercise[]
}

/** Vue « dashboard » : barre de jour (date + KPIs) puis groupes de cartes accordéon. */
export function SessionView({
  groups,
  date,
  setDate,
  title,
  subtitle,
  allowAdd = true,
}: {
  groups: Group[]
  date: string
  setDate: (d: string) => void
  title: string
  subtitle?: string
  allowAdd?: boolean
}) {
  const data = useData()
  const day = data.logs[date] ?? {}
  const all = groups.flatMap((g) => g.exercises)
  const done = all.filter((e) => day[e.id]?.done).length
  const sets = all.reduce((n, e) => n + (day[e.id]?.sets.filter((s) => s.done).length ?? 0), 0)
  const volume = all.reduce(
    (v, e) => v + (day[e.id]?.sets ?? []).filter((s) => s.done).reduce((a, s) => a + (parseFloat(s.w) || 0) * (parseFloat(s.r) || 0), 0),
    0,
  )
  const pct = all.length ? done / all.length : 0
  const complete = all.length > 0 && done === all.length

  // Ouvre automatiquement la 1re carte non terminée (au montage uniquement).
  const [autoOpen, setAutoOpen] = useState(() => all.find((e) => !day[e.id]?.done)?.id)
  const [adding, setAdding] = useState<Session | null>(null)

  return (
    <section className="space-y-4">
      <header className="card p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[17px] leading-tight font-semibold tracking-tight text-fg">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[12px] leading-snug text-muted">{subtitle}</p>}
          </div>
          <label className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-chip/60 px-2 text-[11px] text-slate-400">
            <CalendarDays className="h-3.5 w-3.5" />
            <input
              type="date"
              value={date}
              max={today()}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              aria-label="Date de la séance"
              className="h-9 bg-transparent font-mono text-[11px] text-slate-200 [color-scheme:dark] focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-3 grid grid-cols-3 divide-x divide-white/[0.06] rounded-xl border border-line bg-ink-2/70">
          <Kpi label="Exercices" value={`${done}/${all.length}`} tone={complete ? 'text-moss' : 'text-fg'} />
          <Kpi label="Séries" value={String(sets)} tone="text-fg" />
          <Kpi label="Volume" value={volume ? `${Math.round(volume).toLocaleString('fr-CA')}` : '—'} tone="text-fg" />
        </div>

        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.05]" role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${complete ? 'bg-moss' : 'bg-gradient-to-r from-ember to-iris'}`}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
        {complete && <p className="fade-up mt-2 text-[12px] font-medium text-emerald-400">✓ Tout est validé — bravo Mickael.</p>}
        {date !== today() && (
          <button type="button" onClick={() => setDate(today())} className="mt-2 text-[11px] font-semibold text-glacier">
            ← Revenir à aujourd’hui
          </button>
        )}
      </header>

      {groups.map((g) => {
        const gDone = g.exercises.filter((e) => day[e.id]?.done).length
        return (
          <div key={g.session.id} className="space-y-2">
            {groups.length > 1 || g.exercises.length !== g.session.exercises.length ? (
              <div className="flex items-center gap-2 px-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{g.session.short}</span>
                <span className="h-px flex-1 bg-white/[0.06]" />
                <span className="flex items-center gap-1 font-mono text-[10px] text-slate-500">
                  <Clock className="h-3 w-3" /> {g.session.duration}
                </span>
                <span className={`font-mono text-[10px] ${gDone === g.exercises.length ? 'text-moss' : 'text-slate-500'}`}>
                  {gDone}/{g.exercises.length}
                </span>
              </div>
            ) : null}
            {g.exercises.map((ex) => (
              <ExerciseCard
                key={`${date}-${ex.id}`}
                ex={ex}
                index={g.session.exercises.indexOf(ex)}
                date={date}
                sessionId={g.session.id}
                defaultOpen={ex.id === autoOpen}
              />
            ))}
            {allowAdd && (
              <button
                type="button"
                onClick={() => setAdding(g.session)}
                className="flex h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-700 bg-ink-2/40 text-[12px] font-medium text-slate-400 transition duration-200 hover:border-orange-500 hover:text-white active:scale-[0.99] active:border-orange-500"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter un exercice à cette séance
              </button>
            )}
          </div>
        )
      })}
      {adding && (
        <AddExerciseSheet
          session={adding}
          onClose={() => setAdding(null)}
          onAdded={(id) => {
            setAutoOpen(id)
            setAdding(null)
            window.setTimeout(() => document.getElementById(`check-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
          }}
        />
      )}
    </section>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="px-3 py-2">
      <p className="label">{label}</p>
      <p className={`font-mono text-lg font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  )
}
