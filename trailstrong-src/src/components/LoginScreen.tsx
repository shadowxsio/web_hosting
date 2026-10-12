import { KeyRound, Lock, WifiOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { renderGoogleButton, verifyCredential } from '../lib/googleAuth'
import { PinLock } from './PinLock'

/** Écran d'accès : connexion Google (compte autorisé) ; PIN en secours. */
export function LoginScreen({ onUnlock }: { onUnlock: () => void }) {
  const btn = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'verifying' | 'offline'>('loading')
  const [error, setError] = useState('')
  const [pinMode, setPinMode] = useState(false)

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
        await verifyCredential(token)
        navigator.vibrate?.(20)
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
  }, [pinMode, onUnlock])

  if (pinMode)
    return (
      <PinLock
        title="Accès admin"
        subtitle="Accès de secours par PIN (ouvre aussi le mode admin)."
        onUnlock={onUnlock}
        onCancel={() => setPinMode(false)}
      />
    )

  return (
    <div className="hero pt-safe pb-safe flex min-h-dvh flex-col items-center justify-center !border-0 px-5">
      <div className="mb-7 -rotate-2 border-[2.5px] border-ink bg-paper p-1 shadow-[5px_5px_0_var(--color-shadow)]">
        <span className="block border-2 border-dashed border-ink px-4 py-2">
          <span className="headline block text-[30px]">TrailStrong</span>
        </span>
      </div>

      <div className="b-card w-full max-w-[360px] p-5">
        <span className="tag h-7 -rotate-1 bg-sun px-2 text-[11px]">
          <Lock className="mr-1 h-3 w-3" strokeWidth={3} /> Accès privé
        </span>
        <h1 className="headline mt-5 text-[26px] [text-shadow:2px_2px_0_#f0773a]">Bon retour, Mickael</h1>
        <p className="mt-1 text-[14px] font-semibold text-ink/75">Connecte-toi avec ton compte Google autorisé.</p>

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
          <p className="mt-3 border-2 border-ink bg-rose px-3 py-2 text-[12px] font-bold" role="alert">
            {error}
          </p>
        )}

        <p className="mt-5 text-[12px] font-semibold leading-snug text-ink/65">
          Une fois connecté, cet appareil reste autorisé 30 jours, même hors-ligne au gym.
        </p>

        <button type="button" onClick={() => setPinMode(true)} className="b-btn mt-4 flex h-11 w-full items-center justify-center gap-2 text-[13px] uppercase italic">
          <KeyRound className="h-4 w-4" strokeWidth={2.5} /> Accès admin (PIN)
        </button>
      </div>
    </div>
  )
}
