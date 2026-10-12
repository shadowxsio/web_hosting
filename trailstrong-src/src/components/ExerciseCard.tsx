import { Check, Footprints, Trash2, ChevronDown, Dumbbell, Gauge, Layers, Mountain, Play, Plus, Repeat, Timer, Trophy, Zap } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { Exercise, FocusTag, SessionId } from '../data/program'
import { removeCustom } from '../lib/custom'
import { previousBest, touch, treadmillStats, updateExercise, useData, type ExerciseLog, type SetLog } from '../lib/storage'
import { timer } from '../lib/timer'
import { FigurePlayer } from './FigurePlayer'

const restLabel = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m${s % 60 ? String(s % 60).padStart(2, '0') : ''}` : `${s}s`)

export const TAG_META: Record<FocusTag, { label: string; emoji: string; cls: string }> = {
  knee: { label: 'Genou', emoji: '🩹', cls: 'bg-glacier/10 text-cyan-300' },
  ankle: { label: 'Cheville', emoji: '⚓', cls: 'bg-iris/10 text-violet-300' },
  glutes: { label: 'Fessiers', emoji: '🍑', cls: 'bg-ember/10 text-orange-300' },
}

function emptySets(n: number): SetLog[] {
  return Array.from({ length: n }, () => ({ w: '', r: '', done: false }))
}

const num = (s: string) => {
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function ExerciseCard({
  ex,
  index,
  date,
  sessionId,
  defaultOpen = false,
}: {
  ex: Exercise
  index: number
  date: string
  sessionId?: SessionId
  defaultOpen?: boolean
}) {
  const data = useData()
  const log: ExerciseLog = data.logs[date]?.[ex.id] ?? { sets: [] }
  const sets = log.sets.length >= ex.sets ? log.sets : [...log.sets, ...emptySets(ex.sets - log.sets.length)]
  const { last, pr, lastLog, newPr } = previousBest(data, ex.id, date)
  const [open, setOpen] = useState(defaultOpen)
  const [mounted, setMounted] = useState(defaultOpen)
  const [sel, setSel] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // IDs DOM de suivi : check-{tid}, log-{tid}-weight, log-{tid}-note.
  const tid = ex.trackId ?? ex.id
  const done = !!log.done

  const write = (fn: (l: ExerciseLog) => ExerciseLog) => updateExercise(date, ex.id, fn)

  // Valeur suggérée : série précédente du jour, sinon même série la dernière fois.
  const hintW = (i: number) => (i > 0 && sets[i - 1].w) || lastLog?.sets[i]?.w || ex.startWeight || ''
  const hintR = (i: number) => (i > 0 && sets[i - 1].r) || lastLog?.sets[i]?.r || String(ex.defaultReps ?? '')

  const setField = (i: number, field: 'w' | 'r', value: string) =>
    write((l) => {
      const next = l.sets.length >= sets.length ? [...l.sets] : [...sets]
      next[i] = { ...next[i], [field]: value }
      return { ...l, sets: next }
    })

  const validate = (i: number) => {
    const s = sets[i]
    const willBeDone = !s.done
    write((l) => {
      const next = l.sets.length >= sets.length ? [...l.sets] : [...sets]
      // ✓ sans saisie = « comme suggéré » (série précédente / dernière séance).
      const w = s.w || (willBeDone ? hintW(i) : s.w)
      const r = s.r || (willBeDone ? hintR(i) : s.r)
      next[i] = { w, r, done: willBeDone, at: willBeDone ? Date.now() : undefined }
      const allDone = next.every((x) => x.done)
      return { ...l, sets: next, done: allDone ? true : l.done && willBeDone }
    })
    setSel(null)
    if (willBeDone) {
      navigator.vibrate?.(30)
      const isLast = sets.filter((x) => x.done).length + 1 >= sets.length
      if (ex.rest > 0 && !isLast) timer.start(ex.rest)
    }
  }

  const addSet = () => {
    write((l) => ({ ...l, sets: [...sets, { w: '', r: '', done: false }], done: false }))
    setSel(sets.length)
  }
  const toggleDone = () => {
    navigator.vibrate?.(done ? 10 : [20, 30, 40])
    write((l) => ({ ...l, sets: l.sets.length ? l.sets : sets, done: !done }))
    if (!done) setOpen(false)
  }
  const toggleOpen = () => {
    setMounted(true)
    setOpen((o) => !o)
  }

  const doneSets = sets.filter((s) => s.done)
  const firstTodo = sets.findIndex((s) => !s.done)
  const cur = sel ?? (firstTodo === -1 ? sets.length - 1 : firstTodo)
  const curSet = sets[cur]
  const unit = ex.mode === 'timed' ? 's' : 'reps'
  const maxToday = Math.max(0, ...doneSets.map((s) => num(s.w)))
  const primary = ex.tags[0]
  const tipKind: 'knee' | 'ankle' = ex.tags.find((t): t is 'knee' | 'ankle' => t === 'knee' || t === 'ankle') ?? 'knee'

  const prevLabel =
    ex.mode === 'treadmill'
      ? null
      : last && last.maxW > 0
        ? `Préc. ${last.maxW} lbs`
        : last && lastLog
          ? `Préc. ${lastLog.sets.filter((x) => x.done).length}×${Math.max(...lastLog.sets.filter((x) => x.done).map((x) => num(x.r)))} ${unit}`
          : null

  return (
    <article
      className={`card fade-up overflow-hidden transition-[opacity,border-color,box-shadow] duration-200 ${
        done ? '!border-moss/35 opacity-75' : open ? 'ring-gradient shadow-[0_8px_30px_-12px_rgba(249,115,22,0.25)]' : ''
      }`}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* ── Ligne d'aperçu (fermée) ── */}
      <div className="flex min-h-[60px] items-center gap-2 pl-3 pr-1.5">
        <button type="button" onClick={toggleOpen} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left">
          <span className={`font-mono text-[11px] font-semibold ${done ? 'text-moss' : 'text-slate-600'}`}>{String(index + 1).padStart(2, '0')}</span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate text-[14px] font-semibold tracking-tight ${done ? 'text-slate-300' : 'text-fg'}`}>{ex.name}</span>
            <span className="mt-1 flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-[11px] text-muted">
              {ex.badge ? (
                <span className="max-w-[110px] truncate rounded-md bg-ember/10 px-1.5 py-px text-[10px] font-medium text-orange-300">✦ {ex.badge}</span>
              ) : primary ? (
                <span className={`rounded-md px-1.5 py-px text-[10px] font-medium ${TAG_META[primary].cls}`}>
                  {TAG_META[primary].emoji} {TAG_META[primary].label}
                </span>
              ) : null}
              {done ? (
                <span className="fade-up truncate font-medium text-emerald-400">
                  ✓ Complété
                  {doneSets.length > 0 ? ` · ${doneSets.length}/${sets.length} séries` : ''}
                  {maxToday > 0 ? ` · ${maxToday} lbs` : ''}
                </span>
              ) : (
                <>
                  <span className="font-mono text-[10px] text-slate-500">
                    {ex.sets > 1 ? `${ex.sets}×` : ''}
                    {ex.reps.replace(' / jambe', '/j').replace(' / côté', '/c')}
                  </span>
                  {prevLabel && <span className="truncate font-mono text-[10px] text-slate-400">· {prevLabel}</span>}
                </>
              )}
            </span>
          </span>
        </button>
        {confirmDelete && sessionId ? (
          <span className="fade-up flex shrink-0 items-center gap-1 text-[11px]">
            <span className="text-slate-400">Supprimer ?</span>
            <button
              type="button"
              onClick={() => {
                navigator.vibrate?.(20)
                removeCustom(sessionId, ex.id)
                touch()
              }}
              className="h-9 rounded-lg bg-red-500/15 px-2.5 font-semibold text-red-300"
            >
              Oui
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="h-9 rounded-lg bg-chip px-2.5 text-slate-300">
              Non
            </button>
          </span>
        ) : ex.custom && sessionId ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label="Supprimer l’exercice personnalisé"
            className="grid h-11 w-8 shrink-0 place-items-center text-slate-600 transition hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {!done && ex.mode !== 'treadmill' && doneSets.length > 0 && (
          <span className="font-mono text-[11px] text-ember">
            {doneSets.length}/{sets.length}
          </span>
        )}
        <button
          type="button"
          id={`check-${tid}`}
          onClick={toggleDone}
          aria-pressed={done}
          aria-label={done ? 'Marquer non terminé' : 'Marquer terminé'}
          className="grid h-11 w-9 shrink-0 place-items-center"
        >
          <span
            className={`grid h-6 w-6 place-items-center rounded-full border transition duration-200 ${
              done ? 'pop border-moss bg-moss text-ink shadow-[0_0_12px_-2px_#10b981]' : 'border-slate-700 text-transparent'
            }`}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
          </span>
        </button>
        <button type="button" onClick={toggleOpen} aria-label={open ? 'Replier' : 'Déplier'} className="grid h-11 w-8 shrink-0 place-items-center text-slate-500">
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* ── Détail (accordéon) ── */}
      <div className="collapse-grid" data-open={open}>
        <div>
          {mounted && (
            <div className="space-y-3 border-t border-line px-3 pb-3 pt-3">
              {/* Spécifications */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[11px] text-slate-300">
                <Spec icon={Layers}>{ex.sets} Série{ex.sets > 1 ? 's' : ''}</Spec>
                <Spec icon={Repeat}>{ex.reps}</Spec>
                {ex.rest > 0 && <Spec icon={Timer}>{restLabel(ex.rest)} Repos</Spec>}
                {ex.equipment && <Spec icon={Dumbbell}>{ex.equipment}</Spec>}
                {ex.tempo && <Spec icon={Gauge}>{ex.tempo}</Spec>}
              </div>

              {ex.animation && <FigurePlayer id={ex.animation} active={open} />}

              {(pr > 0 || newPr) && (
                <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Trophy className="h-3.5 w-3.5 text-amber-400" />
                  Record : <span className="font-mono text-amber-300">{pr} lbs</span>
                  {newPr && <span className="pop font-semibold text-moss">· nouveau record 🎉</span>}
                </p>
              )}

              {/* Conseils — atténués une fois l'exercice complété */}
              <div className={`space-y-2 transition-opacity duration-200 ${done ? 'opacity-50' : ''}`}>
                {ex.cue && (
                  <Tip color="border-ember/60" title={ex.custom ? '⚡ Consigne' : '⚡ Cue'} titleCls="text-orange-300">
                    {ex.cue}
                  </Tip>
                )}
                {ex.kneeAnkle && (
                <Tip
                  color={tipKind === 'ankle' ? 'border-iris/70' : 'border-glacier/70'}
                  title={tipKind === 'ankle' ? '⚓ Conseil Cheville' : '🩹 Conseil Genou'}
                  titleCls={tipKind === 'ankle' ? 'text-violet-300' : 'text-cyan-300'}
                >
                  {ex.kneeAnkle}
                </Tip>
                )}
                {!done && ex.steps.length > 0 && (
                  <ol className="space-y-1 pl-0.5 text-[12px] leading-snug text-muted">
                    {ex.steps.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="font-mono text-[10px] text-slate-600">{i + 1}.</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Saisie */}
              <div className="rounded-xl border border-line bg-ink-2/80 p-2.5" data-noswipe>
                {ex.mode === 'treadmill' ? (
                  <TreadmillTracker log={log} write={write} done={done} />
                ) : (
                  <>
                    <div className="no-scrollbar -mx-0.5 mb-2.5 flex gap-1.5 overflow-x-auto px-0.5">
                      {sets.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSel(i)}
                          className={`flex h-9 shrink-0 items-center gap-1 rounded-lg border px-2.5 font-mono text-[11px] transition duration-150 ${
                            i === cur
                              ? 'border-ember/50 bg-ember/10 text-orange-200'
                              : s.done
                                ? 'border-moss/25 bg-moss/10 text-emerald-300'
                                : 'border-line bg-chip/50 text-slate-500'
                          }`}
                        >
                          {s.done && <Check className="h-3 w-3" strokeWidth={3} />}S{i + 1}
                          {s.done && (s.w || s.r) && (
                            <span className="text-slate-400">
                              {s.w ? `${s.w}×` : ''}
                              {s.r}
                            </span>
                          )}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={addSet}
                        aria-label="Ajouter une série"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-dashed border-slate-700 text-slate-500"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Stepper
                        id={`log-${tid}-weight`}
                        label="Poids · lbs"
                        value={curSet.w}
                        placeholder={hintW(cur) || (ex.bodyweight ? 'PDC' : '0')}
                        step={5}
                        decimal
                        onChange={(v) => setField(cur, 'w', v)}
                        done={curSet.done}
                      />
                      <Stepper
                        id={`log-${tid}-reps`}
                        label={ex.mode === 'timed' ? 'Durée · s' : ex.perSide ? 'Reps · /côté' : 'Reps'}
                        value={curSet.r}
                        placeholder={hintR(cur)}
                        step={ex.mode === 'timed' ? 5 : 1}
                        onChange={(v) => setField(cur, 'r', v)}
                        done={curSet.done}
                      />
                    </div>

                    <div className="mt-2 flex gap-2">
                      {ex.mode === 'timed' && (
                        <button
                          type="button"
                          onClick={() => timer.start(num(curSet.r || hintR(cur)) || 45)}
                          aria-label="Lancer le chrono de travail"
                          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-iris/30 bg-iris/10 text-violet-300 active:scale-95"
                        >
                          <Play className="h-4 w-4" fill="currentColor" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => validate(cur)}
                        className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition duration-150 active:scale-[0.98] ${
                          curSet.done
                            ? 'border border-line bg-chip text-slate-300'
                            : 'bg-gradient-to-r from-ember to-orange-500 text-white shadow-[0_0_24px_-8px_#f97316]'
                        }`}
                      >
                        <Check className="h-5 w-5" strokeWidth={3} />
                        {curSet.done ? `Annuler la série ${cur + 1}` : `Valider série ${cur + 1}/${sets.length}`}
                      </button>
                    </div>
                  </>
                )}
                <textarea
                  id={`log-${tid}-note`}
                  value={log.note ?? ''}
                  onChange={(e) => write((l) => ({ ...l, sets: l.sets.length ? l.sets : sets, note: e.target.value }))}
                  placeholder="Notes · sensations genou / cheville, réglage machine…"
                  rows={1}
                  className="mt-2 w-full resize-none rounded-lg border border-line bg-transparent px-2.5 py-2 text-[12px] text-slate-300 placeholder:text-slate-600 focus:border-glacier/40 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function Spec({ icon: Icon, children }: { icon: typeof Zap; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1 whitespace-nowrap">
      <Icon className="h-3.5 w-3.5 text-slate-500" />
      {children}
    </span>
  )
}

function Tip({ color, title, titleCls, children }: { color: string; title: string; titleCls: string; children: ReactNode }) {
  return (
    <div className={`rounded-lg border border-line border-l-2 ${color} bg-white/[0.015] px-2.5 py-2 text-[12px] leading-snug text-slate-300`}>
      <p className={`mb-0.5 text-[10px] font-semibold uppercase tracking-wider ${titleCls}`}>{title}</p>
      {children}
    </div>
  )
}

/** Champ numérique compact avec −/+ (cibles tactiles ≥ 44 px). */
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
  min = 0,
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
  min?: number
}) {
  const btn = `grid h-full ${compact ? 'w-8' : 'w-10'} shrink-0 place-items-center text-lg text-slate-400 active:text-ember`
  const base = value !== '' ? num(value) : num(placeholder)
  const bump = (d: number) => {
    navigator.vibrate?.(5)
    const v = Math.max(min, Math.round((base + d) * 10) / 10)
    onChange(String(v))
  }
  return (
    <div>
      <p className="label mb-1 pl-0.5">{label}</p>
      <div
        className={`flex h-12 items-center rounded-xl border transition-colors duration-150 ${
          done ? 'border-moss/25 bg-moss/[0.06]' : 'border-line bg-chip/60 focus-within:border-ember/50'
        }`}
      >
        <button type="button" onClick={() => bump(-step)} aria-label={`${label} moins ${step}`} className={btn}>
          −
        </button>
        <input
          inputMode={decimal ? 'decimal' : 'numeric'}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value.replace(decimal ? /[^\d.,]/g : /[^\d]/g, ''))}
          id={id}
          aria-label={label}
          className={`h-full w-full min-w-0 bg-transparent text-center font-mono ${compact ? 'text-base' : 'text-lg'} font-semibold text-fg placeholder:text-slate-600 focus:outline-none`}
        />
        <button type="button" onClick={() => bump(step)} aria-label={`${label} plus ${step}`} className={btn}>
          +
        </button>
      </div>
    </div>
  )
}

function TreadmillTracker({
  log,
  write,
  done,
}: {
  log: ExerciseLog
  write: (fn: (l: ExerciseLog) => ExerciseLog) => void
  done: boolean
}) {
  const t = log.treadmill ?? { minutes: '', incline: '', speed: '' }
  const stats = treadmillStats({
    minutes: t.minutes || '40',
    incline: t.incline || '15',
    speed: t.speed || '5',
  })
  const filled = treadmillStats(t)
  const set = (k: keyof typeof t, v: string) => write((l) => ({ ...l, treadmill: { ...t, [k]: v } }))
  return (
    <div>
      <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-3">
        <Stepper label="Durée · min" value={t.minutes} placeholder="40" step={5} onChange={(v) => set('minutes', v)} compact done={done} />
        <Stepper label="Pente · %" value={t.incline} placeholder="15" step={1} onChange={(v) => set('incline', v)} compact done={done} />
        <Stepper label="Vitesse · km/h" value={t.speed} placeholder="5" step={0.1} decimal onChange={(v) => set('speed', v)} compact done={done} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-line bg-ember/[0.06] px-3 py-2">
          <p className="label flex items-center gap-1 !text-orange-300/80">
            <Mountain className="h-3 w-3" /> D+ {filled ? '' : 'prévu'}
          </p>
          <p className="font-mono text-xl font-bold text-fg">{stats ? `${stats.dplus} m` : '—'}</p>
        </div>
        <div className="rounded-xl border border-line bg-glacier/[0.06] px-3 py-2">
          <p className="label flex items-center gap-1 !text-cyan-300/80">
            <Footprints className="h-3 w-3" /> Distance
          </p>
          <p className="font-mono text-xl font-bold text-fg">{stats ? `${stats.km.toFixed(2)} km` : '—'}</p>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        {[30, 45].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => timer.start(m * 60)}
            className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-iris/30 bg-iris/10 font-mono text-[13px] font-semibold text-violet-200 active:scale-95"
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
          className={`flex h-12 flex-[1.4] items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition duration-150 active:scale-95 ${
            done ? 'bg-moss/15 text-emerald-300' : 'bg-gradient-to-r from-ember to-orange-500 text-white shadow-[0_0_24px_-8px_#f97316]'
          }`}
        >
          <Check className="h-4 w-4" strokeWidth={3} /> {done ? 'Fait' : 'Terminer'}
        </button>
      </div>
    </div>
  )
}
