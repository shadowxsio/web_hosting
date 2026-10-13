/**
 * Retour au calme guidé : liste des étirements de la séance (avec schéma),
 * puis enchaînement automatique mise en place → maintien → autre côté → suivant,
 * avec les sons du coach.
 */
import { Check, Pause, Play, SkipForward, X } from 'lucide-react'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PREP, routineOf, routineSeconds, type Stretch } from '../data/cooldown'
import type { Session } from '../data/program'
import { say, sfx, unlockAudio } from '../lib/sound'
import { updateSessionLog } from '../lib/storage'
import { keepAwake, timerRunning } from '../lib/timer'
import { ExerciseDiagram } from './ExerciseDiagram'

interface Step {
  kind: 'prep' | 'hold'
  stretch: Stretch
  idx: number
  side: 'gauche' | 'droite' | null
  dur: number
}

function buildSteps(r: Stretch[]): Step[] {
  return r.flatMap((s, idx) =>
    (s.perSide ? (['gauche', 'droite'] as const) : [null]).flatMap((side) => [
      { kind: 'prep' as const, stretch: s, idx, side, dur: PREP },
      { kind: 'hold' as const, stretch: s, idx, side, dur: s.hold },
    ]),
  )
}

const mmss = (s: number) => `${Math.floor(s / 60)} min${s % 60 ? ` ${String(s % 60).padStart(2, '0')}` : ''}`

