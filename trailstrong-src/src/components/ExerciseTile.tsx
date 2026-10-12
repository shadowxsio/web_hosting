import { Check } from 'lucide-react'
import type { Exercise, SessionId } from '../data/program'
import { useExerciseLog } from '../lib/useExerciseLog'
import { Pill, SESSION_META, categoryOf, iconOf, restLabel } from './meta'

// Légères rotations alternées, comme les fiches de classement quelleia.
const TILT = ['-rotate-[0.6deg]', 'rotate-[0.4deg]', '-rotate-[0.3deg]', 'rotate-[0.7deg]']
const TAB_TILT = ['-rotate-1', 'rotate-[0.5deg]', '-rotate-[1.5deg]', 'rotate-1']

/**
 * Fiche du catalogue : étiquette-onglet colorée, pastille icône, nom + catégorie,
 * perf précédente en gros chiffre italique, pilules de protocole, validation.
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
    <article className="fade-up relative pt-[26px]">
      {/* Étiquette-onglet */}
      <span
        className={`tag absolute left-4 top-0 z-10 h-7 border-b-0 px-2.5 text-[11px] ${TAB_TILT[index % 4]} ${done ? 'bg-mint' : s.bg}`}
      >
        {done ? '✓ Validé' : `${s.label} · ${String(index + 1).padStart(2, '0')}`}
      </span>

      <div className={`b-card relative ${TILT[index % 4]} transition-transform duration-150`}>
        <button type="button" onClick={onOpen} className="block w-full px-4 pb-3 pt-4 text-left" aria-label={`Ouvrir ${ex.name}`}>
          <div className="flex items-center gap-3.5">
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border-[2.5px] border-ink bg-sky shadow-[2px_2px_0_var(--color-shadow)]`}>
              <Icon className="h-5 w-5 text-ink" strokeWidth={2.4} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[16px] font-extrabold leading-tight text-ink">{ex.name}</h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold text-ink/65">
                <span className="truncate">{categoryOf(ex)}</span>
                <span
                  className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full border-2 border-ink ${kneeFocus ? 'bg-sky' : 'bg-mint'}`}
                  title={kneeFocus ? 'Cible la protection du genou' : 'Sans risque pour le genou'}
                  aria-label={kneeFocus ? 'Cible la protection du genou' : 'Sans risque pour le genou'}
                />
              </p>
            </div>
            {prev && (
              <div className="shrink-0 text-right">
                <p className="text-[30px] font-black italic leading-none tracking-tight text-ink">{prev.value.replace('.', ',')}</p>
                <p className="text-[10px] font-extrabold uppercase italic text-ink/60">{prev.unit} · préc.</p>
              </div>
            )}
          </div>

          {ex.cue && <p className="mt-3 line-clamp-2 text-[13px] font-medium leading-snug text-ink/80">{ex.cue}</p>}

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Pill tone="sun">{ex.sets > 1 ? `${ex.sets} séries` : '1 bloc'}</Pill>
            <Pill>{ex.reps}</Pill>
            {ex.rest > 0 && <Pill>Repos {restLabel(ex.rest)}</Pill>}
            {ex.equipment && <Pill>{ex.equipment}</Pill>}
          </div>
        </button>

        <div className="flex items-center gap-2 border-t-2 border-dashed border-ink/40 px-4 py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-1 text-[12px] font-bold text-ink/70">
            {ex.mode !== 'treadmill' &&
              sets.map((x, i) => (
                <span
                  key={i}
                  className={`h-3 w-3 border-2 border-ink ${
                    x.done ? 'bg-leaf' : x.L?.done || x.R?.done ? 'bg-[linear-gradient(90deg,var(--color-leaf)_50%,var(--color-paper)_50%)]' : 'bg-paper'
                  }`}
                />
              ))}
            <span className="ml-1.5 truncate">
              {done ? `Complété${maxToday ? ` · ${maxToday} lbs` : ''}` : ex.mode === 'treadmill' ? 'À faire' : `${doneSets.length}/${sets.length} séries`}
            </span>
          </div>
          <button
            type="button"
            id={`check-${tid}`}
            onClick={toggleDone}
            aria-pressed={done}
            className={`b-btn flex h-10 items-center gap-1.5 px-3 text-[12px] uppercase italic ${done ? 'pop bg-mint' : ''}`}
          >
            <Check className="h-4 w-4" strokeWidth={3.5} />
            {done ? 'Validé' : 'Valider'}
          </button>
        </div>
      </div>
    </article>
  )
}
