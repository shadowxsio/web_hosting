// Planche de contrôle visuel des illustrations (dev uniquement : /#figures).
import { FIGURES, Figure, type AnimationId } from './figures'

export function FigureGallery() {
  return (
    <div className="grid grid-cols-4 gap-2 bg-ink p-2">
      {(Object.keys(FIGURES) as AnimationId[]).filter((id) => !location.search || location.search.includes(id)).flatMap((id) =>
        [0, 1].map((t) => (
          <div key={`${id}-${t}`} className="rounded-lg border border-white/10">
            <p className="px-1 text-[10px] text-slate-400">
              {id} · {t ? 'fin' : 'départ'}
            </p>
            <div className="h-40 w-40">
              <Figure id={id} t={t} />
            </div>
          </div>
        )),
      )}
    </div>
  )
}
