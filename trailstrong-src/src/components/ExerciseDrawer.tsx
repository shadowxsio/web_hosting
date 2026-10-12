import { Check, Footprints, Mountain, Play, Plus, ShieldCheck, Trash2, Trophy, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Exercise, SessionId } from '../data/program'
import { removeCustom } from '../lib/custom'
import { touch, treadmillStats, type ExerciseLog } from '../lib/storage'
import { timer } from '../lib/timer'
import { num, useExerciseLog } from '../lib/useExerciseLog'
import { DIR_META, Pill, SESSION_META, ZONE_META, categoryOf, iconOf, restLabel } from './meta'

/** Tiroir de détail : bas de l'écran sur mobile, à droite sur desktop. */
export function ExerciseDrawer({ ex, sessionId, date, onClose }: { ex: Exercise; sessionId: SessionId; date: string; onClose: () => void }) {
  const L = useExerciseLog(ex, date)
  const [sel, setSel] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const tid = ex.trackId ?? ex.id
  const Icon = iconOf(ex)
  const s = SESSION_META[sessionId]
  const cur = sel ?? (L.firstTodo === -1 ? L.sets.length - 1 : L.firstTodo)
  const curSet = L.sets[cur]
  const tipKind = ex.tags.find((t) => t === 'knee' || t === 'ankle') ?? 'knee'

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
      <button type="button" aria-label="Fermer" onClick={onClose} className="fade-in absolute inset-0 bg-ink/40" />
      <aside
        role="dialog"
        aria-label={ex.name}
        className="sheet pb-safe relative flex max-h-[92dvh] w-full max-w-xl flex-col border-[2.5px] border-b-0 border-ink bg-paper-2 md:max-h-none md:w-[460px] md:border-b-[2.5px] md:border-r-0"
      >
        {/* Poignée + en-tête */}
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-ink/30 md:hidden" />
        <header className="hero flex items-start gap-3 !border-t-0 px-4 pb-4 pt-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-[2.5px] border-ink bg-paper shadow-[2px_2px_0_var(--color-shadow)]">
            <Icon className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <div className="min-w-0 flex-1">
            <p className={`tag h-6 px-2 text-[10px] ${s.bg}`}>
              {s.label} · {categoryOf(ex)}
            </p>
            <h2 className="headline mt-2 text-[24px] [text-shadow:2px_2px_0_#f0773a]">{ex.name}</h2>
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

          {/* Saisie */}
          <section>
            <h3 className="label mb-2">Suivi du jour</h3>
            {ex.mode === 'treadmill' ? (
              <TreadmillTracker log={L.log} write={L.write} done={L.done} />
            ) : (
              <>
                <div className="no-scrollbar mb-3 flex gap-1.5 overflow-x-auto">
                  {L.sets.map((x, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSel(i)}
                      className={`flex h-9 shrink-0 items-center gap-1 border-2 px-2.5 font-mono text-[11px] transition duration-150 ${
                        i === cur
                          ? 'border-ink bg-sun text-ink'
                          : x.done
                            ? 'border-ink bg-mint text-ink'
                            : 'border-ink bg-paper text-ink/60'
                      }`}
                    >
                      {x.done && <Check className="h-3 w-3" strokeWidth={3} />}S{i + 1}
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
                    className="grid h-9 w-9 shrink-0 place-items-center border-2 border-dashed border-ink/50 text-ink/60"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Stepper
                    id={`log-${tid}-weight`}
                    label="Poids · lbs"
                    value={curSet.w}
                    placeholder={L.hintW(cur) || (ex.bodyweight ? 'PDC' : '0')}
                    step={5}
                    decimal
                    done={curSet.done}
                    onChange={(v) => L.setField(cur, 'w', v)}
                  />
                  <Stepper
                    id={`log-${tid}-reps`}
                    label={ex.mode === 'timed' ? 'Durée · s' : ex.perSide ? 'Reps · /côté' : 'Reps'}
                    value={curSet.r}
                    placeholder={L.hintR(cur)}
                    step={ex.mode === 'timed' ? 5 : 1}
                    done={curSet.done}
                    onChange={(v) => L.setField(cur, 'r', v)}
                  />
                </div>
              </>
            )}
            <textarea
              id={`log-${tid}-note`}
              value={L.log.note ?? ''}
              onChange={(e) => L.write((l) => ({ ...l, sets: l.sets.length ? l.sets : L.sets, note: e.target.value }))}
              placeholder="Notes · sensations genou / cheville, réglage machine…"
              rows={2}
              className="mt-2 w-full resize-none border-2 border-ink bg-paper px-3 py-2 text-[13px] text-ink placeholder:text-ink/40 focus:shadow-[3px_3px_0_#f0773a] focus:outline-none"
            />
          </section>

          {/* Points d'attention : zone colorée + direction du mouvement */}
          {ex.points && ex.points.length > 0 && (
            <section>
              <h3 className="label mb-2">Points d’attention</h3>
              <ol className="divide-y divide-ink/25 overflow-hidden border-2 border-ink bg-paper">
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
              <h3 className="label mb-2">Exécution</h3>
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

          {ex.custom && (
            <div className="flex items-center justify-between border-2 border-ink px-3 py-2 text-[12px] text-ink/60">
              {confirmDelete ? (
                <>
                  <span>Supprimer cet exercice personnalisé ?</span>
                  <span className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        removeCustom(sessionId, ex.id)
                        touch()
                        onClose()
                      }}
                      className="h-9 border-2 border-ink bg-rose px-3 font-black text-ink"
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
                  <span>Exercice ajouté à la main</span>
                  <button type="button" onClick={() => setConfirmDelete(true)} className="flex h-9 items-center gap-1.5 px-2 text-ink/70 hover:text-danger">
                    <Trash2 className="h-4 w-4" /> Supprimer
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Action principale */}
        {ex.mode !== 'treadmill' && (
          <footer className="flex gap-2 border-t-[2.5px] border-ink p-3">
            {ex.mode === 'timed' && (
              <button
                type="button"
                onClick={() => timer.start(num(curSet.r || L.hintR(cur)) || 45)}
                aria-label="Lancer le chrono de travail"
                className="grid h-12 w-12 shrink-0 place-items-center border-2 border-ink bg-paper text-ink active:scale-95"
              >
                <Play className="h-4 w-4" fill="currentColor" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                L.validate(cur)
                setSel(null)
              }}
              className={`flex h-12 flex-1 items-center justify-center gap-2 text-[14px] font-bold transition duration-150 active:scale-[0.98] ${
                curSet.done ? 'b-btn' : 'b-btn bg-flame'
              }`}
            >
              <Check className="h-5 w-5" strokeWidth={3} />
              {curSet.done ? `Annuler la série ${cur + 1}` : `Valider la série ${cur + 1}/${L.sets.length}`}
            </button>
          </footer>
        )}
      </aside>
    </div>,
    document.body,
  )
}

function Callout({ tone, title, children }: { tone: 'orange' | 'cyan'; title: string; children: ReactNode }) {
  const c = tone === 'orange' ? 'border-l-flame text-flame' : 'border-l-sky text-ocean'
  return (
    <div className={` border-2 border-ink border-l-[6px] ${c.split(' ')[0]} bg-paper px-3 py-2.5`}>
      <p className={`mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${c.split(' ')[1]}`}>
        {tone === 'cyan' && <ShieldCheck className="h-3.5 w-3.5" />}
        {title}
      </p>
      <p className="text-[13px] leading-snug text-ink/85">{children}</p>
    </div>
  )
}

/** Champ numérique compact −/+ (cibles tactiles ≥ 44 px). */
function Stepper({
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
    navigator.vibrate?.(5)
    onChange(String(Math.max(0, Math.round((base + d) * 10) / 10)))
  }
  const btn = `grid h-full ${compact ? 'w-8' : 'w-11'} shrink-0 place-items-center text-lg text-ink/70 active:text-flame`
  return (
    <div>
      <p className="label mb-1">{label}</p>
      <div
        className={`flex h-12 items-center border-2 transition-colors duration-150 ${
          done ? 'border-ink bg-mint/60' : 'border-ink bg-paper focus-within:shadow-[3px_3px_0_#f0773a]'
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
        <div className="border-2 border-ink bg-paper px-3 py-2">
          <p className="label flex items-center gap-1">
            <Mountain className="h-3 w-3 text-flame" /> D+ {filled ? '' : 'prévu'}
          </p>
          <p className="font-mono text-xl font-bold text-ink">{stats ? `${stats.dplus} m` : '—'}</p>
        </div>
        <div className="border-2 border-ink bg-paper px-3 py-2">
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
            className="flex h-12 flex-1 items-center justify-center gap-1.5 border-2 border-ink bg-paper font-mono text-[13px] font-bold text-ink active:scale-95"
          >
            <Play className="h-3.5 w-3.5" fill="currentColor" /> {m}′
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            navigator.vibrate?.(done ? 10 : [20, 30, 40])
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
