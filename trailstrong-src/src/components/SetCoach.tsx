/**
 * Coach de série plein écran : décompte 3-2-1, tempo guidé rep par rep (bips +
 * voix optionnelle), changement de jambe, puis validation auto de la série et
 * lancement du repos. Basé sur des horodatages : reste juste si l'écran rame.
 */
import { Check, Headphones, Pause, Play, Speaker, Speech, Volume2, VolumeX, X } from 'lucide-react'
import { useEffect, useReducer, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { repSeconds, type Phase } from '../data/cadence'
import type { Side } from '../lib/storage'
import { keepAwake, timer, timerRunning } from '../lib/timer'
import { say, setSoundPrefs, sfx, unlockAudio, useSoundPrefs, type SoundMode } from '../lib/sound'
import { SIDE_LABEL, SWITCH_SECONDS } from '../lib/useExerciseLog'

const COUNTDOWN = 3
type Stage = 'count' | 'work' | 'switch' | 'end'

export interface CoachProps {
  name: string
  /** Tempo d'une rep ; null = maintien chronométré (gainage, équilibre). */
  cadence: Phase[] | null
  /** Côtés à faire dans l'ordre ([null] si bilatéral). */
  sides: (Side | null)[]
  /** Reps (ou secondes) visées pour un côté. */
  target: (side: Side | null) => number
  setLabel: string
  rest: number
  /** Côté terminé : `done` = reps (ou secondes) réellement faites. */
  onSideDone: (side: Side | null, done: number) => void
  onClose: () => void
}

const BG: Record<Stage | Phase['kind'], string> = {
  count: 'bg-paper-2',
  switch: 'bg-lilac',
  end: 'bg-mint',
  work: 'bg-paper-2',
  go: 'bg-mint',
  back: 'bg-sky',
  hold: 'bg-sun',
}

const MODE_NEXT: Record<SoundMode, SoundMode> = { voice: 'beep', beep: 'off', off: 'voice' }
const MODE_UI: Record<SoundMode, { label: string; Icon: typeof Volume2 }> = {
  voice: { label: 'Voix + bips', Icon: Speech },
  beep: { label: 'Bips', Icon: Volume2 },
  off: { label: 'Muet', Icon: VolumeX },
}

export function SetCoach({ name, cadence, sides, target, setLabel, rest, onSideDone, onClose }: CoachProps) {
  const prefs = useSoundPrefs()
  const [, render] = useReducer((x: number) => x + 1, 0)
  const [paused, setPaused] = useState(false)
  // Moteur en ref : l'intervalle lit toujours l'état courant.
  const eng = useRef({ stage: 'count' as Stage, sideIdx: 0, t0: Date.now(), pausedAt: 0, fired: new Set<string>(), doneCount: 0 })
  const cb = useRef({ onSideDone, onClose, target })
  cb.current = { onSideDone, onClose, target }

  const side = sides[eng.current.sideIdx] ?? null
  const goal = target(side)
  const D = cadence ? repSeconds(cadence) : 0

  useEffect(() => {
    void keepAwake(true)
    say(`${setLabel}. Prêt`)
    return () => {
      if (!timerRunning()) void keepAwake(false)
    }
  }, [setLabel])

  /** Fin d'un côté : enregistre, puis change de jambe ou termine. */
  const finishSide = (done: number) => {
    const e = eng.current
    const sd = sides[e.sideIdx] ?? null
    sfx.end()
    e.doneCount = done
    if (done > 0) cb.current.onSideDone(sd, done)
    if (done > 0 && e.sideIdx < sides.length - 1) {
      say(`Stop. Change de jambe`)
      e.stage = 'switch'
      e.t0 = Date.now()
      return
    }
    e.stage = 'end'
    e.t0 = Date.now()
    // Le son « repos » est joué par le chrono global au lancement du repos.
    say(done > 0 && rest > 0 ? 'Stop. Repos' : 'Stop')
  }

  useEffect(() => {
    const id = window.setInterval(() => {
      const e = eng.current
      if (e.pausedAt) return
      const el = (Date.now() - e.t0) / 1000
      // Chaque son n'est joué qu'une fois (clé unique par côté / rep / phase / seconde).
      const key = (k: string, fn: () => void) => {
        k = `${e.stage}${e.sideIdx}:${k}`
        if (!e.fired.has(k)) {
          e.fired.add(k)
          fn()
        }
      }

      if (e.stage === 'count') {
        if (el >= COUNTDOWN) {
          e.stage = 'work'
          e.t0 += COUNTDOWN * 1000
          key('r0p0', sfx.start)
        } else {
          const n = Math.ceil(COUNTDOWN - el)
          key(`c${n}`, () => sfx.count(n))
        }
      } else if (e.stage === 'work') {
        const curSide = sides[e.sideIdx] ?? null
        const goalNow = cb.current.target(curSide)
        if (cadence) {
          const rep = Math.floor(el / D)
          if (rep >= goalNow) return finishSide(goalNow)
          let t = el - rep * D
          let p = 0
          while (p < cadence.length - 1 && t >= cadence[p].s) t -= cadence[p++].s
          const prog = rep / Math.max(1, goalNow - 1)
          key(`r${rep}p${p}`, () => {
            if (p === 0 && rep > 0) say(String(rep))
            if (p === 0 && rep === goalNow - 1 && goalNow > 1) sfx.last()
            sfx.phase(cadence[p].kind, prog)
          })
          // Métronome : 1 clic par seconde dans les phases lentes, plus aigu vers la fin.
          if (cadence[p].s >= 2 && t >= 1) key(`r${rep}p${p}s${Math.floor(t)}`, () => sfx.beat(prog))
        } else {
          const left = goalNow - el
          if (left <= 0) return finishSide(goalNow)
          // Maintien : clic chaque seconde, de plus en plus aigu ; alerte à 5 s ; tics finaux.
          const sec = Math.ceil(left)
          if (sec <= 3) key(`t${sec}`, () => sfx.restTick(sec))
          else if (sec === 5 && goalNow > 8) key('t5', sfx.last)
          else if (sec !== goalNow) key(`t${sec}`, () => sfx.beat(el / goalNow))
          if (sec === 10 && goalNow > 15) key('v10', () => say('10 secondes'))
        }
      } else if (e.stage === 'switch') {
        // Le chrono global (TimerBar) bippe le décompte et annonce « Go ».
        if (el >= SWITCH_SECONDS && !timerRunning()) {
          timer.dismiss()
          e.stage = 'work'
          e.sideIdx += 1
          e.t0 = Date.now()
          // « Go » joué par le chrono global (fin du changement de jambe).
          key('r0p0', () => {})
        }
      } else if (e.stage === 'end' && el >= 1.6) {
        window.clearInterval(id)
        cb.current.onClose()
        return
      }
      render()
    }, 50)
    return () => window.clearInterval(id)
  }, [])

  const togglePause = () => {
    unlockAudio()
    const e = eng.current
    if (e.pausedAt) {
      e.t0 += Date.now() - e.pausedAt
      e.pausedAt = 0
      setPaused(false)
    } else {
      e.pausedAt = Date.now()
      setPaused(true)
      window.speechSynthesis?.cancel()
    }
  }

  const stopNow = () => {
    unlockAudio()
    const e = eng.current
    if (e.stage !== 'work') return
    const el = ((e.pausedAt || Date.now()) - e.t0) / 1000
    e.pausedAt = 0
    setPaused(false)
    finishSide(cadence ? Math.min(goal, Math.floor(el / D)) : Math.round(el))
  }

  // ── Affichage ──────────────────────────────────────────────────────────
  const e = eng.current
  const el = ((e.pausedAt || Date.now()) - e.t0) / 1000
  let bg = BG[e.stage]
  let big = ''
  let title = ''
  let sub = ''
  let phaseIdx = -1
  let frac = 0
  if (e.stage === 'count') {
    title = 'Prêt ?'
    big = String(Math.max(1, Math.ceil(COUNTDOWN - el)))
    sub = cadence ? `${goal} reps · ${cadence.map((p) => `${p.label} ${p.s}s`).join(' → ')}` : `Maintien ${goal} s`
    frac = el / COUNTDOWN
  } else if (e.stage === 'work' && cadence) {
    const rep = Math.min(goal - 1, Math.floor(el / D))
    let t = el - rep * D
    let p = 0
    while (p < cadence.length - 1 && t >= cadence[p].s) t -= cadence[p++].s
    phaseIdx = p
    bg = BG[cadence[p].kind]
    title = cadence[p].label
    big = String(Math.max(1, Math.ceil(cadence[p].s - t)))
    sub = `Rep ${rep + 1} / ${goal}`
    frac = (rep + (el - rep * D) / D) / goal
  } else if (e.stage === 'work') {
    bg = 'bg-sky'
    title = 'Tiens'
    big = String(Math.max(0, Math.ceil(goal - el)))
    sub = `Maintien ${goal} s`
    frac = el / goal
  } else if (e.stage === 'switch') {
    const next = sides[e.sideIdx + 1]
    title = 'Change de jambe'
    big = String(Math.max(1, Math.ceil(SWITCH_SECONDS - el)))
    sub = next ? `Ensuite : jambe ${SIDE_LABEL[next]}` : ''
    frac = el / SWITCH_SECONDS
  } else {
    title = e.doneCount > 0 ? 'Série validée' : 'Annulé'
    big = e.doneCount > 0 ? '✓' : '–'
    sub = e.doneCount > 0 && rest > 0 ? `Repos ${rest} s lancé` : ''
    frac = 1
  }

  const M = MODE_UI[prefs.mode]

  return createPortal(
    <div className="pt-safe pb-safe fixed inset-0 z-[70] flex flex-col bg-paper" role="dialog" aria-label={`Coach : ${name}`} data-noswipe>
      <header className="flex items-center gap-2 border-b-[2.5px] border-ink bg-paper px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-extrabold uppercase tracking-wide text-ink/65">
            {setLabel}
            {side && ` · jambe ${SIDE_LABEL[side]}`}
          </p>
          <p className="headline truncate text-[18px]">{name}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSoundPrefs({ mode: MODE_NEXT[prefs.mode] })
            if (MODE_NEXT[prefs.mode] !== 'off') window.setTimeout(sfx.tick, 60)
          }}
          className="b-btn flex h-10 shrink-0 items-center gap-1.5 px-2.5 text-[11px] uppercase tracking-wide"
          aria-label={`Son : ${M.label} (toucher pour changer)`}
        >
          <M.Icon className="h-4 w-4" strokeWidth={2.5} /> {M.label}
        </button>
        <button
          type="button"
          onClick={() => setSoundPrefs({ speaker: !prefs.speaker })}
          className="b-btn grid h-10 w-10 shrink-0 place-items-center"
          aria-label={prefs.speaker ? 'Sortie : haut-parleur forcé (toucher pour mélanger avec YouTube)' : 'Sortie : par-dessus YouTube / musique (toucher pour forcer le haut-parleur)'}
        >
          {prefs.speaker ? <Speaker className="h-4 w-4" strokeWidth={2.5} /> : <Headphones className="h-4 w-4" strokeWidth={2.5} />}
        </button>
        <button type="button" onClick={onClose} aria-label="Quitter le coach sans valider" className="b-btn grid h-10 w-10 shrink-0 place-items-center rounded-full">
          <X className="h-5 w-5" strokeWidth={3} />
        </button>
      </header>

      <main className={`flex flex-1 flex-col items-center justify-center px-5 text-center transition-colors duration-200 ${bg}`}>
        <p className="headline text-[44px] leading-none min-[400px]:text-[52px]" aria-live="polite">
          {title}
        </p>
        <p className="mt-2 font-mono text-[120px] font-black leading-none tabular-nums text-ink min-[400px]:text-[150px]" role="timer">
          {big}
        </p>
        <p className="mt-2 text-[18px] font-black uppercase tracking-wide">{sub}</p>

        {cadence && (
          <ol className="mt-6 flex w-full max-w-sm gap-1.5" aria-label="Tempo d’une répétition">
            {cadence.map((p, i) => (
              <li
                key={i}
                style={{ flexGrow: p.s }}
                className={`basis-0 border-2 border-ink px-1 py-1.5 text-[11px] font-extrabold uppercase transition-transform duration-150 rounded-xl ${BG[p.kind]} ${
                  i === phaseIdx ? '-translate-y-1 shadow-[0_3px_0_var(--color-shadow)]' : 'opacity-60'
                }`}
              >
                {p.label}
                <span className="block font-mono text-[13px]">{p.s}s</span>
              </li>
            ))}
          </ol>
        )}
      </main>

      <div className="h-2 border-y-2 border-ink bg-paper">
        <div className="h-full bg-flame transition-[width] duration-100 ease-linear" style={{ width: `${Math.min(1, Math.max(0, frac)) * 100}%` }} />
      </div>

      <footer className="flex gap-2 bg-paper p-3">
        <button
          type="button"
          onClick={togglePause}
          disabled={e.stage === 'end'}
          className="b-btn flex h-14 flex-1 items-center justify-center gap-2 text-[15px] uppercase tracking-wide disabled:opacity-40"
        >
          {paused ? <Play className="h-5 w-5" fill="currentColor" /> : <Pause className="h-5 w-5" fill="currentColor" />}
          {paused ? 'Reprendre' : 'Pause'}
        </button>
        <button
          type="button"
          onClick={stopNow}
          disabled={e.stage !== 'work'}
          className="b-btn flex h-14 flex-[1.4] items-center justify-center gap-2 bg-flame text-[15px] uppercase tracking-wide disabled:opacity-40"
        >
          <Check className="h-5 w-5" strokeWidth={3} /> {sides.length > 1 && e.sideIdx === 0 ? 'Fini · jambe suivante' : 'Terminer'}
        </button>
      </footer>
    </div>,
    document.body,
  )
}
