import { Check } from 'lucide-react'
import type { Exercise, SessionId } from '../data/program'
import { useExerciseLog } from '../lib/useExerciseLog'
import { Pill, SESSION_META, categoryOf, iconOf, restLabel } from './meta'

/**
 * Fiche compacte du catalogue (façon annuaire quelleia) :
 * étiquette de séance, nom + catégorie + pastille genou, 2 lignes d'objectif,
 * pilules de protocole, perf précédente en grand et validation directe.
 */
export function ExerciseTile({
  ex,
  sessionId,
  index,
  date,
  onOpen,
}: {
  ex: Exercise
  sessionId: SessionId
  index: number
  date: string
  onOpen: () => void
}) {
  const { done, toggleDone, doneSets, sets, prev, maxToday } = useExerciseLog(ex, date)
  const Icon = iconOf(ex)
  const s = SESSION_META[sessionId]
  const tid = ex.trackId ?? ex.id
  const kneeFocus = ex.tags.includes('knee')

  return (
    <article className={`fade-up relative pt-3 transition-opacity duration-200 ${done ? 'opacity-70' : ''}`}>
      {/* Étiquette-onglet de séance */}
      <span className={`absolute left-3 top-0 z-10 rounded-t-md border border-b-0 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${s.tab}`}>
        {s.label} · {String(index + 1).padStart(2, '0')}
      </span>

      <div className={`card overflow-hidden transition-colors duration-200 ${done ? '!border-emerald-500/40' : 'hover:border-zinc-700'}`}>
        <button type="button" onClick={onOpen} className="block w-full p-3.5 pb-3 text-left" aria-label={`Ouvrir ${ex.name}`}>
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300">
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="flex items-center gap-1.5 text-[15px] font-semibold leading-tight tracking-tight text-zinc-50">
                <span className="truncate">{ex.name}</span>
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${kneeFocus ? 'bg-cyan-500' : 'bg-emerald-500'}`}
                  title={kneeFocus ? 'Cible la protection du genou' : 'Sans risque pour le genou'}
                  aria-label={kneeFocus ? 'Cible la protection du genou' : 'Sans risque pour le genou'}
                />
              </h3>
              <p className="mt-0.5 text-[12px] text-zinc-500">{categoryOf(ex)}</p>
            </div>
            {prev && (
              <div className="shrink-0 text-right">
                <p className="label !text-[9px]">Préc.</p>
                <p className="font-mono text-xl font-semibold leading-none tabular-nums text-zinc-100">
                  {prev.value}
                  <span className="ml-0.5 text-[10px] font-medium text-zinc-500">{prev.unit}</span>
                </p>
              </div>
            )}
          </div>

          {ex.cue && <p className="mt-2.5 line-clamp-2 text-[13px] leading-snug text-zinc-400">{ex.cue}</p>}

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Pill>{ex.sets > 1 ? `${ex.sets} séries` : '1 bloc'}</Pill>
            <Pill>{ex.reps}</Pill>
            {ex.rest > 0 && <Pill>Repos {restLabel(ex.rest)}</Pill>}
            {ex.equipment && <Pill>{ex.equipment}</Pill>}
          </div>
        </button>

        {/* Pied de carte */}
        <div className="flex items-center gap-2 border-t border-zinc-800/80 px-3.5 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 text-[12px] text-zinc-500">
            {ex.mode !== 'treadmill' &&
              sets.map((x, i) => <span key={i} className={`h-1.5 w-4 rounded-full ${x.done ? 'bg-emerald-500' : 'bg-zinc-800'}`} />)}
            <span className="ml-1 truncate">
              {done
                ? `Complété${maxToday ? ` · ${maxToday} lbs` : ''}`
                : ex.mode === 'treadmill'
                  ? 'À faire'
                  : `${doneSets.length}/${sets.length} séries`}
            </span>
          </div>
          <button
            type="button"
            id={`check-${tid}`}
            onClick={toggleDone}
            aria-pressed={done}
            className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-semibold transition duration-150 active:scale-95 ${
              done ? 'pop border-emerald-500/40 bg-emerald-500/15 text-emerald-300' : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700'
            }`}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
            {done ? 'Validé' : 'Valider'}
          </button>
        </div>
      </div>
    </article>
  )
}
