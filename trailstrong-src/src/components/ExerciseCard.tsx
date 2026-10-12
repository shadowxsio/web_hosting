import { Check, ChevronDown, Footprints, Lightbulb, Mountain, Play, Plus, Trophy } from 'lucide-react'
import { useState } from 'react'
import type { Exercise } from '../data/program'
import { previousBest, treadmillStats, updateExercise, useData, type ExerciseLog, type SetLog } from '../lib/storage'
import { timer } from '../lib/timer'
import { FigurePlayer, FigureThumb } from './FigurePlayer'

const fmtDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })

const restLabel = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60}` : ''}` : `${s} s`)

function emptySets(n: number): SetLog[] {
  return Array.from({ length: n }, () => ({ w: '', r: '', done: false }))
}

export function ExerciseCard({ ex, index, date }: { ex: Exercise; index: number; date: string }) {
  const data = useData()
  const log: ExerciseLog = data.logs[date]?.[ex.id] ?? { sets: [] }
  const sets = log.sets.length >= ex.sets ? log.sets : [...log.sets, ...emptySets(ex.sets - log.sets.length)]
  const { last, pr, lastLog, newPr } = previousBest(data, ex.id, date)
  const [open, setOpen] = useState(false)
  const done = !!log.done

  const write = (fn: (l: ExerciseLog) => ExerciseLog) => updateExercise(date, ex.id, fn)

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
      // ✓ sur une ligne vide = « comme la dernière fois » (placeholders).
      const w = s.w || (willBeDone ? (lastLog?.sets[i]?.w ?? '') : s.w)
      const r = s.r || (willBeDone ? (lastLog?.sets[i]?.r ?? String(ex.defaultReps ?? '')) : s.r)
      next[i] = { w, r, done: willBeDone, at: willBeDone ? Date.now() : undefined }
      const allDone = next.every((x) => x.done)
      return { ...l, sets: next, done: allDone ? true : l.done && willBeDone }
    })
    if (willBeDone) {
      navigator.vibrate?.(30)
      const isLast = sets.filter((x) => x.done).length + 1 >= sets.length
      if (ex.rest > 0 && !isLast) timer.start(ex.rest)
    }
  }

  const addSet = () => write((l) => ({ ...l, sets: [...sets, { w: sets.at(-1)?.w ?? '', r: '', done: false }], done: false }))
  const toggleDone = () => {
    navigator.vibrate?.(done ? 10 : [20, 30, 40])
    write((l) => ({ ...l, sets: l.sets.length ? l.sets : sets, done: !done }))
  }

  const doneSets = sets.filter((s) => s.done).length
  const unit = ex.mode === 'timed' ? 's' : 'reps'

  return (
    <article
      className={`slide-in overflow-hidden rounded-3xl border backdrop-blur-xl transition-colors ${
        done ? 'border-moss/40 bg-moss/[0.06]' : 'border-white/[0.07] bg-white/[0.035]'
      }`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* En-tête */}
      <div className="flex gap-3 p-3.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/5 bg-ink/70"
          aria-label="Voir la technique"
          data-noswipe
        >
          <FigureThumb id={ex.animation} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="flex-1 font-display text-[17px] font-bold leading-tight text-white">
              <span className="mr-1.5 text-ember">{index + 1}.</span>
              {ex.name}
            </h3>
            <button
              type="button"
              onClick={toggleDone}
              aria-pressed={done}
              aria-label={done ? 'Marquer non terminé' : 'Marquer terminé'}
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition active:scale-90 ${
                done ? 'pop border-moss bg-moss text-ink' : 'border-slate-600 text-transparent'
              }`}
            >
              <Check className="h-4 w-4" strokeWidth={3.5} />
            </button>
          </div>
          <p className="mt-0.5 text-xs text-glacier">{ex.target}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
            <span className="rounded-md bg-ember/15 px-2 py-0.5 text-orange-200">
              {ex.sets > 1 ? `${ex.sets} × ` : ''}
              {ex.reps}
            </span>
            {ex.rest > 0 && <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-slate-300">repos {restLabel(ex.rest)}</span>}
            {ex.tempo && <span className="rounded-md bg-glacier/10 px-2 py-0.5 text-sky-200">{ex.tempo}</span>}
          </div>
        </div>
      </div>

      {/* Indice record */}
      {ex.mode !== 'treadmill' && (last || pr > 0) && (
        <div className="mx-3.5 mb-2 flex items-center gap-2 rounded-xl bg-glacier/[0.07] px-3 py-1.5 text-xs text-sky-100">
          <Trophy className="h-3.5 w-3.5 shrink-0 text-glacier" />
          <span>
            {last && last.maxW > 0 ? (
              <>
                Ton record précédent : <b className="text-white">{last.maxW} lbs</b>{' '}
                <span className="text-slate-400">({fmtDate(last.date)})</span>
              </>
            ) : last ? (
              <>
                Dernière fois : <b className="text-white">{last.reps} {unit}</b>{' '}
                <span className="text-slate-400">({fmtDate(last.date)})</span>
              </>
            ) : null}
            {pr > 0 && (!last || pr > last.maxW) && <span className="ml-2 text-amber-300">PR {pr} lbs</span>}
            {newPr && <span className="pop ml-2 inline-block font-bold text-moss">🎉 Nouveau record !</span>}
          </span>
        </div>
      )}

      {/* Fiche technique */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between border-t border-white/5 px-3.5 py-2 text-xs font-semibold text-slate-400"
        aria-expanded={open}
      >
        Technique, cue & conseil genou / cheville
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="slide-in space-y-3 px-3.5 pb-3">
          <FigurePlayer id={ex.animation} />
          <ol className="space-y-1.5 text-sm text-slate-300">
            {ex.steps.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[11px] font-bold text-slate-400">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
          <div className="flex gap-2 rounded-2xl border border-ember/20 bg-ember/[0.07] p-3 text-sm text-orange-50">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-ember" />
            <p>
              <b className="text-ember">Cue · </b>
              {ex.cue}
            </p>
          </div>
          <div className="flex gap-2 rounded-2xl border border-glacier/20 bg-glacier/[0.07] p-3 text-sm text-sky-50">
            <Footprints className="mt-0.5 h-4 w-4 shrink-0 text-glacier" />
            <p>
              <b className="text-glacier">Genou / cheville · </b>
              {ex.kneeAnkle}
            </p>
          </div>
        </div>
      )}

      {/* Tracker */}
      <div className="border-t border-white/5 bg-ink/40 p-3.5" data-noswipe>
        {ex.mode === 'treadmill' ? (
          <TreadmillTracker log={log} write={write} done={done} />
        ) : (
          <>
            <div className="mb-1.5 grid grid-cols-[44px_1fr_1fr_44px] gap-2 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <span>Série</span>
              <span>Poids (lbs)</span>
              <span>{ex.mode === 'timed' ? 'Secondes' : ex.perSide ? 'Reps / côté' : 'Reps'}</span>
              <span className="text-center">✓</span>
            </div>
            <div className="space-y-1.5">
              {sets.map((s, i) => (
                <div key={i} className="grid grid-cols-[44px_1fr_1fr_44px] items-center gap-2">
                  <span className={`text-center font-display text-sm font-bold ${s.done ? 'text-moss' : 'text-slate-400'}`}>{i + 1}</span>
                  <input
                    inputMode="decimal"
                    type="text"
                    value={s.w}
                    placeholder={lastLog?.sets[i]?.w || (ex.bodyweight ? 'PDC' : '—')}
                    onChange={(e) => setField(i, 'w', e.target.value.replace(/[^\d.,]/g, ''))}
                    aria-label={`Poids série ${i + 1}`}
                    className={inputCls(s.done)}
                  />
                  <div className="relative">
                    <input
                      inputMode="numeric"
                      type="text"
                      value={s.r}
                      placeholder={lastLog?.sets[i]?.r || String(ex.defaultReps ?? '')}
                      onChange={(e) => setField(i, 'r', e.target.value.replace(/[^\d]/g, ''))}
                      aria-label={`${ex.mode === 'timed' ? 'Secondes' : 'Répétitions'} série ${i + 1}`}
                      className={`${inputCls(s.done)} ${ex.mode === 'timed' ? 'pr-9' : ''}`}
                    />
                    {ex.mode === 'timed' && (
                      <button
                        type="button"
                        onClick={() => timer.start(Number(s.r || ex.defaultReps || 45))}
                        aria-label="Lancer le chrono de travail"
                        className="absolute right-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg bg-ember/20 text-ember"
                      >
                        <Play className="h-3.5 w-3.5" fill="currentColor" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => validate(i)}
                    aria-label={s.done ? `Annuler la série ${i + 1}` : `Valider la série ${i + 1}`}
                    className={`grid h-11 place-items-center rounded-xl border transition active:scale-90 ${
                      s.done ? 'pop border-moss bg-moss text-ink' : 'border-white/10 bg-white/[0.04] text-slate-400'
                    }`}
                  >
                    <Check className="h-5 w-5" strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={addSet}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-400 active:bg-white/5"
              >
                <Plus className="h-3.5 w-3.5" /> Série
              </button>
              <span className="ml-auto text-xs text-slate-500">
                {doneSets}/{sets.length} séries {doneSets === sets.length && sets.length > 0 && '· 💪'}
              </span>
            </div>
          </>
        )}
        <textarea
          value={log.note ?? ''}
          onChange={(e) => write((l) => ({ ...l, sets: l.sets.length ? l.sets : sets, note: e.target.value }))}
          placeholder="Notes (sensations genou, cheville, réglage machine…)"
          rows={1}
          className="mt-2 w-full resize-none rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-glacier/50 focus:outline-none"
        />
      </div>
    </article>
  )
}

const inputCls = (done: boolean) =>
  `h-11 w-full rounded-xl border px-3 text-center font-display text-base font-semibold tabular-nums placeholder:font-normal placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-ember/50 ${
    done ? 'border-moss/30 bg-moss/10 text-emerald-100' : 'border-white/[0.08] bg-white/[0.04] text-white'
  }`

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
  const stats = treadmillStats(t)
  const set = (k: keyof typeof t, v: string) =>
    write((l) => ({ ...l, treadmill: { ...t, [k]: v.replace(/[^\d.,]/g, '') } }))
  const fields: [keyof typeof t, string, string][] = [
    ['minutes', 'Durée (min)', '40'],
    ['incline', 'Pente (%)', '15'],
    ['speed', 'Vitesse (km/h)', '5.0'],
  ]
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {fields.map(([k, label, ph]) => (
          <label key={k} className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
            <input
              inputMode="decimal"
              value={t[k]}
              placeholder={ph}
              onChange={(e) => set(k, e.target.value)}
              className={`${inputCls(done)} mt-1`}
            />
          </label>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-ember/10 p-3">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-orange-300">
            <Mountain className="h-3 w-3" /> D+ estimé
          </p>
          <p className="font-display text-2xl font-extrabold text-white">{stats ? `${stats.dplus} m` : '—'}</p>
        </div>
        <div className="rounded-2xl bg-glacier/10 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-300">Distance</p>
          <p className="font-display text-2xl font-extrabold text-white">{stats ? `${stats.km.toFixed(2)} km` : '—'}</p>
        </div>
      </div>
      <div className="mt-2.5 flex gap-2">
        {[30, 45].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => timer.start(m * 60)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-2 text-sm font-semibold text-slate-200 active:scale-95"
          >
            <Play className="h-3.5 w-3.5 text-ember" fill="currentColor" /> {m} min
          </button>
        ))}
        <button
          type="button"
          onClick={() => write((l) => ({ ...l, done: !done }))}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-bold active:scale-95 ${
            done ? 'bg-moss text-ink' : 'bg-ember text-white'
          }`}
        >
          <Check className="h-4 w-4" strokeWidth={3} /> {done ? 'Fait' : 'Terminer'}
        </button>
      </div>
    </div>
  )
}
