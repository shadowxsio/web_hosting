import { KeyRound, Lock, WifiOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { googleConfigured, renderGoogleButton, verifyCredential } from '../lib/googleAuth'
import { PinLock } from './PinLock'
import { haptic } from '../lib/haptics'

/** Écran d'accès : connexion Google (compte autorisé) ; PIN en secours. */
export function LoginScreen({ onUnlock, onGoogleToken }: { onUnlock: () => void; onGoogleToken?: (token: string) => Promise<void> }) {
  const btn = useRef<HTMLDivElement>(null)
  const cloud = !!onGoogleToken
  const configured = cloud || googleConfigured()
  const [status, setStatus] = useState<'loading' | 'ready' | 'verifying' | 'offline'>('loading')
  const [error, setError] = useState('')
  const [pinMode, setPinMode] = useState(!configured)

  useEffect(() => {
    if (pinMode || !btn.current) return
    if (!navigator.onLine) {
      setStatus('offline')
      return
    }
    let alive = true
    renderGoogleButton(btn.current, async (token) => {
      setStatus('verifying')
      setError('')
      try {
        if (onGoogleToken) await onGoogleToken(token)
        else await verifyCredential(token)
        haptic(20)
        onUnlock()
      } catch (e) {
        if (!alive) return
        setError(e instanceof Error ? e.message : String(e))
        setStatus('ready')
      }
    })
      .then(() => alive && setStatus('ready'))
      .catch((e) => {
        if (!alive) return
        setError(e instanceof Error ? e.message : String(e))
        setStatus('offline')
      })
    return () => {
      alive = false
    }
  }, [pinMode, onUnlock, onGoogleToken])

  if (pinMode)
    return (
      <PinLock
        title={configured ? 'Accès admin' : 'Bon retour !'}
        subtitle={configured ? 'Accès de secours par PIN (ouvre aussi le mode admin).' : 'Saisis ton code PIN pour ouvrir la session.'}
        onUnlock={onUnlock}
        onCancel={configured ? () => setPinMode(false) : undefined}
      />
    )

  return (
    <div className="hero pt-safe pb-safe flex min-h-dvh flex-col items-center justify-center !border-0 px-5">
      <div className="mb-7 -rotate-2 logo-patch text-[28px]">
          <span>TrailStrong</span>
        </div>

      <div className="b-card w-full max-w-[360px] p-5">
        <span className="tag h-7 -rotate-1 bg-sun px-2 text-[11px]">
          <Lock className="mr-1 h-3 w-3" strokeWidth={3} /> {cloud ? 'Ton espace' : 'Accès privé'}
        </span>
        <h1 className="headline mt-5 text-[26px]">{cloud ? 'Bienvenue !' : 'Bon retour !'}</h1>
        <p className="mt-1 text-[14px] font-semibold text-ink/75">
          {cloud ? 'Connecte-toi avec ton compte Google : ton programme et tes données te suivent sur tous tes appareils.' : 'Connecte-toi avec ton compte Google autorisé.'}
        </p>

        <div className="mt-6 flex min-h-[44px] justify-center">
          <div ref={btn} className={status === 'offline' ? 'hidden' : 'w-full max-w-[300px]'} />
          {status === 'loading' && <p className="text-[13px] font-bold text-ink/60">Chargement de Google…</p>}
          {status === 'offline' && (
            <p className="flex items-center gap-2 text-[13px] font-bold">
              <WifiOff className="h-4 w-4" /> Google indisponible (hors-ligne ?)
            </p>
          )}
        </div>
        {status === 'verifying' && <p className="mt-3 text-center text-[13px] font-bold">Vérification du compte…</p>}
        {error && (
          <p className="mt-3 border-2 border-ink bg-rose px-3 py-2 text-[12px] font-bold rounded-xl" role="alert">
            {error}
          </p>
        )}

        <p className="mt-5 text-[12px] font-semibold leading-snug text-ink/65">
          {cloud ? 'Ensuite, l’app marche aussi hors-ligne au gym : tout se synchronise au retour du réseau.' : 'Une fois connecté, cet appareil reste autorisé 30 jours, même hors-ligne au gym.'}
        </p>

        {!cloud && (
          <button type="button" onClick={() => setPinMode(true)} className="b-btn mt-4 flex h-11 w-full items-center justify-center gap-2 text-[13px] uppercase tracking-wide">
            <KeyRound className="h-4 w-4" strokeWidth={2.5} /> Accès admin (PIN)
          </button>
        )}
      </div>
    </div>
  )
}
