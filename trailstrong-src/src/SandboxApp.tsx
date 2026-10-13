/**
 * App en mode « profil de test » : questionnaire → programme → app complète,
 * avec un bandeau permanent. Aucune synchro, tout est effacé à la sortie.
 */
import { FlaskConical, LogOut } from 'lucide-react'
import { useState } from 'react'
import { Shell } from './App'
import { Onboarding } from './components/Onboarding'
import { scoped } from './lib/account'
import { exitSandbox } from './lib/sandbox'
import { updateProfile } from './lib/storage'
import { setUserProgram } from './lib/userProgram'

const ONBOARDED = scoped('trailstrong:onboarded')

export default function SandboxApp() {
  const [phase, setPhase] = useState<'onboard' | 'ready'>(() => (localStorage.getItem(ONBOARDED) ? 'ready' : 'onboard'))
  const ready = () => {
    localStorage.setItem(ONBOARDED, '1')
    localStorage.removeItem('trailstrong:view')
    setPhase('ready')
  }

  return (
    <>
      <div className="sticky top-0 z-[45] flex items-center gap-2 border-b-[2.5px] border-ink bg-lilac px-3 py-1.5 pt-safe" role="status">
        <FlaskConical className="h-4 w-4 shrink-0" strokeWidth={2.5} />
        <p className="min-w-0 flex-1 text-[12px] font-black uppercase italic leading-tight">Profil de test · rien n’est sauvegardé</p>
        <button type="button" onClick={exitSandbox} className="flex h-8 shrink-0 items-center gap-1 border-2 border-ink bg-[#fbf3e4] px-2 text-[11px] font-black uppercase italic">
          <LogOut className="h-3.5 w-3.5" strokeWidth={2.5} /> Quitter
        </button>
      </div>
      {phase === 'onboard' ? (
        <Onboarding
          defaultName="Testeur"
          onUseBase={() => {
            setUserProgram(null)
            ready()
          }}
          onDone={(program, a) => {
            setUserProgram(program)
            updateProfile({ name: a.name, ...(a.weightKg ? { weightKg: a.weightKg } : {}), sport: a.sport, goals: a.goals, pains: a.pains, equip: a.equip, level: a.level })
            ready()
          }}
        />
      ) : (
        <Shell
          onLock={exitSandbox}
          cloud={{
            email: 'Profil de test',
            status: 'rien n’est sauvegardé, tout s’efface à la sortie',
            onRedoProgram: () => setPhase('onboard'),
            logoutLabel: 'Quitter le profil de test',
          }}
        />
      )}
    </>
  )
}
