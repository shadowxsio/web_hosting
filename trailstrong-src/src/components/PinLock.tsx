import { Delete, Lock, Mountain } from 'lucide-react'
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
        }, 500)
      }
    },
    [onUnlock],
  )

  const press = useCallback(
    (k: string) => {
      if (busy || error) return
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

  const slots = Math.max(4, Math.min(8, pin.length > 4 ? 6 : 4))

  return (
    <div className="pt-safe pb-safe flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-[0_0_40px_-6px_#f97316]">
          <Mountain className="h-8 w-8 text-white" strokeWidth={2.4} />
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">
          TrailStrong <span className="text-ember">2026</span>
        </h1>
        <p className="mt-1 text-sm text-slate-400">ÉconoFitness Beaubien · accès privé</p>
      </div>

      <div className={`mb-8 flex gap-3 ${error ? 'shake' : ''}`} aria-live="polite">
        {Array.from({ length: Math.max(slots, pin.length) }).map((_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 transition-all duration-150 ${
              error
                ? 'border-red-500 bg-red-500'
                : i < pin.length
                  ? 'scale-110 border-ember bg-ember'
                  : 'border-slate-600'
            }`}
          />
        ))}
      </div>

      <div className="grid w-full max-w-[280px] grid-cols-3 gap-4">
        {KEYS.map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => press(k)}
              aria-label={k === 'del' ? 'Effacer' : k}
              className="grid h-16 place-items-center rounded-2xl border border-white/5 bg-white/[0.04] font-display text-2xl font-semibold text-white backdrop-blur transition active:scale-95 active:bg-ember/30"
            >
              {k === 'del' ? <Delete className="h-6 w-6 text-slate-300" /> : k}
            </button>
          ),
        )}
      </div>

      {pin.length >= 4 && pin.length !== 6 && (
        <button
          type="button"
          onClick={() => void attempt(pin, true)}
          className="mt-6 rounded-xl bg-ember px-6 py-2.5 font-semibold text-white active:scale-95"
        >
          Déverrouiller
        </button>
      )}

      <p className="mt-8 flex items-center gap-1.5 text-xs text-slate-500">
        <Lock className="h-3.5 w-3.5" />
        {usingDefaultPin() ? 'PIN par défaut actif — change-le dans Réglages' : 'PIN 4 ou 6 chiffres'}
      </p>
    </div>
  )
}
