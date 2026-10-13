/**
 * Mode comptes (Firebase) : connexion Google → compte actif sur l'appareil →
 * migration des données locales ou questionnaire → app synchronisée.
 */
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Shell } from './App'
import { LoginScreen } from './components/LoginScreen'
import { Onboarding } from './components/Onboarding'
import type { Answers } from './data/generator'
import { ACCOUNT, switchAccount } from './lib/account'
import { sha256Hex } from './lib/auth'
import { currentUser, firebaseSignOut, signInWithGoogleToken, type User } from './lib/firebase'
import { getData, updateProfile } from './lib/storage'
import { hasLegacyData, importLegacy, loadUserDoc, newUserDoc, onSyncStatus, saveUserDoc, startSync, stopSync, syncStatus, type UserDoc } from './lib/sync'
import { setUserProgram, type UserProgram } from './lib/userProgram'

type Phase = 'boot' | 'login' | 'migrate' | 'onboard' | 'ready' | 'error'

const STATUS_LABEL: Record<string, string> = {
  idle: 'connexion…',
  syncing: 'synchronisation…',
  ok: 'synchronisé ✓',
  offline: 'hors-ligne : envoi au retour du réseau',
  error: 'synchro en attente (nouvel essai automatique)',
}

export default function CloudApp() {
  const [phase, setPhase] = useState<Phase>('boot')
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState('')
  const status = useSyncExternalStore(onSyncStatus, syncStatus)
  // Propriétaire de l'app (email autorisé au build) : accès au profil de test.
  const [isOwner, setIsOwner] = useState(false)
  useEffect(() => {
    if (user?.email) void sha256Hex(user.email.trim().toLowerCase()).then((h) => setIsOwner(__ALLOWED_EMAIL_HASHES__.includes(h)))
  }, [user])

  const boot = async () => {
    try {
      const u = await currentUser()
      if (!u) return setPhase('login')
      // Chaque compte a ses propres données sur l'appareil.
      if (ACCOUNT !== u.uid) return switchAccount(u.uid)
      setUser(u)
      let doc = await loadUserDoc(u.uid)
      if (!doc) {
        if (hasLegacyData()) return setPhase('migrate')
        doc = { ...newUserDoc(u), onboarded: false }
        await saveUserDoc(u.uid, doc)
      }
      await startSync(u, doc)
      if (!getData().profile.name && (doc.name || u.displayName)) updateProfile({ name: (doc.name || u.displayName || '').split(' ')[0] })
      setPhase(doc.onboarded ? 'ready' : 'onboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase('error')
    }
  }

  useEffect(() => {
    void boot()
    return () => stopSync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signOutAll = async () => {
    stopSync()
    await firebaseSignOut()
    switchAccount(null)
  }

  if (phase === 'boot') return <Splash text="Chargement de ton espace…" />
  if (phase === 'error')
    return (
      <Splash text={`Impossible d’ouvrir ton compte : ${error}`}>
        <button type="button" onClick={() => location.reload()} className="b-btn mt-4 h-12 w-full bg-sun uppercase italic">
          Réessayer
        </button>
        <button type="button" onClick={() => void signOutAll()} className="b-btn mt-2 h-11 w-full uppercase italic">
          Se déconnecter
        </button>
      </Splash>
    )

  if (phase === 'login')
    return (
      <LoginScreen
        onUnlock={() => {}}
        onGoogleToken={async (token) => {
          const u = await signInWithGoogleToken(token)
          if (ACCOUNT !== u.uid) switchAccount(u.uid)
          else void boot()
        }}
      />
    )

  if (phase === 'migrate' && user)
    return (
      <Splash text="Des séances sont déjà enregistrées sur cet appareil.">
        <p className="mt-2 text-[14px] font-semibold leading-snug">
          Les importer dans ton compte <b>{user.email}</b> ? Ton historique, tes exercices ajoutés et ton profil seront sauvegardés en ligne.
        </p>
        <button
          type="button"
          onClick={async () => {
            importLegacy()
            const doc: UserDoc = { ...newUserDoc(user), onboarded: true, program: null, profile: getData().profile }
            await saveUserDoc(user.uid, doc)
            await startSync(user, doc, { fresh: true })
            setPhase('ready')
          }}
          className="b-btn mt-5 h-12 w-full bg-mint text-[14px] uppercase italic"
        >
          Importer mes données
        </button>
        <button
          type="button"
          onClick={async () => {
            const doc: UserDoc = { ...newUserDoc(user), onboarded: false }
            await saveUserDoc(user.uid, doc)
            await startSync(user, doc)
            setPhase('onboard')
          }}
          className="b-btn mt-2 h-12 w-full text-[13px] uppercase italic"
        >
          Non, nouveau départ
        </button>
      </Splash>
    )

  if (phase === 'onboard' && user)
    return (
      <Onboarding
        defaultName={getData().profile.name || user.displayName?.split(' ')[0] || ''}
        onUseBase={async () => {
          setUserProgram(null)
          await saveUserDoc(user.uid, { onboarded: true, program: null })
          setPhase('ready')
        }}
        onDone={async (program: UserProgram, a: Answers) => {
          setUserProgram(program)
          updateProfile({
            name: a.name,
            ...(a.weightKg ? { weightKg: a.weightKg } : {}),
            sport: a.sport,
            goals: a.goals,
            pains: a.pains,
            equip: a.equip,
            level: a.level,
          })
          await saveUserDoc(user.uid, { onboarded: true, program, name: a.name })
          localStorage.removeItem('trailstrong:view')
          setPhase('ready')
        }}
      />
    )

  return (
    <Shell
      onLock={() => void signOutAll()}
      cloud={{
        email: user?.email ?? '',
        status: STATUS_LABEL[status] ?? status,
        onRedoProgram: () => setPhase('onboard'),
        isOwner,
      }}
    />
  )
}

function Splash({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <div className="hero pt-safe pb-safe flex min-h-dvh flex-col items-center justify-center !border-0 px-5">
      <div className="mb-7 -rotate-2 border-[2.5px] border-ink bg-paper p-1 shadow-[5px_5px_0_var(--color-shadow)]">
        <span className="block border-2 border-dashed border-ink px-4 py-2">
          <span className="headline block text-[30px]">TrailStrong</span>
        </span>
      </div>
      <div className="b-card w-full max-w-[380px] p-5">
        <p className="text-[16px] font-black uppercase italic leading-snug">{text}</p>
        {children}
      </div>
    </div>
  )
}
