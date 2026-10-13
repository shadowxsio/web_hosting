import { ImageOff, Pause, Play, Video } from 'lucide-react'
import { useEffect, useState } from 'react'
import { DEMOS, videoUrl } from '../data/demos'
import type { Exercise } from '../data/program'

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Boucle « GIF » départ ↔ fin à partir de deux photos, + lien vidéo. */
export function DemoPlayer({ ex }: { ex: Exercise }) {
  const own = ex.photos?.length === 2 ? ex.photos : null
  const demo = own ? { photos: true, note: undefined, video: ex.video ?? ex.name } : DEMOS[ex.id]
  const [frame, setFrame] = useState(0)
  const [playing, setPlaying] = useState(!reduced())

  useEffect(() => {
    if (!demo?.photos || !playing) return
    const id = window.setInterval(() => setFrame((f) => 1 - f), 1100)
    return () => window.clearInterval(id)
  }, [demo, playing])

  const query = demo?.video ?? ex.video ?? `${ex.name} exercise`
  const base = import.meta.env.BASE_URL

  return (
    <section>
      <h3 className="label mb-2">Photo réelle</h3>
      {demo?.photos ? (
        <div className="b-card overflow-hidden !shadow-[0_4px_0_var(--color-shadow)]">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="relative block aspect-[4/3] w-full bg-paper-2"
            aria-label={playing ? 'Mettre la démo en pause' : 'Lancer la démo'}
          >
            {[0, 1].map((i) => (
              <img
                key={i}
                src={own ? own[i] : `${base}demos/${ex.id}-${i}.webp`}
                alt={`${ex.name} — ${i === 0 ? 'position 1' : 'position 2'}`}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
                style={{ opacity: frame === i ? 1 : 0 }}
              />
            ))}
            <span className="tag absolute left-2 top-2 h-6 bg-sun px-2 text-[10px]">{frame === 0 ? 'Position 1' : 'Position 2'}</span>
            <span className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full border-2 border-ink bg-paper">
              {playing ? <Pause className="h-3.5 w-3.5" fill="currentColor" /> : <Play className="ml-0.5 h-3.5 w-3.5" fill="currentColor" />}
            </span>
          </button>
          {demo.note && <p className="border-t-2 border-ink px-3 py-2 text-[12px] font-semibold leading-snug">{demo.note}</p>}
        </div>
      ) : (
        <p className="flex items-center gap-2 border-2 border-dashed border-ink/50 px-3 py-3 text-[12px] font-semibold text-ink/75 rounded-xl">
          <ImageOff className="h-4 w-4 shrink-0" /> Pas de photo libre de droits pour cet exercice : le schéma ci-dessus et la vidéo montrent le mouvement.
        </p>
      )}
      <a
        href={videoUrl(query)}
        target="_blank"
        rel="noopener noreferrer"
        className="b-btn mt-3 flex h-11 items-center justify-center gap-2 text-[13px] uppercase tracking-wide"
      >
        <Video className="h-4 w-4" /> Voir une démo vidéo
      </a>
    </section>
  )
}
