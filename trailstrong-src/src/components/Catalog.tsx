import { CalendarDays, Plus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Exercise, FocusTag, Session, SessionId } from '../data/program'
import { today, useData } from '../lib/storage'
import { AddExerciseSheet } from './AddExerciseSheet'
import { ExerciseDrawer } from './ExerciseDrawer'
import { ExerciseTile } from './ExerciseTile'
import { SESSION_META, TAG_META } from './meta'

export type FilterId = 'all' | SessionId | FocusTag

export const FILTERS: { id: FilterId; label: string; emoji: string }[] = [
  { id: 'all', label: 'Tous', emoji: '' },
  { id: 'activation', label: 'Activation', emoji: '🔥' },
  { id: 'seanceA', label: 'Séance A', emoji: '🦵' },
  { id: 'seanceB', label: 'Séance B', emoji: '⚖️' },
  { id: 'tapis', label: 'Tapis D+', emoji: '⛰️' },
  { id: 'knee', label: 'Genou', emoji: '🩹' },
  { id: 'ankle', label: 'Cheville', emoji: '⚓' },
  { id: 'glutes', label: 'Fessiers', emoji: '🍑' },
]

const isSession = (f: FilterId): f is SessionId => f in SESSION_META

/** Normalise pour une recherche tolérante aux accents et à la casse. */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

function haystack(ex: Exercise, s: Session) {
  return norm(
    [ex.name, ex.target, ex.equipment, ex.badge ?? '', s.short, s.title, ...ex.tags.map((t) => TAG_META[t].label)].join(
      ' ',
    ),
  )
}

const longDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })

