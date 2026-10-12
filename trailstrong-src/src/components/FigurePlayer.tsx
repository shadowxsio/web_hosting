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

export function FigurePlayer({ id, active = true }: { id: AnimationId; active?: boolean }) {
  const [mode, setMode] = useState<'play' | 'paused' | 'start' | 'end'>(reduced() ? 'start' : 'play')
  const { ref, t } = useAnimT(id, active && mode === 'play')
  const shown = mode === 'start' ? 0 : mode === 'end' ? 1 : t
  const labels = FIGURES[id].label ?? ['Départ', 'Fin']
  return (
    <div className="dot-grid relative overflow-hidden rounded-xl border border-line bg-ink-2">
      <div ref={ref} className="relative mx-auto aspect-[16/11] w-full max-w-[280px]">
        <Figure id={id} t={shown} />
      </div>
      <span className="absolute left-2 top-2 rounded-md border border-line bg-ink/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-glacier">
        {shown < 0.5 ? labels[0] : labels[1]}
      </span>
      <div className="absolute right-2 top-2 flex flex-col items-end gap-1 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-ember" /> hanche
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-glacier" /> genou / cheville
        </span>
      </div>
      <div className="flex items-center justify-center gap-1 border-t border-line p-1.5" data-noswipe>
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
            className={`flex h-8 min-w-[64px] items-center justify-center gap-1 rounded-lg px-3 text-[11px] font-semibold transition duration-150 ${
              mode === m || (m === 'play' && mode === 'paused') ? 'bg-glacier/15 text-cyan-200' : 'text-slate-500 hover:text-slate-300'
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
    </div>
  )
}
