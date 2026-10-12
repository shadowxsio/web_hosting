import { Pause, Play, RotateCcw, Timer as TimerIcon } from 'lucide-react'
import { timer, useTimer } from '../lib/timer'

export const fmt = (s: number) => {
  const t = Math.ceil(s)
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

/** Chrono « Now Playing » : bandeau de 52 px, au-dessus du dock sur mobile. */
export function TimerBar() {
  const t = useTimer()
  const pct = t.duration > 0 ? Math.min(1, t.left / t.duration) : 0
  const finished = t.finishedAt != null
  const active = t.running || t.pausedLeft != null

  return (
    <>
      {finished && (
        <button type="button" onClick={timer.dismiss} aria-label="Fermer l’alerte de fin de repos" className="flash fixed inset-0 z-30 bg-mint/40" />
      )}
      <div
        className="pointer-events-none fixed inset-x-0 z-40 px-3 bottom-[calc(72px+env(safe-area-inset-bottom))] md:bottom-4"
        data-noswipe
      >
        <div
          className={`pointer-events-auto relative mx-auto flex h-[52px] max-w-xl items-center gap-1.5 overflow-hidden border-[2.5px] border-ink pl-3 pr-1.5 shadow-[4px_4px_0_#1b1424] transition-colors duration-200 ${
            finished ? 'bg-mint' : 'bg-paper'
          }`}
        >
          <button
            type="button"
            onClick={finished ? timer.dismiss : timer.reset}
            aria-label={finished ? 'Fermer' : 'Réinitialiser le chrono'}
            className="flex min-w-[96px] items-center gap-2 text-left"
          >
            {active ? <RotateCcw className="h-4 w-4 text-ink/60" strokeWidth={2.5} /> : <TimerIcon className="h-4 w-4" strokeWidth={2.5} />}
            <span className="leading-none">
              <span role="timer" className={`block text-[22px] font-black italic tabular-nums ${t.running || finished ? 'text-ink' : 'text-ink/60'}`}>
                {finished ? '00:00' : fmt(t.left)}
              </span>
              <span className="text-[9px] font-extrabold uppercase tracking-wide text-ink/60">
                {finished ? 'Repos terminé !' : t.running ? 'Récupération' : active ? 'En pause' : 'Repos'}
              </span>
            </span>
          </button>

          <div className="ml-auto flex items-center gap-1">
            {[60, 90].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => timer.preset(p)}
                className={`h-8 border-2 px-2 text-[12px] font-black italic transition duration-150 active:translate-y-px ${
                  t.duration === p && active ? 'border-ink bg-sun' : 'border-transparent hover:border-ink'
                }`}
              >
                {p}s
              </button>
            ))}
            <button
              type="button"
              onClick={() => timer.adjust(30)}
              className="h-8 border-2 border-transparent px-2 text-[12px] font-black italic transition duration-150 hover:border-ink active:translate-y-px"
            >
              +30s
            </button>
          </div>

          <button
            type="button"
            onClick={timer.toggle}
            aria-label={t.running ? 'Pause' : 'Démarrer'}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-[2.5px] border-ink bg-flame text-ink transition duration-150 active:scale-90"
          >
            {t.running ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="ml-0.5 h-4 w-4" fill="currentColor" />}
          </button>

          {/* Progression 2 px */}
          <span className="absolute inset-x-0 bottom-0 h-[3px] bg-ink/10">
            <span className={`block h-full transition-[width] duration-200 ease-linear ${finished ? 'bg-leaf' : 'bg-flame'}`} style={{ width: `${(finished ? 1 : active ? pct : 0) * 100}%` }} />
          </span>
        </div>
      </div>
    </>
  )
}
