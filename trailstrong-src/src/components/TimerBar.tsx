import { Pause, Play, RotateCcw, Timer as TimerIcon, X } from 'lucide-react'
import { timer, useTimer } from '../lib/timer'

const PRESETS = [60, 90, 120]

export const fmt = (s: number) => {
  const t = Math.ceil(s)
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

export function TimerBar() {
  const t = useTimer()
  const pct = t.duration > 0 ? Math.min(1, t.left / t.duration) : 0
  const finished = t.finishedAt != null
  const urgent = t.running && t.left <= 5

  return (
    <>
      {finished && (
        <button
          type="button"
          onClick={timer.dismiss}
          className="flash fixed inset-0 z-40 bg-moss/30"
          aria-label="Fermer l’alerte de fin de repos"
        />
      )}
      <div className="sticky top-0 z-30 border-b border-white/5 bg-ink/75 backdrop-blur-xl pt-safe">
        <div className="mx-auto flex max-w-xl items-center gap-2 px-3 py-2">
          <div
            className={`relative flex min-w-[84px] items-center gap-1.5 font-display text-2xl font-bold tabular-nums ${
              finished ? 'text-moss' : urgent ? 'text-ember' : t.running ? 'text-white' : 'text-slate-300'
            }`}
            role="timer"
            aria-live="off"
          >
            <TimerIcon className={`h-4 w-4 shrink-0 ${t.running ? 'text-ember' : 'text-slate-500'}`} />
            {finished ? 'GO !' : fmt(t.left)}
          </div>

          <div className="flex flex-1 gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => timer.preset(p)}
                className={`flex-1 rounded-lg border px-1 py-1.5 text-xs font-semibold transition active:scale-95 ${
                  t.duration === p && (t.running || t.pausedLeft != null)
                    ? 'border-ember/60 bg-ember/15 text-orange-200'
                    : 'border-white/10 bg-white/[0.04] text-slate-300'
                }`}
              >
                {p}s
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={timer.toggle}
            aria-label={t.running ? 'Pause' : 'Démarrer'}
            className="grid h-9 w-9 place-items-center rounded-full bg-ember text-white shadow-[0_0_18px_-4px_#f97316] active:scale-90"
          >
            {t.running ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
          </button>
          <button
            type="button"
            onClick={finished ? timer.dismiss : timer.reset}
            aria-label={finished ? 'Fermer' : 'Réinitialiser'}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-slate-300 active:scale-90"
          >
            {finished ? <X className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
          </button>
        </div>
        <div className="h-0.5 w-full bg-white/5">
          <div
            className={`h-full transition-[width] duration-200 ease-linear ${finished ? 'bg-moss' : urgent ? 'bg-red-500' : 'bg-ember'}`}
            style={{ width: `${(finished ? 1 : pct) * 100}%` }}
          />
        </div>
      </div>
    </>
  )
}
