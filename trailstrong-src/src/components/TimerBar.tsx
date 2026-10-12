import { Pause, Play, RotateCcw, Timer as TimerIcon } from 'lucide-react'
import { timer, useTimer } from '../lib/timer'

export const fmt = (s: number) => {
  const t = Math.ceil(s)
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

/** Chrono « Now Playing » : bandeau flottant de 52 px max, façon mini-lecteur audio. */
export function TimerBar() {
  const t = useTimer()
  const pct = t.duration > 0 ? Math.min(1, t.left / t.duration) : 0
  const finished = t.finishedAt != null
  const active = t.running || t.pausedLeft != null

  return (
    <>
      {finished && (
        <button
          type="button"
          onClick={timer.dismiss}
          aria-label="Fermer l’alerte de fin de repos"
          className="flash fixed inset-0 z-30 bg-emerald-500/15"
        />
      )}
      <div className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-3" data-noswipe>
        <div
          className={`pointer-events-auto relative mx-auto flex h-[52px] max-w-xl items-center gap-2 overflow-hidden rounded-xl border pl-3 pr-1.5 backdrop-blur-md transition-colors duration-200 ${
            finished ? 'border-emerald-500/40 bg-emerald-950/80' : 'border-zinc-800 bg-zinc-900/85'
          }`}
        >
          <button
            type="button"
            onClick={finished ? timer.dismiss : timer.reset}
            aria-label={finished ? 'Fermer' : 'Réinitialiser le chrono'}
            className="flex min-w-[92px] items-center gap-2 text-left"
          >
            {active ? (
              <RotateCcw className="h-3.5 w-3.5 text-zinc-500" />
            ) : (
              <TimerIcon className={`h-3.5 w-3.5 ${finished ? 'text-emerald-400' : 'text-zinc-500'}`} />
            )}
            <span className="leading-none">
              <span
                role="timer"
                className={`block font-mono text-[19px] font-semibold tabular-nums ${
                  finished ? 'text-emerald-300' : t.running ? 'text-zinc-50' : 'text-zinc-400'
                }`}
              >
                {finished ? '00:00' : fmt(t.left)}
              </span>
              <span className="text-[10px] text-zinc-500">{finished ? 'Repos terminé' : t.running ? 'Récupération' : active ? 'En pause' : 'Repos'}</span>
            </span>
          </button>

          <div className="ml-auto flex items-center gap-1">
            {[60, 90].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => timer.preset(p)}
                className={`h-8 rounded-md px-2.5 font-mono text-[11px] font-medium transition duration-150 active:scale-95 ${
                  t.duration === p && active ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:bg-zinc-800/60'
                }`}
              >
                {p}s
              </button>
            ))}
            <button
              type="button"
              onClick={() => timer.adjust(30)}
              className="h-8 rounded-md px-2.5 font-mono text-[11px] font-medium text-zinc-400 transition duration-150 hover:bg-zinc-800/60 active:scale-95"
            >
              +30s
            </button>
          </div>

          <button
            type="button"
            onClick={timer.toggle}
            aria-label={t.running ? 'Pause' : 'Démarrer'}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zinc-50 text-zinc-950 transition duration-150 active:scale-90"
          >
            {t.running ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="ml-0.5 h-4 w-4" fill="currentColor" />}
          </button>

          {/* Progression 2 px */}
          <span className="absolute inset-x-0 bottom-0 h-[2px] bg-zinc-800">
            <span
              className={`block h-full transition-[width] duration-200 ease-linear ${finished ? 'bg-emerald-500' : 'bg-orange-500'}`}
              style={{ width: `${(finished ? 1 : active ? pct : 0) * 100}%` }}
            />
          </span>
        </div>
      </div>
    </>
  )
}
