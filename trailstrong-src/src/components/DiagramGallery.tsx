// Planche de contrôle des schémas (dev uniquement : /#schemas).
import { FIGURES, type AnimationId } from './diagram-base'
import { ExerciseDiagram } from './ExerciseDiagram'

export function DiagramGallery() {
  return (
    <div className="grid grid-cols-4 gap-3 p-3">
      {(Object.keys(FIGURES) as AnimationId[]).map((id) => (
        <div key={id} className="b-card diagram-bg p-1">
          <p className="px-1 text-[10px] font-bold">{id}</p>
          <div className="aspect-square">
            <ExerciseDiagram id={id} />
          </div>
        </div>
      ))}
    </div>
  )
}
