import { Plus, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Session } from '../data/program'
import { addCustom, parseProtocol, parseRest } from '../lib/custom'
import { touch } from '../lib/storage'

const PRESETS = ['Ischios', 'Fessiers', 'Cheville', 'Genou', 'Tronc']

/** Tiroir d'ajout d'un exercice personnalisé à une séance. */
export function AddExerciseSheet({ session, onClose, onAdded }: { session: Session; onClose: () => void; onAdded: (id: string) => void }) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [protocol, setProtocol] = useState('')
  const [rest, setRest] = useState('')
  const [weight, setWeight] = useState('')
  const [tip, setTip] = useState('')
  const [touched, setTouched] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const valid = name.trim().length > 0
  const p = parseProtocol(protocol)
  const restS = parseRest(rest)

  const submit = () => {
    setTouched(true)
    if (!valid) return nameRef.current?.focus()
    const id = addCustom(session.id, {
      name: name.trim(),
      target: target.trim() || undefined,
      protocol: protocol.trim() || undefined,
      rest: rest.trim() || undefined,
      startWeight: weight.trim() || undefined,
      tip: tip.trim() || undefined,
    })
    touch()
    navigator.vibrate?.([15, 30, 15])
    onAdded(id)
  }

  // Portail sur <body> : échappe au contexte d'empilement de <main> (animation), au-dessus du chrono.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 backdrop-blur-md" onClick={onClose}>
      <form
        className="fade-up glass pb-safe max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl px-4 pt-4"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        role="dialog"
        aria-label="Ajouter un exercice"
        data-noswipe
      >
        <div className="mb-1 flex items-center justify-between">
          <div>
            <p className="label !text-ember">Nouvel exercice · {session.short}</p>
            <h2 className="text-[17px] font-semibold tracking-tight text-fg">Ajouter un exercice à la main</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full text-slate-400 active:bg-white/10" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-[12px] text-muted">Il s’ajoute à la suite de la séance, avec suivi poids / reps, chrono et validation.</p>

        <Field label="Nom de l’exercice *" error={touched && !valid ? 'Le nom est obligatoire.' : undefined}>
          <input
            ref={nameRef}
            id="custom-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex. Fentes marchées lestées"
            maxLength={80}
            className={input}
          />
        </Field>

        <Field label="Groupe cible / badge">
          <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto">
            {PRESETS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTarget((cur) => (cur === t ? '' : t))}
                className={`h-9 shrink-0 rounded-full border px-3 text-[12px] font-medium transition duration-150 ${
                  target === t ? 'border-ember/50 bg-ember/15 text-orange-100 shadow-[0_0_14px_-4px_rgba(249,115,22,0.6)]' : 'border-transparent bg-chip text-slate-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <input id="custom-target" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="ou texte libre (ex. Adducteurs)" maxLength={30} className={input} />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Séries & répétitions" hint={protocol ? `→ ${p.sets} séries · ${p.reps}` : undefined}>
            <input id="custom-protocol" value={protocol} onChange={(e) => setProtocol(e.target.value)} placeholder="3 × 10 reps" maxLength={30} className={input} />
          </Field>
          <Field label="Repos conseillé" hint={rest ? `→ ${restS} s` : undefined}>
            <input id="custom-rest" value={rest} onChange={(e) => setRest(e.target.value)} placeholder="60s" maxLength={10} className={input} />
          </Field>
        </div>

        <Field label="Poids de départ · lbs">
          <input
            id="custom-weight"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value.replace(/[^\d.,]/g, ''))}
            placeholder="ex. 25"
            className={`${input} font-mono`}
          />
        </Field>

        <Field label="Astuce / consigne">
          <textarea
            id="custom-tip"
            value={tip}
            onChange={(e) => setTip(e.target.value)}
            placeholder="ex. Genou avant dans l’axe du 2e orteil, buste gainé…"
            rows={3}
            maxLength={400}
            className={`${input} h-auto resize-none py-2.5 leading-snug`}
          />
        </Field>

        <div className="mb-6 mt-2 grid grid-cols-[1fr_1.6fr] gap-2">
          <button type="button" onClick={onClose} className="h-12 rounded-xl border border-line bg-chip text-[13px] font-medium text-slate-300 active:scale-[0.98]">
            Annuler
          </button>
          <button
            type="submit"
            className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-[#f97316] text-[13px] font-semibold text-white shadow-[0_0_24px_-8px_#f97316] transition duration-150 active:scale-[0.98] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> Ajouter l’exercice
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

const input =
  'h-11 w-full rounded-xl border border-line bg-ink-2 px-3 text-[13px] text-slate-100 placeholder:text-slate-600 focus:border-ember/50 focus:outline-none'

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <p className="label mb-1 flex justify-between">
        <span>{label}</span>
        {hint && <span className="normal-case tracking-normal text-glacier">{hint}</span>}
      </p>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-300">{error}</p>}
    </div>
  )
}
