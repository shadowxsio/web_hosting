/**
 * Premier lancement d'un compte : questionnaire (objectifs, zones sensibles,
 * matériel, niveau, rythme) → programme généré, prévisualisé, puis enregistré.
 */
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { routineOf } from '../data/cooldown'
import {
  EQUIP_LABEL,
  GOAL_LABEL,
  LEVEL_LABEL,
  PAIN_LABEL,
  SPORT_LABEL,
  generateProgram,
  type Answers,
  type Equip,
  type Goal,
  type Level,
  type Pain,
  type Sport,
} from '../data/generator'
import { buildProgram, type UserProgram } from '../lib/userProgram'
import { DIAGRAM_OF, ExerciseDiagram } from './ExerciseDiagram'
import { SESSION_META } from './meta'

const STEPS = ['Toi', 'Sport', 'Objectifs', 'Sensible', 'Matériel', 'Niveau', 'Rythme', 'Programme'] as const

export function Onboarding({
  defaultName,
  onDone,
  onUseBase,
}: {
  defaultName: string
  onDone: (program: UserProgram, a: Answers) => void
  onUseBase: () => void
}) {
  const [step, setStep] = useState(-1)
  const [a, setA] = useState<Answers>({ name: defaultName, sport: 'trail', goals: [], pains: [], equip: 'gym', level: 'intermediate', perWeek: 2, minutes: 45 })
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg')
  const [weight, setWeight] = useState('')
  const set = (p: Partial<Answers>) => setA((cur) => ({ ...cur, ...p }))
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const program = useMemo(() => (step === STEPS.length - 1 ? generateProgram(a) : null), [step, a])
  const canNext = step === 0 ? a.name.trim().length > 0 : step === 2 ? a.goals.length > 0 : true

  const finish = () => {
    const w = parseFloat(weight.replace(',', '.'))
    const weightKg = Number.isFinite(w) && w > 0 ? Math.round((unit === 'lbs' ? w / 2.20462 : w) * 10) / 10 : undefined
    onDone(program!, { ...a, name: a.name.trim(), weightKg })
  }

  if (step === -1)
    return (
      <Frame>
        <p className="tag h-7 -rotate-1 bg-sun px-2 text-[11px]">Bienvenue</p>
        <h1 className="headline mt-4 text-[34px] [text-shadow:2px_2px_0_#f0773a]">Salut {defaultName || 'toi'} !</h1>
        <p className="mt-3 text-[15px] font-semibold leading-snug">
          En 7 questions, je te prépare des séances de renforcement adaptées à ton sport, tes objectifs et ton matériel, avec schémas, photos, tempo guidé et retour au calme.
        </p>
        <button type="button" onClick={() => setStep(0)} className="b-btn mt-6 flex h-14 w-full items-center justify-center gap-2 bg-flame text-[15px] uppercase italic">
          <Sparkles className="h-5 w-5" strokeWidth={2.5} /> Créer mon programme
        </button>
        <button type="button" onClick={onUseBase} className="b-btn mt-3 flex min-h-12 w-full flex-col items-center justify-center px-3 py-2 text-[13px] uppercase italic">
          Prendre le programme TrailStrong de base
          <span className="text-[11px] font-semibold normal-case not-italic opacity-75">Trail, en salle : genoux, chevilles, ischios, fessiers</span>
        </button>
      </Frame>
    )

  return (
    <Frame>
      <div className="flex items-center gap-1.5" aria-label={`Étape ${step + 1} sur ${STEPS.length}`}>
        {STEPS.map((s, i) => (
          <span key={s} className={`h-2 flex-1 border-2 border-ink ${i <= step ? 'bg-flame' : 'bg-paper'}`} />
        ))}
      </div>
      <p className="label mt-3">
        {step + 1}/{STEPS.length} · {STEPS[step]}
      </p>

      {step === 0 && (
        <>
          <Q>Comment tu t’appelles ?</Q>
          <input id="ob-name" value={a.name} onChange={(e) => set({ name: e.target.value })} maxLength={30} className="b-input h-12 w-full px-3 text-[16px]" placeholder="Prénom" />
          <Q sub="Facultatif : sert à doser protéines, glucides et eau dans le bilan.">Ton poids</Q>
          <div className="flex gap-2">
            <input id="ob-weight" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="ex. 70" className="b-input h-12 min-w-0 flex-1 px-3 font-mono text-[16px]" />
            {(['kg', 'lbs'] as const).map((u) => (
              <button key={u} type="button" onClick={() => setUnit(u)} className={`b-btn h-12 w-14 text-[13px] uppercase italic ${unit === u ? 'b-btn-ink' : ''}`}>
                {u}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <Q>Ton sport principal ?</Q>
          <Choices<Sport> options={SPORT_LABEL} value={[a.sport]} onPick={(v) => set({ sport: v })} />
        </>
      )}

      {step === 2 && (
        <>
          <Q sub="Plusieurs choix possibles.">Sur quoi veux-tu te renforcer ?</Q>
          <Choices<Goal> options={GOAL_LABEL} value={a.goals} onPick={(v) => set({ goals: toggle(a.goals, v) })} multi />
        </>
      )}

      {step === 3 && (
        <>
          <Q sub="Les exercices à risque seront évités, et ceux qui protègent ces zones mis en avant.">Une zone sensible ou douloureuse ?</Q>
          <Choices<Pain> options={PAIN_LABEL} value={a.pains} onPick={(v) => set({ pains: toggle(a.pains, v) })} multi />
          <button type="button" onClick={() => set({ pains: [] })} className={`b-btn mt-2 h-12 w-full text-[14px] uppercase italic ${a.pains.length === 0 ? 'b-btn-ink' : ''}`}>
            Aucune
          </button>
          <p className="mt-3 text-[12px] font-semibold text-ink/65">En cas de douleur persistante, demande l’avis d’un professionnel de santé.</p>
        </>
      )}

      {step === 4 && (
        <>
          <Q>Où vas-tu t’entraîner ?</Q>
          <Choices<Equip> options={EQUIP_LABEL} value={[a.equip]} onPick={(v) => set({ equip: v })} />
        </>
      )}

      {step === 5 && (
        <>
          <Q>Ton niveau en renforcement ?</Q>
          <Choices<Level> options={LEVEL_LABEL} value={[a.level]} onPick={(v) => set({ level: v })} />
        </>
      )}

      {step === 6 && (
        <>
          <Q>Combien de séances par semaine ?</Q>
          <div className="grid grid-cols-2 gap-2">
            {([2, 3] as const).map((n) => (
              <button key={n} type="button" onClick={() => set({ perWeek: n })} className={`b-btn h-14 text-[16px] uppercase italic ${a.perWeek === n ? 'b-btn-ink' : ''}`}>
                {n} séances
              </button>
            ))}
          </div>
          <Q>Combien de temps par séance ?</Q>
          <div className="grid grid-cols-3 gap-2">
            {([30, 45, 60] as const).map((m) => (
              <button key={m} type="button" onClick={() => set({ minutes: m })} className={`b-btn h-14 text-[16px] uppercase italic ${a.minutes === m ? 'b-btn-ink' : ''}`}>
                {m} min
              </button>
            ))}
          </div>
        </>
      )}

      {step === 7 && program && <Preview program={program} />}

      <div className="mt-6 grid grid-cols-[1fr_1.6fr] gap-3">
        <button type="button" onClick={() => setStep((s) => s - 1)} className="b-btn flex h-12 items-center justify-center gap-1.5 text-[14px] uppercase italic">
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} /> {step === 7 ? 'Modifier' : 'Retour'}
        </button>
        {step < 7 ? (
          <button type="button" disabled={!canNext} onClick={() => setStep((s) => s + 1)} className="b-btn flex h-12 items-center justify-center gap-1.5 bg-flame text-[14px] uppercase italic disabled:opacity-40">
            {step === 6 ? 'Voir mon programme' : 'Suivant'} <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </button>
        ) : (
          <button type="button" onClick={finish} className="b-btn flex h-12 items-center justify-center gap-1.5 bg-mint text-[14px] uppercase italic">
            <Check className="h-4 w-4" strokeWidth={3} /> C’est parti
          </button>
        )}
      </div>
    </Frame>
  )
}

function Preview({ program }: { program: UserProgram }) {
  const sessions = buildProgram(program).filter((s) => s.exercises.length)
  return (
    <div>
      <Q sub="Tu pourras ajouter ou retirer des exercices, et refaire ce questionnaire depuis le Menu.">Ton programme</Q>
      <div className="space-y-4">
        {sessions.map((s) => (
          <section key={s.id} className="b-card overflow-hidden !shadow-[3px_3px_0_var(--color-shadow)]">
            <header className={`border-b-2 border-ink px-3 py-2 ${SESSION_META[s.id].bg}`}>
              <p className="text-[15px] font-black uppercase italic leading-tight">{s.title}</p>
              <p className="text-[12px] font-bold">
                {s.subtitle} · {s.duration}
              </p>
            </header>
            <ul className="grid grid-cols-2 gap-2 p-2">
              {s.exercises.map((ex) => {
                const d = ex.diagram ?? DIAGRAM_OF[ex.id]
                return (
                  <li key={ex.id} className="border-2 border-ink bg-paper">
                    {d && (
                      <div className="hero aspect-[5/4] border-b-2 border-ink !border-t-0">
                        <ExerciseDiagram id={d} />
                      </div>
                    )}
                    <p className="px-1.5 pt-1 text-[12px] font-black leading-tight">{ex.name}</p>
                    <p className="px-1.5 pb-1.5 text-[11px] font-semibold text-ink/70">
                      {ex.sets} × {ex.reps}
                    </p>
                  </li>
                )
              })}
            </ul>
            {routineOf(s).length > 0 && (
              <p className="border-t-2 border-ink px-3 py-1.5 text-[11px] font-bold">
                🧘 Retour au calme : {routineOf(s)
                  .map((r) => r.name)
                  .join(', ')}
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="hero pt-safe pb-safe flex min-h-dvh flex-col items-center !border-0 px-4 py-8">
      <div className="mb-6 -rotate-2 border-[2.5px] border-ink bg-paper p-1 shadow-[5px_5px_0_var(--color-shadow)]">
        <span className="block border-2 border-dashed border-ink px-4 py-2">
          <span className="headline block text-[26px]">TrailStrong</span>
        </span>
      </div>
      <div className="b-card w-full max-w-[520px] p-5">{children}</div>
    </div>
  )
}

function Q({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-3 mt-5">
      <h2 className="text-[20px] font-black uppercase italic leading-tight">{children}</h2>
      {sub && <p className="mt-1 text-[13px] font-semibold text-ink/70">{sub}</p>}
    </div>
  )
}

function Choices<T extends string>({ options, value, onPick, multi }: { options: Record<T, string>; value: T[]; onPick: (v: T) => void; multi?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-2" role={multi ? 'group' : 'radiogroup'}>
      {(Object.entries(options) as [T, string][]).map(([k, label]) => {
        const on = value.includes(k)
        return (
          <button
            key={k}
            type="button"
            role={multi ? 'checkbox' : 'radio'}
            aria-checked={on}
            onClick={() => onPick(k)}
            className={`b-btn min-h-14 px-2 py-2 text-[14px] leading-tight ${on ? 'b-btn-ink' : ''}`}
          >
            {on && multi ? '✓ ' : ''}
            {label}
          </button>
        )
      })}
    </div>
  )
}
