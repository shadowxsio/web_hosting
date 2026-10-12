import { Delete, Lock, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { checkPin, startSession, usingDefaultPin } from '../lib/auth'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const

export function PinLock({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  const attempt = useCallback(
    async (value: string, showError: boolean) => {
      setBusy(true)
      const ok = await checkPin(value)
      setBusy(false)
      if (ok) {
        startSession(value)
        navigator.vibrate?.(20)
        onUnlock()
      } else if (showError) {
        setError(true)
        navigator.vibrate?.([60, 40, 60])
        window.setTimeout(() => {
          setError(false)
          setPin('')
        }, 450)
      }
    },
    [onUnlock],
  )

  const press = useCallback(
    (k: string) => {
      if (busy || error) return
      navigator.vibrate?.(6)
      if (k === 'del') return setPin((p) => p.slice(0, -1))
      setPin((p) => {
        if (p.length >= 8) return p
        const next = p + k
        // PIN à 4 chiffres : test silencieux ; à 6 chiffres : verdict.
        if (next.length === 4) void attempt(next, false)
        if (next.length === 6) void attempt(next, true)
        return next
      })
    },
    [attempt, busy, error],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('del')
      else if (e.key === 'Enter' && pin.length >= 4) void attempt(pin, true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [press, attempt, pin])

  const slots = Math.max(pin.length > 4 ? 6 : 4, pin.length)

  return (
    <div className="hero pt-safe pb-safe flex min-h-dvh flex-col items-center justify-center !border-0 px-5">
      <div className="mb-7 -rotate-2 border-[2.5px] border-ink bg-paper p-1 shadow-[5px_5px_0_#1b1424]">
        <span className="block border-2 border-dashed border-ink px-4 py-2">
          <span className="headline block text-[30px]">TrailStrong</span>
        </span>
      </div>

      <div className="b-card w-full max-w-[340px] p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="tag h-7 -rotate-1 bg-sun px-2 text-[11px]">
            <Lock className="mr-1 h-3 w-3" strokeWidth={3} /> Accès privé
          </span>
          <span className="tag h-7 rotate-1 bg-mint px-2 text-[11px]">chiffré</span>
        </div>

        <h1 className="headline mt-5 text-[26px] [text-shadow:2px_2px_0_#f0773a]">Bon retour, Mickael</h1>
        <p className="mt-1 text-[14px] font-semibold text-ink/75">Saisis ton code PIN pour ouvrir la session.</p>

        <div className={`my-6 flex justify-center gap-3.5 ${error ? 'shake' : ''}`} aria-live="polite">
          {Array.from({ length: slots }).map((_, i) => (
            <span
              key={i}
              className={`h-4 w-4 rounded-full border-[2.5px] border-ink transition-all duration-150 ${
                error ? 'bg-[#ef4444]' : i < pin.length ? 'scale-110 bg-flame' : 'bg-paper'
              }`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {KEYS.map((k, i) =>
            k === '' ? (
              <span key={i} />
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => press(k)}
                aria-label={k === 'del' ? 'Effacer' : k}
                className={`b-btn grid h-14 place-items-center text-[24px] font-black italic ${k === 'del' ? 'bg-peach' : ''}`}
              >
                {k === 'del' ? <Delete className="h-5 w-5" strokeWidth={2.5} /> : k}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          disabled={pin.length < 4}
          onClick={() => void attempt(pin, true)}
          className="b-btn mt-4 h-12 w-full bg-sun text-[15px] uppercase italic disabled:bg-paper-2 disabled:text-ink/45"
        >
          Déverrouiller
        </button>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[12px] font-semibold text-ink/65">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          {usingDefaultPin() ? 'PIN par défaut actif — change-le dans le Menu' : 'PIN 4 ou 6 chiffres · SHA-256'}
        </p>
      </div>
    </div>
  )
}
