import { Pause, Play, RotateCcw, X } from 'lucide-react'
import { timer, useTimer } from '../lib/timer'

const PRESETS = [60, 90, 120]

export const fmt = (s: number) => {
  const t = Math.ceil(s)
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

/** Widget de récupération flottant, en verre dépoli, ancré en bas de l'écran. */
export function TimerBar() {
  const t = useTimer()
  const pct = t.duration > 0 ? Math.min(1, t.left / t.duration) : 0
  const finished = t.finishedAt != null
  const urgent = t.running && t.left <= 5
  const active = t.running || t.pausedLeft != null

  return (
    <>
      {finished && (
        <button
          type="button"
          onClick={timer.dismiss}
          className="flash fixed inset-0 z-40 bg-gradient-to-t from-moss/35 via-moss/10 to-transparent"
          aria-label="Fermer l’alerte de fin de repos"
        />
      )}
      <div className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-3">
        <div
          className={`glass pointer-events-auto mx-auto max-w-xl overflow-hidden rounded-2xl shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)] transition-colors duration-200 ${
            finished ? 'border-moss/50' : active ? 'border-white/10' : ''
          }`}
          data-noswipe
        >
          {/* Jauge fine : dégradé orange → violet */}
          <div className="h-[3px] w-full bg-white/[0.04]">
            <div
              className={`h-full transition-[width] duration-200 ease-linear ${
                finished ? 'bg-moss' : urgent ? 'bg-red-500' : 'bg-gradient-to-r from-ember to-iris'
              }`}
              style={{ width: `${(finished ? 1 : pct) * 100}%` }}
            />
          </div>

          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="min-w-[96px]">
              <p className="label !text-[9px] !text-slate-500">
                {finished ? 'Repos terminé' : t.running ? 'Récupération' : active ? 'En pause' : 'Chrono repos'}
              </p>
              <p
                role="timer"
                className={`font-mono text-[34px] font-bold leading-none tracking-tight tabular-nums transition-colors ${
                  finished ? 'text-moss' : urgent ? 'text-ember' : t.running ? 'text-fg' : 'text-slate-400'
                }`}
              >
                {finished ? 'GO' : fmt(t.left)}
              </p>
            </div>

            <div className="grid flex-1 grid-cols-3 gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => timer.preset(p)}
                  className={`h-8 rounded-lg font-mono text-[11px] font-semibold transition duration-150 active:scale-95 ${
                    t.duration === p && active
                      ? 'bg-iris/20 text-violet-200 shadow-[0_0_14px_-4px_#8b5cf6]'
                      : 'bg-chip text-slate-400'
                  }`}
                >
                  {p}s
                </button>
              ))}
              <button
                type="button"
                onClick={() => timer.adjust(-10)}
                className="h-8 rounded-lg bg-chip font-mono text-[11px] font-semibold text-slate-400 transition duration-150 active:scale-95"
              >
                −10s
              </button>
              <button
                type="button"
                onClick={() => timer.adjust(30)}
                className="col-span-2 h-8 rounded-lg bg-chip font-mono text-[11px] font-semibold text-slate-300 transition duration-150 active:scale-95"
              >
                +30s
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={timer.toggle}
                aria-label={t.running ? 'Pause' : 'Démarrer'}
                className="grid h-11 w-11 place-items-center rounded-xl bg-ember text-white shadow-[0_0_20px_-6px_#f97316] transition duration-150 active:scale-90"
              >
                {t.running ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
              </button>
              <button
                type="button"
                onClick={finished ? timer.dismiss : timer.reset}
                aria-label={finished ? 'Fermer' : 'Réinitialiser'}
                className="grid h-7 w-11 place-items-center rounded-lg text-slate-500 transition duration-150 active:scale-90 active:bg-white/5"
              >
                {finished ? <X className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
