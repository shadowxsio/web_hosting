import { Check, Clock, Dumbbell, Trophy, X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { routineOf, routineSeconds } from '../data/cooldown'
import type { Session } from '../data/program'
import { computeRecap, recoveryTips } from '../lib/recap'
import { updateCheckin, updateSessionLog, useData } from '../lib/storage'

const scaleBg = (v: number) => (v <= 2 ? 'bg-mint' : v <= 5 ? 'bg-sun' : v <= 7 ? 'bg-peach' : 'bg-rose')
const RPE_LABEL = ['', 'Très facile', 'Facile', 'Facile', 'Modéré', 'Modéré', 'Assez dur', 'Dur', 'Très dur', 'Extrême', 'Max']

/** Bilan de fin de séance : chiffres, ressenti, repères de récupération. */
export function SessionRecap({ session, date, onClose, onCooldown }: { session: Session; date: string; onClose: () => void; onCooldown: () => void }) {
  const data = useData()
  const r = computeRecap(data, session, date)
  const log = data.sessions[date]?.[session.id] ?? {}
  const c = data.checkins[date] ?? {}
  const maxPain = Math.max(c.kneeAfter ?? 0, c.ankleAfter ?? 0)
  const tips = recoveryTips({ profile: data.profile, sessionId: session.id, runAdvice: session.runAdvice, rpe: log.rpe, runSoon: log.runSoon, maxPain })
  const routine = routineOf(session)
  const set = (p: Parameters<typeof updateSessionLog>[2]) => updateSessionLog(date, session.id, p)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="fade-in fixed inset-0 z-50 flex items-end justify-center bg-ink/40 md:items-stretch md:justify-end" onClick={onClose}>
      <div
        className="sheet pb-safe flex max-h-[94dvh] w-full max-w-xl flex-col border-[2.5px] border-b-0 border-ink bg-paper-2 md:max-h-none md:w-[480px] md:border-b-[2.5px] md:border-r-0 rounded-t-[26px] md:rounded-none md:rounded-l-[26px]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Bilan de séance"
        data-noswipe
      >
        <header className="hero flex items-start justify-between !border-t-0 px-4 pb-4 pt-4">
          <div>
            <p className="tag h-6 -rotate-1 bg-sun px-2 text-[10px]">Bilan · {session.short}</p>
            <h2 className="headline mt-2 text-[28px]">Séance terminée</h2>
          </div>
          <button type="button" onClick={onClose} className="b-btn grid h-11 w-11 place-items-center rounded-full" aria-label="Fermer">
            <X className="h-5 w-5" strokeWidth={3} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {/* Chiffres */}
          <section className="grid grid-cols-3 gap-2">
            <Stat icon={<Check className="h-4 w-4" strokeWidth={3} />} label="Exercices" value={`${r.exercisesDone}/${r.exercisesTotal}`} sub={`${r.sets} séries`} />
            <Stat icon={<Dumbbell className="h-4 w-4" strokeWidth={2.5} />} label="Volume" value={r.volumeLbs ? r.volumeLbs.toLocaleString('fr-CA') : '—'} sub="lbs soulevés" />
            <Stat icon={<Clock className="h-4 w-4" strokeWidth={2.5} />} label="Durée" value={r.minutes ? `${r.minutes}′` : '—'} sub="environ" />
          </section>
          {r.records.length > 0 && (
            <p className="flex items-start gap-2 border-2 border-ink bg-sun px-3 py-2 text-[13px] font-bold leading-snug rounded-xl">
              <Trophy className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
              <span>Record{r.records.length > 1 ? 's' : ''} : {r.records.map((x) => `${x.name} (${x.weight} lbs)`).join(', ')}</span>
            </p>
          )}
          {r.asym.length > 0 && (
            <p className="border-2 border-dashed border-ink/60 px-3 py-2 text-[12px] font-bold leading-snug rounded-xl">
              Écart gauche / droite : {r.asym.map((a) => `${a.name} ${a.pct > 0 ? 'D' : 'G'} +${Math.abs(a.pct)} %`).join(' · ')}. Le côté faible passera en premier la prochaine fois.
            </p>
          )}

          {/* Ressenti */}
          <section>
            <h3 className="label mb-2">Difficulté de la séance {log.rpe ? `· ${RPE_LABEL[log.rpe]}` : ''}</h3>
            <div className="grid grid-cols-10 gap-1" role="radiogroup" aria-label="Difficulté ressentie">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={log.rpe === v}
                  onClick={() => set({ rpe: v })}
                  className={`h-10 border-2 border-ink text-[14px] font-black rounded-xl ${log.rpe === v ? `${scaleBg(v - 1)} shadow-[0_2px_0_var(--color-shadow)]` : 'bg-paper'}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(
                [
                  ['kneeAfter', '🩹 Genou'],
                  ['ankleAfter', '⚓ Cheville'],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="border-2 border-ink bg-paper px-2 py-1.5 rounded-xl">
                  <span className="flex justify-between text-[12px] font-black uppercase tracking-wide">
                    {label} après <span className="not-italic">{c[k] ?? '–'}/10</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={c[k] ?? 0}
                    onChange={(e) => updateCheckin(date, { [k]: Number(e.target.value) })}
                    className="mt-1 w-full accent-[var(--color-flame)]"
                    aria-label={`Douleur ${label} après la séance`}
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={() => set({ runSoon: !log.runSoon })}
              aria-pressed={!!log.runSoon}
              className={`b-btn mt-3 h-11 w-full text-[13px] uppercase tracking-wide ${log.runSoon ? 'b-btn-ink' : ''}`}
            >
              {log.runSoon ? '✓ Je cours dans les 24 h' : 'Je cours dans les 24 h ?'}
            </button>
          </section>

          {/* Récupération */}
          <section>
            <h3 className="label mb-2">Pour bien récupérer</h3>
            <ul className="divide-y-2 divide-ink/15 border-2 border-ink bg-paper rounded-xl">
              {tips.map((t) => (
                <li key={t.title} className="flex gap-3 px-3 py-2.5">
                  <span className="text-[20px] leading-none">{t.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-black uppercase tracking-wide">{t.title}</span>
                    <span className="block text-[13px] leading-snug text-ink/85">{t.text}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] font-semibold text-ink/55">Repères sportifs généraux, pas un avis médical.</p>
          </section>
        </div>

        {routine.length > 0 && (
          <footer className="border-t-[2.5px] border-ink p-3">
            <button type="button" onClick={onCooldown} className="b-btn flex h-12 w-full items-center justify-center gap-2 bg-mint text-[14px] uppercase tracking-wide">
              {log.cooldownAt ? '✓ Retour au calme fait · refaire' : `🧘 Retour au calme · ${Math.round(routineSeconds(routine) / 60)} min`}
            </button>
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="border-2 border-ink bg-paper px-2.5 py-2 rounded-xl">
      <p className="label flex items-center gap-1">
        {icon} {label}
      </p>
      <p className="mt-0.5 font-mono text-[20px] font-black leading-tight">{value}</p>
      <p className="text-[11px] font-semibold text-ink/60">{sub}</p>
    </div>
  )
}
