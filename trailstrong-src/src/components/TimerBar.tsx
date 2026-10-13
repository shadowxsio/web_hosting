import { Pause, Play, RotateCcw, Timer as TimerIcon } from 'lucide-react'
import { useMemo } from 'react'
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
  // Barre animée par le navigateur (aucun rendu React pendant le repos) : calée sur la fin prévue.
  const drain = useMemo(
    () => (t.endAt && t.duration > 0 ? { animation: `timer-drain ${t.duration}s linear ${-(t.duration - (t.endAt - Date.now()) / 1000)}s forwards` } : null),
    [t.endAt, t.duration],
  )

  return (
    <>
      {finished && (
        <button type="button" onClick={timer.dismiss} aria-label="Fermer l’alerte de fin de repos" className="flash fixed inset-0 z-30 bg-mint/40" />
      )}
      <div
        className="vt-timer pointer-events-none fixed inset-x-0 z-40 px-3 bottom-[calc(84px+env(safe-area-inset-bottom))] md:bottom-4"
        data-noswipe
      >
        <div
          data-tour="timer"
          className={`pointer-events-auto relative mx-auto flex h-[52px] max-w-xl items-center gap-1.5 overflow-hidden rounded-full pl-4 pr-1.5 transition-colors duration-200 ${
            finished ? 'border-2 border-ink bg-mint shadow-[0_4px_0_var(--color-shadow)]' : 'glass'
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
              <span role="timer" className={`block font-display text-[21px] tabular-nums ${t.running || finished ? 'text-ink' : 'text-ink/60'}`}>
                {finished ? '00:00' : fmt(t.left)}
              </span>
              <span className={`text-[9px] font-extrabold uppercase tracking-wide ${t.label ? 'text-flame' : 'text-ink/60'}`}>
                {finished ? (t.label ? `${t.label} : go !` : 'Repos terminé !') : t.label ? t.label : t.running ? 'Récupération' : active ? 'En pause' : 'Repos'}
              </span>
            </span>
          </button>

          <div className="ml-auto flex items-center gap-1">
            {[60, 90].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => timer.preset(p)}
                className={`h-8 rounded-full border-2 px-2 text-[12px] font-black transition duration-150 active:translate-y-px ${
                  t.duration === p && active ? 'border-ink bg-sun' : 'border-transparent hover:border-ink'
                }`}
              >
                {p}s
              </button>
            ))}
            <button
              type="button"
              onClick={() => timer.adjust(30)}
              className="h-8 rounded-full border-2 border-transparent px-2 text-[12px] font-black transition duration-150 hover:border-ink active:translate-y-px"
            >
              +30s
            </button>
          </div>

          <button
            type="button"
            onClick={timer.toggle}
            aria-label={t.running ? 'Pause' : 'Démarrer'}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-ink bg-flame text-ink transition duration-150 active:scale-90"
          >
            {t.running ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="ml-0.5 h-4 w-4" fill="currentColor" />}
          </button>

          {/* Progression 3 px */}
          <span className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-ink/10">
            <span
              key={t.endAt ?? 'still'}
              className={`block h-full origin-left will-change-transform ${finished ? 'bg-leaf' : 'bg-flame'}`}
              style={drain ?? { transform: `scaleX(${finished ? 1 : active ? pct : 0})` }}
            />
          </span>
        </div>
      </div>
    </>
  )
}
