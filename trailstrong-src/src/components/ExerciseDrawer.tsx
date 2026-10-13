import { AudioLines, Check, Footprints, Mountain, Play, Plus, ShieldCheck, Trash2, Trophy, X } from 'lucide-react'
import { Suspense, lazy, startTransition, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cadenceOf, repSeconds } from '../data/cadence'
import type { Exercise, SessionId } from '../data/program'
import { removeCustom, useProgram } from '../lib/custom'
import { touch, treadmillStats, type ExerciseLog, type Side } from '../lib/storage'
import { removeFromSession } from '../lib/userProgram'
import { unlockAudio } from '../lib/sound'
import { timer } from '../lib/timer'
import { SIDE_LABEL, num, useExerciseLog } from '../lib/useExerciseLog'
import { DemoPlayer } from './DemoPlayer'
import { DIAGRAM_OF, ExerciseDiagram } from './ExerciseDiagram'
import { DIR_META, Pill, SESSION_META, ZONE_META, categoryOf, iconOf, restLabel } from './meta'
import { haptic } from '../lib/haptics'
import { useSheet } from '../lib/useSheet'

const SetCoach = lazy(() => import('./SetCoach').then((m) => ({ default: m.SetCoach })))

/** Tiroir de détail : bas de l'écran sur mobile, à droite sur desktop. */
export function ExerciseDrawer({ ex, sessionId, date, onClose: closeNow }: { ex: Exercise; sessionId: SessionId; date: string; onClose: () => void }) {
  const sheet = useSheet<HTMLElement>(closeNow)
  const onClose = sheet.close
  const L = useExerciseLog(ex, date)
  const [sel, setSel] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Le bas de la fiche (photos, consignes…) est rendu après l'animation d'ouverture : le tiroir glisse sans à-coup.
  const [full, setFull] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => startTransition(() => setFull(true)), 240)
    return () => window.clearTimeout(id)
  }, [])
  // Un exercice du programme peut être retiré, tant qu'il en reste au moins un dans la séance.
  const sessionSize = useProgram().find((x) => x.id === sessionId)?.exercises.length ?? 0
  const canRemove = !ex.custom && sessionSize > 1
  const tid = ex.trackId ?? ex.id
  const Icon = iconOf(ex)
  const s = SESSION_META[sessionId]
  const cur = sel ?? (L.firstTodo === -1 ? L.sets.length - 1 : L.firstTodo)
  const curSet = L.sets[cur]
  // Unilatéral : côté courant = premier côté non validé (le plus faible d'abord).
  const [selSide, setSelSide] = useState<Side | null>(null)
  const uni = !!ex.perSide && ex.mode !== 'treadmill'
  const curSide: Side = selSide ?? L.sideOrder.find((sd) => !L.sideOf(cur, sd).done) ?? L.sideOrder[1]
  const curSideLog = L.sideOf(cur, curSide)
  const fieldVal = (f: 'w' | 'r') => (uni ? curSideLog[f] : curSet[f])
  const fieldDone = uni ? curSideLog.done : curSet.done
  const tipKind = ex.tags.find((t) => t === 'knee' || t === 'ankle') ?? 'knee'

  const diagram = ex.diagram ?? DIAGRAM_OF[ex.id]

  // ── Coach sonore ──
  const cadence = cadenceOf(ex)
  const canCoach = ex.mode !== 'treadmill' && !fieldDone
  const [coach, setCoach] = useState<{ set: number; sides: (Side | null)[]; goals: number[]; rest: number } | null>(null)
  const targetOf = (i: number, sd: Side | null) =>
    num(sd ? L.sideOf(i, sd).r || L.hintSideR(i, sd) : L.sets[i].r || L.hintR(i)) || ex.defaultReps || (ex.mode === 'timed' ? 30 : 10)
  const openCoach = () => {
    unlockAudio()
    const sides = uni ? [curSide, ...L.sideOrder.filter((sd) => sd !== curSide && !L.sideOf(cur, sd).done)] : [null]
    const isLast = L.sets.filter((x) => x.done).length + 1 >= L.sets.length
    // 2e jambe : mêmes reps que la 1re, sauf valeur saisie pour elle.
    const first = targetOf(cur, sides[0])
    const goals = sides.map((sd, k) => (k === 0 || !sd ? first : num(L.sideOf(cur, sd).r) || first))
    setCoach({ set: cur, sides, goals, rest: isLast ? 0 : ex.rest })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-stretch md:justify-end" data-noswipe>
      <button type="button" aria-label="Fermer" onClick={onClose} className={`${sheet.backdrop} absolute inset-0`} />
      <aside
        role="dialog"
        aria-label={ex.name}
        ref={sheet.ref} className={`${sheet.panel} pb-safe relative flex max-h-[92dvh] w-full max-w-xl flex-col border-[2.5px] border-b-0 border-ink bg-paper-2 md:max-h-none md:w-[460px] md:border-b-[2.5px] md:border-r-0 rounded-t-[26px] md:rounded-none md:rounded-l-[26px]`}
      >
        {/* Poignée + en-tête */}
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-ink/30 md:hidden" />
        <header className="hero flex items-start gap-3 !border-t-0 px-4 pb-4 pt-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-[2.5px] border-ink bg-paper shadow-[0_2px_0_var(--color-shadow)]">
            <Icon className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <div className="min-w-0 flex-1">
            <p className={`tag h-6 px-2 text-[10px] ${s.bg}`}>
              {s.label} · {categoryOf(ex)}
            </p>
            <h2 className="headline mt-2 text-[24px]">{ex.name}</h2>
            {ex.equipment && <p className="mt-1.5 text-[13px] font-bold text-ink">Matériel ÉconoFitness : {ex.equipment}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="b-btn grid h-10 w-10 shrink-0 place-items-center rounded-full">
            <X className="h-5 w-5" strokeWidth={3} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="flex flex-wrap gap-1.5">
            <Pill tone="sun">{ex.sets > 1 ? `${ex.sets} séries` : '1 bloc'}</Pill>
            <Pill>{ex.reps}</Pill>
            {ex.rest > 0 && <Pill>Repos {restLabel(ex.rest)}</Pill>}
            {ex.tempo && <Pill tone="sky">{ex.tempo}</Pill>}
          </div>

          {/* Schéma d'exécution (comme la maquette) */}
          {diagram && (
            <section className="diagram-bg overflow-hidden border-[2.5px] border-ink shadow-[0_4px_0_var(--color-shadow)] rounded-xl">
              <div className="mx-auto aspect-[5/4] w-full max-w-[340px]">
                <ExerciseDiagram id={diagram} />
              </div>
              <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t-2 border-ink bg-paper px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-wide">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-4 border-t-2 border-dashed border-ink/60" /> départ
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-4 border-t-[3px] border-ink" /> fin
                </span>
                <span className="flex items-center gap-1 text-flame">➜ hanche / tronc</span>
                <span className="flex items-center gap-1 text-ocean">➜ genou / cheville</span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-3 border border-ink bg-ocean rounded-xl" /> muscle ciblé
                </span>
              </p>
            </section>
          )}

          {/* Saisie */}
          <section>
            <h3 className="label mb-2">Suivi du jour</h3>
            {L.suggestion && (
              <p className={`mb-3 border-2 border-ink px-3 py-2 text-[13px] font-bold leading-snug rounded-xl ${L.suggestion.kind === 'up' ? 'bg-mint' : 'bg-sun'}`}>
                {L.suggestion.kind === 'up' ? '💡 ' : '✋ '}
                {L.suggestion.text}
              </p>
            )}
            {ex.mode === 'treadmill' ? (
              <TreadmillTracker log={L.log} write={L.write} done={L.done} />
            ) : (
              <>
                <div className="no-scrollbar mb-3 flex gap-1.5 overflow-x-auto">
                  {L.sets.map((x, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSel(i)
                        setSelSide(null)
                      }}
                      className={`flex h-9 shrink-0 items-center gap-1 border-2 px-2.5 font-mono text-[11px] transition duration-150 ${
                        i === cur
                          ? 'border-ink bg-sun text-ink'
                          : x.done
                            ? 'border-ink bg-mint text-ink'
                            : 'border-ink bg-paper text-ink/60'
                      }`}
                    >
                      {x.done && <Check className="h-3 w-3" strokeWidth={3} />}S{i + 1}
                      {uni && !x.done && (x.L?.done || x.R?.done) && (
                        <span className="text-[10px] font-black">{x.L?.done ? 'G✓' : 'D✓'}</span>
                      )}
                      {x.done && (x.w || x.r) && (
                        <span className="text-ink/70">
                          {x.w ? `${x.w}×` : ''}
                          {x.r}
                        </span>
                      )}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      L.addSet()
                      setSel(L.sets.length)
                    }}
                    aria-label="Ajouter une série"
                    className="grid h-9 w-9 shrink-0 place-items-center border-2 border-dashed border-ink/50 text-ink/60 rounded-xl"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                {uni && (
                  <>
                    <p className="mb-2 border-2 border-dashed border-ink/50 px-3 py-2 text-[12px] font-bold leading-snug rounded-xl">
                      {L.asym ? (
                        <>
                          Dernière fois : {L.asym.pct === 0 ? 'équilibre parfait' : `${L.asym.pct > 0 ? 'droite' : 'gauche'} +${Math.abs(L.asym.pct)} %`} → commence par la{' '}
                          <span className="text-flame">{SIDE_LABEL[L.sideOrder[0]]}</span>.
                        </>
                      ) : (
                        <>Unilatéral : fais la jambe gauche, puis la droite. Un décompte de 10 s te dit quand changer.</>
                      )}
                    </p>
                    <div className="mb-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Jambe">
                      {L.sideOrder.map((sd, k) => {
                        const sl = L.sideOf(cur, sd)
                        const active = sd === curSide
                        return (
                          <button
                            key={sd}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setSelSide(sd)}
                            className={`b-btn flex h-11 items-center justify-center gap-1.5 text-[13px] uppercase tracking-wide ${
                              sl.done ? 'bg-mint' : active ? 'b-btn-ink' : ''
                            }`}
                          >
                            <span className="font-black not-italic">{k + 1}</span>
                            Jambe {SIDE_LABEL[sd]}
                            {sl.done && <Check className="h-4 w-4" strokeWidth={3} />}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Stepper
                    id={`log-${tid}-weight`}
                    label="Poids · lbs"
                    value={fieldVal('w')}
                    placeholder={(uni ? L.hintSideW(cur, curSide) : L.hintW(cur)) || (ex.bodyweight ? 'PDC' : '0')}
                    step={5}
                    decimal
                    done={fieldDone}
                    onChange={(v) => (uni ? L.setSideField(cur, curSide, 'w', v) : L.setField(cur, 'w', v))}
                  />
                  <Stepper
                    id={`log-${tid}-reps`}
                    label={`${ex.mode === 'timed' ? 'Durée · s' : 'Reps'}${uni ? ` · ${SIDE_LABEL[curSide]}` : ''}`}
                    value={fieldVal('r')}
                    placeholder={uni ? L.hintSideR(cur, curSide) : L.hintR(cur)}
                    step={ex.mode === 'timed' ? 5 : 1}
                    done={fieldDone}
                    onChange={(v) => (uni ? L.setSideField(cur, curSide, 'r', v) : L.setField(cur, 'r', v))}
                  />
                </div>
                <p className="mt-2 flex items-start gap-2 border-2 border-dashed border-ink/50 px-3 py-2 text-[12px] font-bold leading-snug rounded-xl">
                  <AudioLines className="mt-0.5 h-4 w-4 shrink-0 text-flame" strokeWidth={2.5} />
                  <span>
                    {cadence ? (
                      <>
                        Tempo coach : {cadence.map((p) => `${p.label} ${p.s} s`).join(' → ')}
                        <span className="text-ink/60"> · ≈ {Math.round(repSeconds(cadence) * targetOf(cur, uni ? curSide : null))} s la série</span>
                      </>
                    ) : (
                      <>Coach : 3-2-1, chrono de maintien et bips des 3 dernières secondes.</>
                    )}
                  </span>
                </p>
              </>
            )}
            <textarea
              id={`log-${tid}-note`}
              value={L.log.note ?? ''}
              onChange={(e) => L.write((l) => ({ ...l, sets: l.sets.length ? l.sets : L.sets, note: e.target.value }))}
              placeholder="Notes · sensations genou / cheville, réglage machine…"
              rows={2}
              className="mt-2 w-full resize-none border-2 border-ink bg-paper px-3 py-2 text-[13px] text-ink placeholder:text-ink/40 focus:shadow-[0_3px_0_var(--color-flame)] focus:outline-none rounded-xl"
            />
          </section>

          {full && (
            <>
              <DemoPlayer ex={ex} />

              {/* Points d'attention : zone colorée + direction du mouvement */}
              {ex.points && ex.points.length > 0 && (
                <section>
                  <h3 className="label mb-2">Points d’attention</h3>
                  <ol className="divide-y divide-ink/25 overflow-hidden border-2 border-ink bg-paper rounded-xl">
                    {ex.points.map((p, i) => {
                      const D = DIR_META[p.dir]
                      return (
                        <li key={i} className="flex items-center gap-3 px-3 py-2.5">
                          <span className="w-4 font-mono text-[11px] text-ink/45">{i + 1}</span>
                          <span className={`inline-flex h-6 w-[74px] shrink-0 items-center justify-center gap-1 border-2 text-[11px] font-medium ${ZONE_META[p.zone].cls}`}>
                            <D.icon className="h-3 w-3" aria-label={D.label} />
                            {ZONE_META[p.zone].label}
                          </span>
                          <span className="text-[13px] leading-snug text-ink/85">{p.text}</span>
                        </li>
                      )
                    })}
                  </ol>
                </section>
              )}

              {ex.steps.length > 0 && (
                <section>
                  <h3 className="label mb-2">Exécution{ex.stepsLang === 'en' && ' · en anglais (catalogue)'}</h3>
                  <ol className="space-y-2">
                    {ex.steps.map((step, i) => (
                      <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-ink/85">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-ink font-mono text-[10px] text-ink/60">{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {ex.cue && (
                <Callout tone="orange" title={ex.custom ? 'Consigne' : 'Cue'}>
                  {ex.cue}
                </Callout>
              )}
              {ex.kneeAnkle && (
                <Callout tone="cyan" title={tipKind === 'ankle' ? 'Protection cheville' : 'Protection genou'}>
                  {ex.kneeAnkle}
                </Callout>
              )}

              {(L.pr > 0 || L.newPr) && (
                <p className="flex items-center gap-1.5 text-[12px] text-ink/70">
                  <Trophy className="h-3.5 w-3.5 text-flame" /> Record : <span className="font-mono text-ink">{L.pr} lbs</span>
                  {L.newPr && <span className="font-bold text-leaf">· nouveau record</span>}
                </p>
              )}

              {ex.source === 'catalog' && (
                <p className="rounded-xl border-2 border-dashed border-ink/50 px-3 py-2 text-[12px] font-semibold leading-snug text-ink/75">
                  Fiche simplifiée (catalogue) : schéma approchant, tempo standard, pas de conseils genou / cheville{ex.stepsLang === 'en' ? ', consignes en anglais' : ''}. Pour une fiche complète, choisis un exercice de l’onglet Bibliothèque.
                </p>
              )}

              {(ex.custom || canRemove) && (
                <div className="flex items-center justify-between border-2 border-ink px-3 py-2 text-[12px] text-ink/60 rounded-xl">
                  {confirmDelete ? (
                    <>
                      <span>{ex.custom ? 'Supprimer cet exercice personnalisé ?' : 'Retirer de la séance ? Ton historique est gardé.'}</span>
                      <span className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (ex.custom) removeCustom(sessionId, ex.id)
                            else removeFromSession(sessionId, ex.id)
                            touch()
                            onClose()
                          }}
                          className="h-9 border-2 border-ink bg-rose px-3 font-black text-ink rounded-xl"
                        >
                          Oui
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(false)} className="h-9 bg-paper px-3 text-ink/85">
                          Non
                        </button>
                      </span>
                    </>
                  ) : (
                    <>
                      <span>{ex.custom ? (ex.source === 'catalog' ? 'Ajouté depuis le catalogue' : 'Exercice ajouté à la main') : 'Exercice de ton programme'}</span>
                      <button type="button" onClick={() => setConfirmDelete(true)} className="flex h-9 items-center gap-1.5 px-2 text-ink/70 hover:text-danger">
                        <Trash2 className="h-4 w-4" /> {ex.custom ? 'Supprimer' : 'Retirer'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Action principale */}
        {ex.mode !== 'treadmill' && (
          <footer className="flex gap-2 border-t-[2.5px] border-ink p-3">
            <button
              type="button"
              onClick={openCoach}
              disabled={!canCoach}
              aria-label="Lancer le coach sonore de la série"
              className="b-btn flex h-12 shrink-0 items-center gap-1.5 bg-sun px-3 text-[13px] uppercase tracking-wide disabled:opacity-40"
            >
              <Play className="h-4 w-4" fill="currentColor" /> Coach
            </button>
            <button
              type="button"
              onClick={() => {
                if (uni) L.validateSide(cur, curSide)
                else L.validate(cur)
                setSel(null)
                setSelSide(null)
              }}
              className={`flex h-12 flex-1 items-center justify-center gap-2 text-[14px] font-bold transition duration-150 active:scale-[0.98] ${
                fieldDone ? 'b-btn' : 'b-btn bg-flame'
              }`}
            >
              <Check className="h-5 w-5" strokeWidth={3} />
              {uni
                ? fieldDone
                  ? `Annuler S${cur + 1} · ${SIDE_LABEL[curSide]}`
                  : `Valider S${cur + 1}/${L.sets.length} · jambe ${SIDE_LABEL[curSide]}`
                : curSet.done
                  ? `Annuler la série ${cur + 1}`
                  : `Valider la série ${cur + 1}/${L.sets.length}`}
            </button>
          </footer>
        )}
      </aside>
      {coach && (
        <Suspense fallback={null}>
          <SetCoach
            name={ex.name}
            cadence={cadence}
            sides={coach.sides}
            target={(sd) => coach.goals[coach.sides.indexOf(sd)] ?? targetOf(coach.set, sd)}
            setLabel={`Série ${coach.set + 1} sur ${L.sets.length}`}
            rest={coach.rest}
            onSideDone={(sd, done) => {
              if (sd) L.validateSide(coach.set, sd, String(done))
              else L.validate(coach.set, String(done))
              setSel(null)
              setSelSide(null)
            }}
            onClose={() => setCoach(null)}
          />
        </Suspense>
      )}
    </div>,
    document.body,
  )
}

function Callout({ tone, title, children }: { tone: 'orange' | 'cyan'; title: string; children: ReactNode }) {
  const c = tone === 'orange' ? 'border-l-flame text-flame' : 'border-l-sky text-ocean'
  return (
    <div className={` border-2 border-ink border-l-[6px] rounded-xl ${c.split(' ')[0]} bg-paper px-3 py-2.5`}>
      <p className={`mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${c.split(' ')[1]}`}>
        {tone === 'cyan' && <ShieldCheck className="h-3.5 w-3.5" />}
        {title}
      </p>
      <p className="text-[13px] leading-snug text-ink/85">{children}</p>
    </div>
  )
}

/** Champ numérique compact −/+ (cibles tactiles ≥ 44 px). */
export function Stepper({
  id,
  label,
  value,
  placeholder,
  step,
  onChange,
  decimal,
  done,
  compact,
}: {
  id?: string
  label: string
  value: string
  placeholder: string
  step: number
  onChange: (v: string) => void
  decimal?: boolean
  done?: boolean
  compact?: boolean
}) {
  const base = value !== '' ? num(value) : num(placeholder)
  const bump = (d: number) => {
    haptic(5)
    onChange(String(Math.max(0, Math.round((base + d) * 10) / 10)))
  }
  const btn = `grid h-full ${compact ? 'w-8' : 'w-11'} shrink-0 place-items-center text-lg text-ink/70 active:text-flame`
  return (
    <div>
      <p className="label mb-1">{label}</p>
      <div
        className={`flex h-12 items-center border-2 transition-colors duration-150 ${
          done ? 'border-leaf bg-leaf/15' : 'border-ink bg-paper focus-within:shadow-[0_3px_0_var(--color-flame)]'
        }`}
      >
        <button type="button" onClick={() => bump(-step)} aria-label={`${label} moins ${step}`} className={btn}>
          −
        </button>
        <input
          id={id}
          inputMode={decimal ? 'decimal' : 'numeric'}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value.replace(decimal ? /[^\d.,]/g : /[^\d]/g, ''))}
          aria-label={label}
          className={`h-full w-full min-w-0 bg-transparent text-center font-mono ${compact ? 'text-base' : 'text-lg'} font-bold text-ink placeholder:text-ink/40 focus:outline-none`}
        />
        <button type="button" onClick={() => bump(step)} aria-label={`${label} plus ${step}`} className={btn}>
          +
        </button>
      </div>
    </div>
  )
}

function TreadmillTracker({ log, write, done }: { log: ExerciseLog; write: (fn: (l: ExerciseLog) => ExerciseLog) => void; done: boolean }) {
  const t = log.treadmill ?? { minutes: '', incline: '', speed: '' }
  const filled = treadmillStats(t)
  const stats = treadmillStats({ minutes: t.minutes || '40', incline: t.incline || '15', speed: t.speed || '5' })
  const set = (k: keyof typeof t, v: string) => write((l) => ({ ...l, treadmill: { ...t, [k]: v } }))
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <Stepper label="Durée · min" value={t.minutes} placeholder="40" step={5} onChange={(v) => set('minutes', v)} compact done={done} />
        <Stepper label="Pente · %" value={t.incline} placeholder="15" step={1} onChange={(v) => set('incline', v)} compact done={done} />
        <Stepper label="km/h" value={t.speed} placeholder="5" step={0.1} decimal onChange={(v) => set('speed', v)} compact done={done} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="border-2 border-ink bg-paper px-3 py-2 rounded-xl">
          <p className="label flex items-center gap-1">
            <Mountain className="h-3 w-3 text-flame" /> D+ {filled ? '' : 'prévu'}
          </p>
          <p className="font-mono text-xl font-bold text-ink">{stats ? `${stats.dplus} m` : '—'}</p>
        </div>
        <div className="border-2 border-ink bg-paper px-3 py-2 rounded-xl">
          <p className="label flex items-center gap-1">
            <Footprints className="h-3 w-3 text-ocean" /> Distance
          </p>
          <p className="font-mono text-xl font-bold text-ink">{stats ? `${stats.km.toFixed(2)} km` : '—'}</p>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        {[30, 45].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => timer.start(m * 60)}
            className="flex h-12 flex-1 items-center justify-center gap-1.5 border-2 border-ink bg-paper font-mono text-[13px] font-bold text-ink active:scale-95 rounded-xl"
          >
            <Play className="h-3.5 w-3.5" fill="currentColor" /> {m}′
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            haptic(done ? 10 : [20, 30, 40])
            write((l) => ({ ...l, done: !done }))
          }}
          className={`flex h-12 flex-[1.4] items-center justify-center gap-1.5 text-sm font-bold transition duration-150 active:scale-95 ${
            done ? 'border-2 border-ink bg-mint text-ink' : 'bg-flame text-ink'
          }`}
        >
          <Check className="h-4 w-4" strokeWidth={3} /> {done ? 'Fait' : 'Terminer'}
        </button>
      </div>
    </div>
  )
}