export function Catalog({
  program,
  filter,
  setFilter,
  query,
  setQuery,
  date,
  setDate,
}: {
  program: Session[]
  filter: FilterId
  setFilter: (f: FilterId) => void
  query: string
  setQuery: (q: string) => void
  date: string
  setDate: (d: string) => void
}) {
  const data = useData()
  const day = data.logs[date] ?? {}
  const [openEx, setOpenEx] = useState<{ ex: Exercise; sessionId: SessionId } | null>(null)
  const [adding, setAdding] = useState<Session | null>(null)

  const matchFilter = (f: FilterId, ex: Exercise, s: Session) => f === 'all' || (isSession(f) ? s.id === f : ex.tags.includes(f))

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.id, program.reduce((n, s) => n + s.exercises.filter((e) => matchFilter(f.id, e, s)).length, 0)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [program],
  ) as Record<FilterId, number>

  const q = norm(query.trim())
  const groups = program
    .map((s) => ({ session: s, items: s.exercises.map((ex, i) => ({ ex, i })).filter(({ ex }) => matchFilter(filter, ex, s) && (!q || haystack(ex, s).includes(q))) }))
    .filter((g) => g.items.length || (isSession(filter) && g.session.id === filter && !q))

  const visible = groups.flatMap((g) => g.items.map((x) => x.ex))
  const doneCount = visible.filter((e) => day[e.id]?.done).length
  const pct = visible.length ? Math.round((doneCount / visible.length) * 100) : 0
  const current = isSession(filter) ? program.find((s) => s.id === filter)! : null
  const headline = current ? current.title.split('—')[1]?.trim() || current.short : q ? `${visible.length} résultat${visible.length > 1 ? 's' : ''}` : filter === 'all' ? `${visible.length} exercices` : `Focus ${FILTERS.find((f) => f.id === filter)!.label}`

  return (
    <>
      {/* ── Bandeau d'exploration ── */}
      <section className="dots -mx-3 border-b border-zinc-800 px-3 pb-4 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-7 items-center rounded-md border border-zinc-800 bg-zinc-900 px-2.5 text-[12px] font-medium text-zinc-300">
            {longDate(date)} · {current ? current.short : 'Programme'} · <span className="ml-1 font-mono text-orange-400">{pct} %</span>
          </span>
          <label className="inline-flex h-7 items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-[11px] text-zinc-400">
            <CalendarDays className="hidden h-3.5 w-3.5 sm:block" />
            <input
              type="date"
              value={date}
              max={today()}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              aria-label="Date de la séance"
              className="w-[22px] bg-transparent text-transparent [color-scheme:dark] focus:outline-none sm:w-auto sm:text-zinc-300"
            />
          </label>
          {date !== today() && (
            <button type="button" onClick={() => setDate(today())} className="text-[11px] font-medium text-cyan-400">
              Aujourd’hui →
            </button>
          )}
        </div>

        <h1 className="headline mt-3 text-[34px] text-zinc-50 sm:text-[44px]">{headline}</h1>
        {current && <p className="mt-2 max-w-prose text-[13px] leading-snug text-zinc-400">{current.goal}</p>}

        <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-zinc-800" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${pct}%` }} />
        </div>

        {/* Recherche instantanée */}
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            id="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un exercice, un muscle, un équipement…"
            className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-10 text-[14px] text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Effacer la recherche" className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center text-zinc-500">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filtres pills avec compteurs */}
        <div className="no-scrollbar -mx-3 mt-3 flex gap-1.5 overflow-x-auto px-3" role="toolbar" aria-label="Filtres">
          {FILTERS.map((f) => {
            const active = f.id === filter
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f.id)}
                className={`flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition duration-150 active:scale-95 ${
                  active ? 'border-zinc-500 bg-zinc-100 text-zinc-950' : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {f.emoji && <span className="text-[13px] leading-none">{f.emoji}</span>}
                {f.label}
                <span className={`font-mono text-[11px] italic ${active ? 'text-orange-600' : 'text-zinc-600'}`}>{counts[f.id]}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Grille directory ── */}
      <div className="space-y-6 pt-5">
        {visible.length === 0 && q && (
          <p className="py-10 text-center text-[14px] text-zinc-500">
            Aucun exercice pour « {query} ».{' '}
            <button type="button" className="text-cyan-400" onClick={() => setQuery('')}>
              Effacer
            </button>
          </p>
        )}
        {groups.map((g) => (
          <section key={g.session.id}>
            {(filter === 'all' || !isSession(filter)) && (
              <h2 className="mb-1 flex items-baseline gap-2 px-0.5">
                <span className="font-display text-[15px] font-black uppercase italic tracking-tight text-zinc-200">{g.session.short}</span>
                <span className="text-[11px] text-zinc-500">{g.session.duration}</span>
                <span className="ml-auto font-mono text-[11px] text-zinc-500">
                  {g.items.filter(({ ex }) => day[ex.id]?.done).length}/{g.items.length}
                </span>
              </h2>
            )}
            <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map(({ ex, i }) => (
                <ExerciseTile key={`${date}-${ex.id}`} ex={ex} sessionId={g.session.id} index={i} date={date} onOpen={() => setOpenEx({ ex, sessionId: g.session.id })} />
              ))}
              {!q && (filter === 'all' || isSession(filter)) && (
                <button
                  type="button"
                  onClick={() => setAdding(g.session)}
                  className="mt-3 flex min-h-[64px] items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-700 bg-transparent text-[13px] font-medium text-zinc-400 transition duration-200 hover:border-orange-500 hover:text-white active:border-orange-500"
                >
                  <Plus className="h-4 w-4" /> Ajouter un exercice à cette séance
                </button>
              )}
            </div>
          </section>
        ))}
      </div>

      {openEx && (
        <ExerciseDrawer
          key={openEx.ex.id}
          ex={program.find((s) => s.id === openEx.sessionId)?.exercises.find((e) => e.id === openEx.ex.id) ?? openEx.ex}
          sessionId={openEx.sessionId}
          date={date}
          onClose={() => setOpenEx(null)}
        />
      )}
      {adding && (
        <AddExerciseSheet
          session={adding}
          onClose={() => setAdding(null)}
          onAdded={(id) => {
            setAdding(null)
            window.setTimeout(() => document.getElementById(`check-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
          }}
        />
      )}
    </>
  )
}
