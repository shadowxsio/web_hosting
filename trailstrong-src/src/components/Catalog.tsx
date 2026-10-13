import { CalendarDays, Plus, Search, Stethoscope, X } from 'lucide-react'
import { Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Exercise, FocusTag, Session, SessionId } from '../data/program'
import { routineOf, routineSeconds } from '../data/cooldown'
import { today, updateSessionLog, useData } from '../lib/storage'
import { useUserProgram } from '../lib/userProgram'
import { ExerciseDrawer } from './ExerciseDrawer'
import { ExerciseTile } from './ExerciseTile'
import { ExerciseDiagram } from './ExerciseDiagram'
import { SESSION_META, TAG_META } from './meta'
import { PainCheckin } from './PainCheckin'
import { nextTestIn } from '../lib/tests'
import { useCountUp } from '../lib/useCountUp'
import { haptic } from '../lib/haptics'
import { Confetti } from './Celebrate'
import { flushSync } from 'react-dom'

// Écrans ouverts à la demande : chargés au premier usage (précachés pour le hors-ligne).
const CooldownCoach = lazy(() => import('./CooldownCoach').then((m) => ({ default: m.CooldownCoach })))
const SessionRecap = lazy(() => import('./SessionRecap').then((m) => ({ default: m.SessionRecap })))
const AddExerciseSheet = lazy(() => import('./AddExerciseSheet').then((m) => ({ default: m.AddExerciseSheet })))

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
  onTests,
}: {
  program: Session[]
  scope: Scope
  focus: FocusTag | null
  setFocus: (f: FocusTag | null) => void
  query: string
  setQuery: (q: string) => void
  date: string
  setDate: (d: string) => void
  onTests: () => void
}) {
  const data = useData()
  const day = data.logs[date] ?? {}
  const [openEx, setOpenEx] = useState<{ ex: Exercise; sessionId: SessionId; morph?: boolean } | null>(null)
  // La carte se transforme en fiche (View Transitions : élément partagé « ex-card »).
  const openTile = useCallback((ex: Exercise, sessionId: SessionId) => {
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } }
    const card = document.querySelector<HTMLElement>(`[data-card="${CSS.escape(ex.id)}"]`)
    if (!card || !doc.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return setOpenEx({ ex, sessionId })
    card.style.viewTransitionName = 'ex-card'
    const vt = doc.startViewTransition(() => {
      card.style.viewTransitionName = ''
      flushSync(() => setOpenEx({ ex, sessionId, morph: true }))
    })
    vt.finished.finally(() => setOpenEx((cur) => (cur?.morph ? { ...cur, morph: false } : cur)))
  }, [])
  const [adding, setAdding] = useState<Session | null>(null)
  const [recap, setRecap] = useState<Session | null>(null)
  const generated = useUserProgram() !== null
  const [cooldown, setCooldown] = useState<Session | null>(null)

  // Séance du jour terminée à 100 % → bilan automatique (une seule fois), après la fanfare du coach.
  const doneKey = program.map((s) => s.exercises.every((e) => day[e.id]?.done) && s.exercises.length > 0).join()
  useEffect(() => {
    if (date !== today()) return
    const finished = program.find(
      (s) => s.id !== 'activation' && s.exercises.length > 0 && s.exercises.every((e) => day[e.id]?.done) && !data.sessions[date]?.[s.id]?.recapAt,
    )
    if (!finished) return
    const id = window.setTimeout(() => {
      updateSessionLog(date, finished.id, { recapAt: Date.now() })
      setRecap(withWarmup(finished))
    }, 1800)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneKey, date])
  const startedIn = (s: Session) => s.exercises.some((e) => day[e.id]?.sets.some((x) => x.done) || day[e.id]?.done)

  // Une séance = 1. Activation (échauffement) → 2. ses exercices → 3. mobilité.
  const activation = program.find((s) => s.id === 'activation')!
  const withWarmup = (s: Session): Session => (s.id === 'activation' ? s : { ...s, exercises: [...activation.exercises, ...s.exercises] })
  const inScope = scope === 'all' ? program : scope === 'activation' ? [activation] : [activation, program.find((s) => s.id === scope)!]
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
  const pctShown = useCountUp(pct)
  // Célébration quand la séance atteint 100 % (pas au chargement d'une séance déjà finie).
  const [party, setParty] = useState(false)
  const lastPct = useRef({ pct, key: `${scope}|${date}` })
  useEffect(() => {
    const key = `${scope}|${date}`
    const prev = lastPct.current
    lastPct.current = { pct, key }
    if (prev.key !== key || pct < 100 || prev.pct >= 100 || !visible.length) return
    setParty(true)
    haptic([20, 40, 20, 40, 60])
    const id = window.setTimeout(() => setParty(false), 2400)
    return () => window.clearTimeout(id)
  }, [pct, scope, date, visible.length])
  const current = scope !== 'all' ? program.find((s) => s.id === scope)! : null
  const routine = current ? routineOf(current) : []
  const showMobility = !!current && routine.length > 0 && !q && !focus
  const finishedAt = current ? data.sessions[date]?.[current.id]?.recapAt : undefined
  const step = (s: Session) => (scope === 'all' ? null : s.id === 'activation' ? 1 : 2)
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
          <span className="b-box inline-flex h-8 items-center px-3 text-[13px] font-bold shadow-[0_3px_0_var(--color-shadow)]">
            {longDate(date)} · {doneCount}/{visible.length} validés · <span className="ml-1 font-black italic tabular-nums text-flame">{pctShown} %</span>
          </span>
          <label className="b-box relative inline-flex h-8 items-center gap-1 px-2 text-[12px] font-bold shadow-[0_3px_0_var(--color-shadow)]" title="Changer la date">
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
        {current && generated && (
          <p className="mt-3 flex max-w-prose items-start gap-2 text-[12px] font-bold leading-snug text-ink/80">
            <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-flame" strokeWidth={2.5} />
            Programme généré automatiquement à partir de tes réponses : fais-le valider par un physio ou un coach, surtout en cas de douleur.
          </p>
        )}

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
        <div className="mt-5 h-4 overflow-hidden border-[2.5px] border-ink bg-paper rounded-xl" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className={`progress-fill h-full w-full ${pct === 100 ? 'bg-mint' : 'bg-flame'}`} style={{ transform: `scaleX(${pct / 100})` }} />
        </div>

        {current && current.id !== 'activation' && (
          <button
            type="button"
            data-tour="finish"
            onClick={() => {
              if (!finishedAt) updateSessionLog(date, current.id, { recapAt: Date.now() })
              setRecap(withWarmup(current))
            }}
            className={`b-btn mt-4 flex h-12 w-full items-center justify-center gap-2 text-[14px] uppercase tracking-wide ${finishedAt ? 'bg-mint' : 'bg-sun'}`}
          >
            {finishedAt ? '✓ Séance terminée · bilan & récup' : '🏁 Terminer la séance · bilan & récup'}
          </button>
        )}

        <PainCheckin date={date} />
        {nextTestIn(data, today()) <= 0 && (
          <button type="button" onClick={onTests} className="b-btn mt-3 flex min-h-11 w-full items-center gap-2 bg-lilac px-3 py-2 text-left text-[13px]">
            <span className="text-[16px]">🧪</span>
            <span className="uppercase tracking-wide">Test mensuel à faire</span>
            <span className="ml-auto text-[12px] font-extrabold">4 tests · 15 min →</span>
          </button>
        )}
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
            <SectionHeader
              tour={step(g.session) === 1 ? 'warmup' : undefined}
              n={step(g.session)}
              title={step(g.session) === 1 ? 'Activation' : g.session.short}
              sub={step(g.session) === 1 ? `Échauffement · ${g.session.duration}` : g.session.duration}
              bg={SESSION_META[g.session.id].bg}
              done={g.items.filter(({ ex }) => day[ex.id]?.done).length}
              total={g.items.length}
              action={
                scope === 'all' && g.session.id !== 'activation' && startedIn(g.session) ? (
                  <button type="button" onClick={() => setRecap(withWarmup(g.session))} className="b-btn h-8 bg-paper px-2 text-[11px] uppercase tracking-wide">
                    Bilan
                  </button>
                ) : null
              }
            />
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
              {g.items.map(({ ex, i }) => (
                <ExerciseTile
                  key={`${date}-${ex.id}`}
                  ex={ex}
                  sessionId={g.session.id}
                  index={i}
                  date={date}
                  tour={step(g.session) === 2 && ex.id === g.items[0]?.ex.id}
                  onOpen={openTile}
                />
              ))}
              {canAdd && (
                <button
                  type="button"
                  data-tour={step(g.session) === 2 ? 'add' : undefined}
                  onClick={() => setAdding(g.session)}
                  className="mt-[26px] flex min-h-[72px] items-center justify-center gap-2 border-[2.5px] border-dashed border-ink/50 bg-paper/50 px-3 text-[14px] font-extrabold uppercase tracking-wide text-ink/60 transition duration-150 hover:border-flame hover:text-ink active:border-flame rounded-xl"
                >
                  <Plus className="h-5 w-5" strokeWidth={3} /> Ajouter un exercice à cette séance
                </button>
              )}
            </div>
          </section>
        ))}

        {showMobility && current && (
          <section>
            <SectionHeader
              tour="mobility"
              n={3}
              title="Mobilité"
              sub={`Étirements · ≈ ${Math.round(routineSeconds(routine) / 60)} min`}
              bg="bg-sky"
              done={data.sessions[date]?.[current.id]?.cooldownAt ? routine.length : 0}
              total={routine.length}
            />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {routine.map((st) => (
                <button key={st.id} type="button" onClick={() => setCooldown(current)} className="b-card overflow-hidden text-left !shadow-[0_3px_0_var(--color-shadow)] active:translate-y-px">
                  <div className="diagram-bg aspect-[5/4] border-b-2 border-ink !border-t-0">
                    <ExerciseDiagram id={st.diagram} />
                  </div>
                  <p className="px-2 pt-1.5 text-[10px] font-extrabold uppercase text-ink/60">{st.target}</p>
                  <p className="px-2 text-[13px] font-black italic leading-tight">{st.name}</p>
                  <p className="px-2 pb-2 pt-0.5 text-[11px] font-bold">
                    {st.hold} s{st.perSide ? ' / côté' : ''}
                  </p>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setCooldown(current)} className="b-btn mt-4 flex h-12 w-full items-center justify-center gap-2 bg-mint text-[14px] uppercase tracking-wide">
              {data.sessions[date]?.[current.id]?.cooldownAt ? '✓ Étirements faits · refaire' : '▶ Lancer le retour au calme guidé'}
            </button>
          </section>
        )}
      </div>

      {openEx && (
        <ExerciseDrawer
          key={openEx.ex.id}
          ex={program.find((s) => s.id === openEx.sessionId)?.exercises.find((e) => e.id === openEx.ex.id) ?? openEx.ex}
          sessionId={openEx.sessionId}
          date={date}
          onClose={() => setOpenEx(null)}
          morph={openEx.morph}
        />
      )}
      {party && <Confetti />}
      <Suspense fallback={null}>
        {recap && (
          <SessionRecap
            session={recap}
            date={date}
            onClose={() => setRecap(null)}
            onCooldown={() => {
              setCooldown(program.find((p) => p.id === recap.id) ?? recap)
              setRecap(null)
            }}
          />
        )}
        {cooldown && <CooldownCoach session={cooldown} date={date} onClose={() => setCooldown(null)} />}
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
      </Suspense>
    </>
  )
}

/** Bandeau de section : n° d'étape, titre, compteur. */
function SectionHeader({ n, title, sub, bg, done, total, action, tour }: { n: number | null; title: string; sub: string; bg: string; done: number; total: number; action?: ReactNode; tour?: string }) {
  return (
    <div
      data-tour={tour}
      className={`mb-4 flex items-center gap-3 rounded-full border-2 border-ink ${bg} py-1.5 pl-1.5 pr-4 shadow-[0_4px_0_var(--color-shadow)] outline-[1.5px] outline-dashed -outline-offset-[6px] outline-[#2a1d3d]/45`}
    >
      {n && <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-ink bg-[#fff7ea] font-display text-[17px]">{n}</span>}
      <span className="min-w-0 flex-1 py-0.5">
        <span className="block font-display text-[19px] leading-tight">{title}</span>
        <span className="block text-[12px] font-bold">{sub}</span>
      </span>
      <span className="text-[14px] font-black tabular-nums">
        {done}/{total}
      </span>
      {action}
    </div>
  )
}
