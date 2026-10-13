import { ArrowLeft, Delete, Lock, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { attemptPin, lockedFor, startSession, usingDefaultPin } from '../lib/auth'
import { haptic } from '../lib/haptics'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const

/**
 * Pavé PIN. Sert d'accès de secours (si Google est indisponible) et de
 * déverrouillage du « mode admin » (Réglages) quand `overlay` est vrai.
 */
export function PinLock({
  onUnlock,
  onCancel,
  overlay = false,
  title = 'Mode admin',
  subtitle = 'Saisis ton code PIN pour accéder aux réglages.',
}: {
  onUnlock: () => void
  onCancel?: () => void
  overlay?: boolean
  title?: string
  subtitle?: string
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(lockedFor())
  const [hint, setHint] = useState('')

  // Décompte du blocage anti force brute.
  useEffect(() => {
    if (wait <= 0) return
    const id = window.setInterval(() => setWait(lockedFor()), 1000)
    return () => window.clearInterval(id)
  }, [wait])

  const attempt = useCallback(
    async (value: string, showError: boolean) => {
      setBusy(true)
      const r = await attemptPin(value, showError)
      setBusy(false)
      if (r.ok) {
        startSession(value)
        setHint('')
        haptic(20)
        onUnlock()
      } else if (showError || r.lockedFor > 0) {
        setWait(r.lockedFor)
        setHint(r.lockedFor > 0 ? '' : `PIN incorrect · encore ${r.remaining} essai${r.remaining > 1 ? 's' : ''} avant blocage`)
        setError(true)
        haptic([60, 40, 60])
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
      if (busy || error || wait > 0) return
      haptic(6)
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
    [attempt, busy, error, wait],
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

  const screen = (
    <div
      className={`hero pt-safe pb-safe flex min-h-dvh flex-col items-center justify-center !border-0 px-5 ${overlay ? 'fade-in fixed inset-0 z-[60] overflow-y-auto' : ''}`}
      data-noswipe
    >
      {onCancel && (
        <button type="button" onClick={onCancel} className="b-btn absolute left-4 top-4 flex h-11 items-center gap-1.5 px-3 text-[13px] uppercase tracking-wide">
          <ArrowLeft className="h-4 w-4" strokeWidth={3} /> Retour
        </button>
      )}
      <div className="mb-7 -rotate-2 logo-patch text-[28px]">
          <span>TrailStrong</span>
        </div>

      <div className="b-card w-full max-w-[340px] p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="tag h-7 -rotate-1 bg-sun px-2 text-[11px]">
            <Lock className="mr-1 h-3 w-3" strokeWidth={3} /> {overlay ? 'Admin' : 'Accès privé'}
          </span>
          <span className="tag h-7 rotate-1 bg-mint px-2 text-[11px]">chiffré</span>
        </div>

        <h1 className="headline mt-5 text-[26px]">{title}</h1>
        <p className="mt-1 text-[14px] font-semibold text-ink/75">{subtitle}</p>

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
          disabled={pin.length < 4 || wait > 0}
          onClick={() => void attempt(pin, true)}
          className="b-btn mt-4 h-12 w-full bg-sun text-[15px] uppercase tracking-wide disabled:bg-paper-2 disabled:text-ink/45"
        >
          {wait > 0 ? `Bloqué · ${wait} s` : 'Déverrouiller'}
        </button>
        {(hint || wait > 0) && (
          <p className="mt-3 border-2 border-ink bg-rose px-3 py-2 text-center text-[12px] font-bold rounded-xl" role="alert">
            {wait > 0 ? `Trop d’essais : réessaie dans ${wait} s.` : hint}
          </p>
        )}

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[12px] font-semibold text-ink/65">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          {usingDefaultPin() ? 'PIN par défaut actif — change-le dans le Menu' : 'PIN 4 ou 6 chiffres · SHA-256'}
        </p>
      </div>
    </div>
  )
  return overlay ? createPortal(screen, document.body) : screen
}
