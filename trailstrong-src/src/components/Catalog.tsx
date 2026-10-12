import { CalendarDays, Plus, Search, X } from 'lucide-react'
import { useState } from 'react'
import type { Exercise, FocusTag, Session, SessionId } from '../data/program'
import { today, useData } from '../lib/storage'
import { AddExerciseSheet } from './AddExerciseSheet'
import { ExerciseDrawer } from './ExerciseDrawer'
import { ExerciseTile } from './ExerciseTile'
import { TAG_META } from './meta'

export type Scope = 'all' | SessionId

const FOCUS: (FocusTag | null)[] = [null, 'knee', 'ankle', 'glutes']

/** Recherche tolérante aux accents et à la casse. */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const haystack = (ex: Exercise, s: Session) =>
  norm([ex.name, ex.target, ex.equipment, ex.badge ?? '', s.short, s.title, ...ex.tags.map((t) => TAG_META[t].label)].join(' '))

const longDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })

export function Catalog({
  program,
  scope,
  focus,
  setFocus,
  query,
  setQuery,
  date,
  setDate,
}: {
  program: Session[]
  scope: Scope
  focus: FocusTag | null
  setFocus: (f: FocusTag | null) => void
  query: string
  setQuery: (q: string) => void
  date: string
  setDate: (d: string) => void
}) {
  const data = useData()
  const day = data.logs[date] ?? {}
  const [openEx, setOpenEx] = useState<{ ex: Exercise; sessionId: SessionId } | null>(null)
  const [adding, setAdding] = useState<Session | null>(null)

  const inScope = program.filter((s) => scope === 'all' || s.id === scope)
  const count = (f: FocusTag | null) => inScope.reduce((n, s) => n + s.exercises.filter((e) => !f || e.tags.includes(f)).length, 0)

  const q = norm(query.trim())
  const groups = inScope
    .map((s) => ({
      session: s,
      items: s.exercises.map((ex, i) => ({ ex, i })).filter(({ ex }) => (!focus || ex.tags.includes(focus)) && (!q || haystack(ex, s).includes(q))),
    }))
    .filter((g) => g.items.length || (scope !== 'all' && !q && !focus))

  const visible = groups.flatMap((g) => g.items.map((x) => x.ex))
  const doneCount = visible.filter((e) => day[e.id]?.done).length
  const pct = visible.length ? Math.round((doneCount / visible.length) * 100) : 0
  const current = scope !== 'all' ? program.find((s) => s.id === scope)! : null
  const headline = q
    ? `${visible.length} résultat${visible.length > 1 ? 's' : ''}`
    : current
      ? current.title.split('—')[1]?.trim() || current.short
      : `${visible.length} exercices`
  const canAdd = !q && !focus

  return (
    <>
      {/* ── Bandeau bleu ── */}
      <section className="hero -mx-3 px-4 pb-6 pt-5 md:-mx-6 md:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="b-box inline-flex h-8 items-center px-3 text-[13px] font-bold shadow-[3px_3px_0_var(--color-shadow)]">
            {longDate(date)} · {doneCount}/{visible.length} validés · <span className="ml-1 font-black italic text-flame">{pct} %</span>
          </span>
          <label className="b-box relative inline-flex h-8 items-center gap-1 px-2 text-[12px] font-bold shadow-[3px_3px_0_var(--color-shadow)]" title="Changer la date">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">{date === today() ? 'Aujourd’hui' : date}</span>
            <input
              type="date"
              value={date}
              max={today()}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              aria-label="Date de la séance"
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          {date !== today() && (
            <button type="button" onClick={() => setDate(today())} className="text-[12px] font-extrabold underline decoration-2 underline-offset-2">
              Revenir à aujourd’hui →
            </button>
          )}
        </div>

        {current && <p className="tag mt-5 h-7 bg-paper px-2.5 text-[12px]">{current.subtitle}</p>}
        <h1 className={`headline ${current ? 'mt-3' : 'mt-5'} text-[42px] sm:text-[56px]`}>{headline}</h1>
        {current && <p className="mt-3 max-w-prose text-[15px] font-bold leading-snug text-ink">{current.goal}</p>}

        {/* Filtres-boîtes avec compteurs */}
        <div className="mt-5 flex flex-wrap gap-2.5" role="toolbar" aria-label="Filtres">
          {FOCUS.map((f) => {
            const active = f === focus
            return (
              <button
                key={f ?? 'all'}
                type="button"
                aria-pressed={active}
                onClick={() => setFocus(f)}
                className={`b-btn flex h-11 items-center gap-1.5 px-3.5 text-[14px] ${active ? 'b-btn-ink' : ''}`}
              >
                {f ? (
                  <>
                    <span>{TAG_META[f].emoji}</span> {TAG_META[f].label}
                  </>
                ) : (
                  'Tous'
                )}
                <span className="font-black italic">{count(f)}</span>
              </button>
            )
          })}
        </div>

        {/* Progression du jour */}
        <div className="mt-5 h-4 border-[2.5px] border-ink bg-paper" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full transition-all duration-500 ${pct === 100 ? 'bg-mint' : 'bg-flame'}`} style={{ width: `${pct}%` }} />
        </div>
      </section>

      {/* ── Recherche ── */}
      <div className="relative mt-6">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" strokeWidth={2.5} />
        <input
          id="search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Exercice, muscle ou équipement"
          className="b-input h-14 w-full pl-12 pr-12 text-[16px] placeholder:text-ink/45"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Effacer la recherche" className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center">
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* ── Grille ── */}
      <div className="space-y-8 pt-6">
        {visible.length === 0 && (q || focus) && (
          <p className="b-box p-4 text-center text-[14px] font-bold">
            Aucun exercice ne correspond.{' '}
            <button
              type="button"
              className="underline decoration-2"
              onClick={() => {
                setQuery('')
                setFocus(null)
              }}
            >
              Tout afficher
            </button>
          </p>
        )}
        {groups.map((g) => (
          <section key={g.session.id}>
            {scope === 'all' && (
              <h2 className="mb-1 flex items-baseline gap-2">
                <span className="headline headline-sun text-[24px]">{g.session.short}</span>
                <span className="text-[12px] font-bold text-ink/60">{g.session.duration}</span>
                <span className="ml-auto text-[13px] font-black italic">
                  {g.items.filter(({ ex }) => day[ex.id]?.done).length}/{g.items.length}
                </span>
              </h2>
            )}
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
              {g.items.map(({ ex, i }) => (
                <ExerciseTile key={`${date}-${ex.id}`} ex={ex} sessionId={g.session.id} index={i} date={date} onOpen={() => setOpenEx({ ex, sessionId: g.session.id })} />
              ))}
              {canAdd && (
                <button
                  type="button"
                  onClick={() => setAdding(g.session)}
                  className="mt-[26px] flex min-h-[72px] items-center justify-center gap-2 border-[2.5px] border-dashed border-ink/50 bg-paper/50 px-3 text-[14px] font-extrabold uppercase italic text-ink/60 transition duration-150 hover:border-flame hover:text-ink active:border-flame"
                >
                  <Plus className="h-5 w-5" strokeWidth={3} /> Ajouter un exercice à cette séance
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
