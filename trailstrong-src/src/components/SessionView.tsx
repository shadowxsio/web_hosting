import { CalendarDays, Clock, PartyPopper } from 'lucide-react'
import type { Session } from '../data/program'
import { today, useData } from '../lib/storage'
import { ExerciseCard } from './ExerciseCard'

export function SessionView({ session, date, setDate }: { session: Session; date: string; setDate: (d: string) => void }) {
  const data = useData()
  const day = data.logs[date] ?? {}
  const total = session.exercises.length
  const done = session.exercises.filter((e) => day[e.id]?.done).length
  const pct = total ? done / total : 0
  const complete = done === total

  return (
    <section className="space-y-3">
      <header className="rounded-3xl border border-white/[0.07] bg-white/[0.035] p-4 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-extrabold leading-tight text-white">{session.title}</h2>
            <p className="mt-0.5 text-sm text-slate-400">{session.subtitle}</p>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-slate-300">
            <Clock className="h-3.5 w-3.5" />
            {session.duration}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-300">{session.goal}</p>

        <div className="mt-3 flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${complete ? 'bg-moss' : 'bg-gradient-to-r from-orange-500 to-amber-400'}`}
              style={{ width: `${pct * 100}%` }}
            />
          </div>
          <span className={`font-display text-sm font-bold tabular-nums ${complete ? 'text-moss' : 'text-white'}`}>
            {done}/{total}
          </span>
        </div>
        {complete && (
          <p className="pop mt-2 flex items-center gap-1.5 text-sm font-semibold text-moss">
            <PartyPopper className="h-4 w-4" /> Séance terminée — bravo Mickael !
          </p>
        )}

        <label className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <CalendarDays className="h-3.5 w-3.5" />
          Séance du
          <input
            type="date"
            value={date}
            max={today()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-slate-200 [color-scheme:dark]"
          />
          {date !== today() && (
            <button type="button" onClick={() => setDate(today())} className="font-semibold text-glacier">
              Aujourd’hui
            </button>
          )}
        </label>
      </header>

      {session.exercises.map((ex, i) => (
        <ExerciseCard key={`${date}-${ex.id}`} ex={ex} index={i} date={date} />
      ))}
    </section>
  )
}
