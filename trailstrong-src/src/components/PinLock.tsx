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
    <div className="dot-grid pt-safe pb-safe relative flex min-h-dvh items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(500px_300px_at_50%_30%,rgba(249,115,22,0.10),transparent_70%)]" />
      <div className="glass relative w-full max-w-[340px] rounded-2xl p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[0.14em] text-slate-400">
            <Lock className="h-3 w-3 text-ember" />
            TRAILSTRONG // ACCÈS PRIVÉ
          </span>
          <span className="flex items-center gap-1 rounded-full bg-moss/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-moss shadow-[0_0_6px_#10b981]" /> chiffré
          </span>
        </div>

        <h1 className="mt-5 text-lg font-semibold tracking-tight text-fg">Bon retour, Mickael</h1>
        <p className="text-[13px] text-muted">Saisis ton code PIN pour ouvrir la session.</p>

        <div className={`my-6 flex justify-center gap-3.5 ${error ? 'shake' : ''}`} aria-live="polite">
          {Array.from({ length: slots }).map((_, i) => (
            <span
              key={i}
              className={`h-3 w-3 rounded-full transition-all duration-150 ${
                error
                  ? 'bg-red-500 shadow-[0_0_10px_#ef4444]'
                  : i < pin.length
                    ? 'scale-110 bg-ember shadow-[0_0_10px_#f97316]'
                    : 'border border-slate-600 bg-transparent'
              }`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((k, i) =>
            k === '' ? (
              <span key={i} />
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => press(k)}
                aria-label={k === 'del' ? 'Effacer' : k}
                className="grid h-14 place-items-center rounded-xl border border-line bg-chip/60 font-mono text-xl font-semibold text-fg transition duration-150 hover:bg-chip active:scale-95 active:border-ember/40 active:bg-ember/15"
              >
                {k === 'del' ? <Delete className="h-5 w-5 text-slate-400" /> : k}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          disabled={pin.length < 4}
          onClick={() => void attempt(pin, true)}
          className="mt-3 h-11 w-full rounded-xl bg-ember text-sm font-semibold text-white shadow-[0_0_24px_-8px_#f97316] transition duration-150 active:scale-[0.98] disabled:bg-chip disabled:text-slate-500 disabled:shadow-none"
        >
          Déverrouiller
        </button>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5" />
          {usingDefaultPin() ? 'PIN par défaut actif — change-le dans Réglages' : 'PIN 4 ou 6 chiffres · SHA-256'}
        </p>
      </div>
    </div>
  )
}
