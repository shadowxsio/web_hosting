import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { FIGURES, Figure, type AnimationId } from './figures'

const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2)

/** Cycle : maintien départ → montée → maintien fin → retour. */
function phaseToT(p: number) {
  if (p < 0.15) return 0
  if (p < 0.5) return ease((p - 0.15) / 0.35)
  if (p < 0.65) return 1
  return 1 - ease((p - 0.65) / 0.35)
}

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Horloge d'animation, suspendue hors écran (IntersectionObserver). */
function useAnimT(id: AnimationId, playing: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  const [t, setT] = useState(0)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '80px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    if (!playing || !visible) return
    const dur = FIGURES[id].duration ?? 2400
    let raf = 0
    const t0 = performance.now()
    const loop = (now: number) => {
      setT(phaseToT(((now - t0) % dur) / dur))
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [id, playing, visible])
  return { ref, t }
}

export function FigureThumb({ id }: { id: AnimationId }) {
  const { ref, t } = useAnimT(id, !reduced())
  return (
    <div ref={ref} className="h-full w-full">
      <Figure id={id} t={reduced() ? 1 : t} />
    </div>
  )
}

export function FigurePlayer({ id }: { id: AnimationId }) {
  const [mode, setMode] = useState<'play' | 'paused' | 'start' | 'end'>(reduced() ? 'start' : 'play')
  const { ref, t } = useAnimT(id, mode === 'play')
  const shown = mode === 'start' ? 0 : mode === 'end' ? 1 : t
  const labels = FIGURES[id].label ?? ['Départ', 'Fin']
  return (
    <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-slate-900/80 to-ink/80 p-2">
      <div ref={ref} className="relative mx-auto aspect-square w-full max-w-[280px]">
        <Figure id={id} t={shown} />
        <span className="absolute left-1 top-1 rounded-md bg-ink/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-glacier">
          {shown < 0.5 ? labels[0] : labels[1]}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-center gap-1.5" data-noswipe>
        {(
          [
            ['start', labels[0]],
            ['play', null],
            ['end', labels[1]],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m === 'play' && mode === 'play' ? 'paused' : m)}
            aria-label={m === 'play' ? 'Lecture' : label!}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              mode === m || (m === 'play' && mode === 'paused') ? 'bg-glacier/20 text-sky-200' : 'bg-white/[0.04] text-slate-400'
            }`}
          >
            {m === 'play' ? (
              mode === 'play' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />
            ) : (
              label
            )}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-center text-[11px] text-slate-500">
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-glacier align-middle" />
        zone musculaire ciblée
      </p>
    </div>
  )
}
