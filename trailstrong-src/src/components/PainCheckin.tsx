import { AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { dayPain, painAlert, type Joint } from '../lib/insights'
import { updateCheckin, useData, type Checkin } from '../lib/storage'
import { haptic } from '../lib/haptics'
import { useSheet } from '../lib/useSheet'

const JOINTS: { id: Joint; label: string; emoji: string }[] = [
  { id: 'knee', label: 'Genou', emoji: '🩹' },
  { id: 'ankle', label: 'Cheville', emoji: '⚓' },
]

const scaleBg = (v: number) => (v <= 2 ? 'bg-mint' : v <= 5 ? 'bg-sun' : v <= 7 ? 'bg-peach' : 'bg-rose')

/** Bandeau du jour : douleur genou / cheville + alerte de tendance. */
export function PainCheckin({ date }: { date: string }) {
  const data = useData()
  const [open, setOpen] = useState(false)
  const c = data.checkins[date]
  const alerts = painAlert(data, date)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="b-btn mt-4 flex min-h-11 w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left text-[13px]"
      >
        <span className="uppercase tracking-wide">Douleur du jour</span>
        {JOINTS.map((j) => {
          const v = dayPain(c, j.id)
          return (
            <span key={j.id} className={`border-2 border-ink px-1.5 text-[12px] font-black rounded-xl ${v === undefined ? 'bg-paper' : scaleBg(v)}`}>
              {j.emoji} {v === undefined ? '–' : `${v}/10`}
            </span>
          )
        })}
        <span className="ml-auto text-[12px] font-extrabold text-flame">{c ? 'Modifier' : 'Noter →'}</span>
      </button>

      {alerts.map((a) => (
        <p key={a.joint} className="mt-3 flex items-start gap-2 border-2 border-ink bg-rose px-3 py-2 text-[13px] font-bold leading-snug rounded-xl" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
          <span>
            Attention : {a.reason}. Garde les charges actuelles, privilégie le contrôle (tempo lent, isométrie) et parles-en à un physio si ça persiste.
          </span>
        </p>
      ))}

      {open && <PainSheet date={date} value={c ?? {}} onClose={() => setOpen(false)} />}
    </>
  )
}

function PainSheet({ date, value, onClose: closeNow }: { date: string; value: Checkin; onClose: () => void }) {
  const sheet = useSheet(closeNow)
  const onClose = sheet.close
  const [moment, setMoment] = useState<'Before' | 'After'>(value.kneeBefore === undefined && value.ankleBefore === undefined ? 'Before' : 'After')
  const key = (j: Joint) => `${j}${moment}` as keyof Checkin

  return createPortal(
    <div className={`${sheet.backdrop} fixed inset-0 z-50 flex items-end justify-center md:items-center`} onClick={onClose}>
      <div
        ref={sheet.ref} className={`${sheet.panel} pb-safe w-full max-w-xl border-[2.5px] border-b-0 border-ink bg-paper-2 px-4 pt-4 md:border-b-[2.5px] rounded-t-[26px] md:rounded-none md:rounded-l-[26px]`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Check-in douleur"
        data-noswipe
      >
        <div className="flex items-center justify-between">
          <h2 className="headline text-[26px]">Douleur</h2>
          <button type="button" onClick={onClose} className="b-btn grid h-11 w-11 place-items-center rounded-full" aria-label="Fermer">
            <X className="h-5 w-5" strokeWidth={3} />
          </button>
        </div>
        <p className="mt-1 text-[13px] font-semibold text-ink/75">0 = aucune · 10 = maximale. Note avant et après la séance.</p>

        <div className="mt-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Moment">
          {(
            [
              ['Before', 'Avant la séance'],
              ['After', 'Après la séance'],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={moment === m}
              onClick={() => setMoment(m)}
              className={`b-btn h-11 text-[13px] uppercase tracking-wide ${moment === m ? 'b-btn-ink' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>

        {JOINTS.map((j) => {
          const cur = value[key(j.id)]
          return (
            <section key={j.id} className="mt-5">
              <p className="mb-2 text-[15px] font-black uppercase tracking-wide">
                {j.emoji} {j.label} <span className="text-ink/60">· {cur === undefined ? 'non noté' : `${cur}/10`}</span>
              </p>
              <div className="grid grid-cols-11 gap-1">
                {Array.from({ length: 11 }, (_, v) => (
                  <button
                    key={v}
                    type="button"
                    aria-label={`${j.label} ${v} sur 10`}
                    aria-pressed={cur === v}
                    onClick={() => {
                      haptic(8)
                      updateCheckin(date, { [key(j.id)]: v })
                    }}
                    className={`grid h-11 place-items-center border-2 border-ink text-[14px] font-black italic transition duration-100 active:translate-y-px rounded-xl ${
                      cur === v ? `${scaleBg(v)} -translate-y-0.5 shadow-[0_2px_0_var(--color-shadow)]` : 'bg-paper'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </section>
          )
        })}

        <button type="button" onClick={onClose} className="b-btn mb-6 mt-6 h-12 w-full bg-sun text-[14px] uppercase tracking-wide">
          Enregistrer
        </button>
      </div>
    </div>,
    document.body,
  )
}