export function CooldownCoach({ session, date, onClose }: { session: Session; date: string; onClose: () => void }) {
  const routine = useMemo(() => routineOf(session), [session])
  const steps = useMemo(() => buildSteps(routine), [routine])
  const [running, setRunning] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    running ? (
      <Runner steps={steps} onDone={() => updateSessionLog(date, session.id, { cooldownAt: Date.now() })} onClose={onClose} />
    ) : (
      <div className="fade-in fixed inset-0 z-[60] flex items-end justify-center bg-ink/40" onClick={onClose}>
        <div
          className="sheet pb-safe flex max-h-[94dvh] w-full max-w-xl flex-col border-[2.5px] border-b-0 border-ink bg-paper-2 rounded-t-[26px] md:rounded-none md:rounded-l-[26px]"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label="Retour au calme"
          data-noswipe
        >
          <header className="flex items-start justify-between px-4 pt-4">
            <div>
              <p className="tag h-6 -rotate-1 bg-mint px-2 text-[10px]">Étirements & mobilité · ≈ {mmss(routineSeconds(routine))}</p>
              <h2 className="headline mt-2 text-[26px]">Retour au calme</h2>
            </div>
            <button type="button" onClick={onClose} className="b-btn grid h-11 w-11 place-items-center rounded-full" aria-label="Fermer">
              <X className="h-5 w-5" strokeWidth={3} />
            </button>
          </header>
          <p className="px-4 pt-2 text-[13px] font-semibold text-ink/75">Le coach enchaîne tout seul : {PREP} s pour te placer, puis le maintien, côté gauche puis droit.</p>
          <ol className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {routine.map((s, i) => (
              <li key={s.id} className="b-card flex gap-3 p-2 !shadow-[0_3px_0_var(--color-shadow)]">
                <div className="diagram-bg h-[88px] w-[88px] shrink-0 border-2 border-ink rounded-xl">
                  <ExerciseDiagram id={s.diagram} />
                </div>
                <div className="min-w-0 flex-1 py-0.5">
                  <p className="text-[11px] font-extrabold uppercase text-ink/60">
                    {i + 1}. {s.target}
                  </p>
                  <p className="text-[15px] font-black italic leading-tight">{s.name}</p>
                  <p className="mt-1 text-[12px] font-bold">
                    {s.hold} s{s.perSide ? ' / côté' : ''}
                  </p>
                  <p className="mt-1 text-[12px] leading-snug text-ink/75">{s.cue}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="border-t-[2.5px] border-ink p-3">
            <button
              type="button"
              onClick={() => {
                unlockAudio()
                setRunning(true)
              }}
              className="b-btn flex h-12 w-full items-center justify-center gap-2 bg-mint text-[14px] uppercase tracking-wide"
            >
              <Play className="h-4 w-4" fill="currentColor" /> Lancer le retour au calme
            </button>
          </div>
        </div>
      </div>
    ),
    document.body,
  )
}

function Runner({ steps, onDone, onClose }: { steps: Step[]; onDone: () => void; onClose: () => void }) {
  const [, render] = useReducer((x: number) => x + 1, 0)
  const [paused, setPaused] = useState(false)
  const eng = useRef({ i: 0, t0: Date.now(), pausedAt: 0, fired: new Set<string>(), finished: false })
  const cb = useRef({ onDone })
  cb.current = { onDone }

  useEffect(() => {
    void keepAwake(true)
    return () => {
      if (!timerRunning()) void keepAwake(false)
    }
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      const e = eng.current
      if (e.pausedAt || e.finished) return
      const st = steps[e.i]
      const el = (Date.now() - e.t0) / 1000
      const key = (k: string, fn: () => void) => {
        k = `${e.i}:${k}`
        if (!e.fired.has(k)) {
          e.fired.add(k)
          fn()
        }
      }
      key('in', () => {
        if (st.kind === 'prep') {
          if (e.i > 0 && steps[e.i - 1].idx === st.idx) sfx.switch()
          say(st.side && steps[e.i - 1]?.idx === st.idx ? `Côté ${st.side}` : `${st.stretch.name}${st.side ? `, côté ${st.side}` : ''}`)
        } else sfx.start()
      })
      const left = st.dur - el
      const sec = Math.ceil(left)
      if (st.kind === 'prep' && sec <= 3 && sec > 0) key(`c${sec}`, () => sfx.count(sec))
      if (st.kind === 'hold') {
        if (sec <= 5 && sec > 0) key(`t${sec}`, () => sfx.restTick(sec))
        else if (sec % 10 === 0 && sec !== st.dur) key(`b${sec}`, () => sfx.beat(el / st.dur))
      }
      if (left <= 0) {
        if (e.i >= steps.length - 1) {
          e.finished = true
          sfx.end()
          say('Retour au calme terminé. Bravo !')
          cb.current.onDone()
        } else {
          if (st.kind === 'hold' && steps[e.i + 1].idx !== st.idx) sfx.phase('hold', 0)
          e.i += 1
          e.t0 = Date.now()
        }
      }
      render()
    }, 100)
    return () => window.clearInterval(id)
  }, [steps])

  const e = eng.current
  const st = steps[e.i]
  const el = ((e.pausedAt || Date.now()) - e.t0) / 1000
  const left = Math.max(0, Math.ceil(st.dur - el))
  const total = steps.reduce((a, s) => a + s.dur, 0)
  const doneSec = steps.slice(0, e.i).reduce((a, s) => a + s.dur, 0) + Math.min(st.dur, el)
  const next = steps.slice(e.i + 1).find((s) => s.kind === 'hold' && (s.idx !== st.idx || s.side !== st.side))

  const togglePause = () => {
    unlockAudio()
    if (e.pausedAt) {
      e.t0 += Date.now() - e.pausedAt
      e.pausedAt = 0
      setPaused(false)
    } else {
      e.pausedAt = Date.now()
      setPaused(true)
    }
  }
  const skip = () => {
    unlockAudio()
    if (e.finished) return
    if (e.i >= steps.length - 1) {
      e.t0 = Date.now() - st.dur * 1000
    } else {
      e.i += 1
      e.t0 = Date.now()
      e.pausedAt = 0
      setPaused(false)
    }
    render()
  }

  return (
    <div className="pt-safe pb-safe fixed inset-0 z-[70] flex flex-col bg-paper" role="dialog" aria-label="Retour au calme en cours" data-noswipe>
      <header className="flex items-center gap-2 border-b-[2.5px] border-ink bg-paper px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-extrabold uppercase tracking-wide text-ink/65">
            Retour au calme · {st.idx + 1}/{new Set(steps.map((s) => s.idx)).size}
          </p>
          <p className="headline truncate text-[18px]">{st.stretch.name}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Quitter le retour au calme" className="b-btn grid h-10 w-10 shrink-0 place-items-center rounded-full">
          <X className="h-5 w-5" strokeWidth={3} />
        </button>
      </header>

      <main className={`flex flex-1 flex-col items-center justify-center overflow-hidden px-5 text-center transition-colors duration-200 ${e.finished ? 'bg-mint' : st.kind === 'prep' ? 'bg-paper-2' : 'bg-sky'}`}>
        {e.finished ? (
          <>
            <Check className="h-20 w-20" strokeWidth={3} />
            <p className="headline mt-3 text-[40px]">Bien joué</p>
            <p className="mt-2 text-[16px] font-black uppercase tracking-wide">Retour au calme terminé</p>
          </>
        ) : (
          <>
            <div className="diagram-bg aspect-[5/4] w-full max-w-[260px] border-[2.5px] border-ink shadow-[0_4px_0_var(--color-shadow)] rounded-xl">
              <ExerciseDiagram id={st.stretch.diagram} />
            </div>
            <p className="mt-4 text-[14px] font-black uppercase tracking-wide">
              {st.kind === 'prep' ? 'Mets-toi en place' : 'Tiens, respire'}
              {st.side && ` · côté ${st.side}`}
            </p>
            <p className="font-mono text-[96px] font-black leading-none tabular-nums" role="timer">
              {left}
            </p>
            <p className="mt-2 max-w-sm text-[13px] font-bold leading-snug">{st.kind === 'prep' ? st.stretch.steps.join(' ') : st.stretch.cue}</p>
            {next && (
              <p className="mt-3 text-[12px] font-extrabold uppercase text-ink/65">
                Ensuite : {next.stretch.name}
                {next.side && ` · ${next.side}`}
              </p>
            )}
          </>
        )}
      </main>

      <div className="h-2 border-y-2 border-ink bg-paper">
        <div className="h-full bg-leaf transition-[width] duration-100 ease-linear" style={{ width: `${Math.min(1, doneSec / total) * 100}%` }} />
      </div>

      <footer className="flex gap-2 bg-paper p-3">
        {e.finished ? (
          <button type="button" onClick={onClose} className="b-btn flex h-14 flex-1 items-center justify-center gap-2 bg-mint text-[15px] uppercase tracking-wide">
            <Check className="h-5 w-5" strokeWidth={3} /> Terminer
          </button>
        ) : (
          <>
            <button type="button" onClick={togglePause} className="b-btn flex h-14 flex-1 items-center justify-center gap-2 text-[15px] uppercase tracking-wide">
              {paused ? <Play className="h-5 w-5" fill="currentColor" /> : <Pause className="h-5 w-5" fill="currentColor" />}
              {paused ? 'Reprendre' : 'Pause'}
            </button>
            <button type="button" onClick={skip} className="b-btn flex h-14 flex-1 items-center justify-center gap-2 bg-sun text-[15px] uppercase tracking-wide">
              <SkipForward className="h-5 w-5" strokeWidth={2.5} /> Passer
            </button>
          </>
        )}
      </footer>
    </div>
  )
}
