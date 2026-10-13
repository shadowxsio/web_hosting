import { FlaskConical, Play, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { MONTHLY_TESTS, TEST_INTERVAL_DAYS } from '../data/tests'
import { today, updateTest, useData } from '../lib/storage'
import { jointScore, nextTestIn, previousResult, testAsym, testDates } from '../lib/tests'
import { timer } from '../lib/timer'
import { Stepper } from './ExerciseDrawer'

const fr = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })
const scoreBg = (v?: number) => (v === undefined ? 'bg-paper' : v >= 85 ? 'bg-mint' : v >= 65 ? 'bg-sun' : 'bg-rose')

/** Section « Tests mensuels » de Progression : scores, historique, lancement du test. */
export function TestsPanel({ open, setOpen }: { open: boolean; setOpen: (o: boolean) => void }) {
  const data = useData()
  const dates = testDates(data)
  const last = dates.at(-1)
  const due = nextTestIn(data, today())

  return (
    <div id="tests" className="b-card scroll-mt-4 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[16px] font-black uppercase tracking-wide tracking-tight">🧪 Tests mensuels</h3>
          <p className="mt-1 text-[12px] font-semibold text-ink/70">
            {last ? `Dernier test : ${fr(last)} · ` : ''}
            {due <= 0 ? 'à faire maintenant' : `prochain dans ${due} j`} (toutes les {TEST_INTERVAL_DAYS / 7} semaines)
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {(['ankle', 'knee'] as const).map((j) => {
          const v = last ? jointScore(data, last, j) : undefined
          const prev = dates.length > 1 ? jointScore(data, dates[dates.length - 2], j) : undefined
          return (
            <div key={j} className={`border-[2.5px] border-ink p-3 shadow-[0_3px_0_var(--color-shadow)] rounded-xl ${scoreBg(v)}`}>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]">Score {j === 'ankle' ? 'cheville ⚓' : 'genou 🩹'}</p>
              <p className="text-[30px] font-black italic leading-none">{v ?? '–'}<span className="text-[14px]">/100</span></p>
              {v !== undefined && prev !== undefined && (
                <p className="text-[11px] font-bold">
                  {v - prev >= 0 ? '+' : ''}
                  {v - prev} vs test précédent
                </p>
              )}
            </div>
          )
        })}
      </div>

      {last && (
        <ul className="mt-4 divide-y-2 divide-ink/15 border-2 border-ink rounded-xl">
          {MONTHLY_TESTS.map((t) => {
            const r = data.tests[last][t.id]
            const a = testAsym(r)
            return (
              <li key={t.id} className="flex items-center gap-2 px-3 py-2 text-[13px]">
                <span className="min-w-0 flex-1 truncate font-bold">{t.name}</span>
                <span className="font-black italic">
                  G {r?.L ?? '–'} · D {r?.R ?? '–'} <span className="text-[11px] font-bold text-ink/60">{t.unit}</span>
                </span>
                {a !== undefined && Math.abs(a) >= 10 && <span className="border-2 border-ink bg-sun px-1 text-[10px] font-black rounded-xl">{a > 0 ? 'D' : 'G'} +{Math.abs(a)} %</span>}
              </li>
            )
          })}
        </ul>
      )}

      <button type="button" onClick={() => setOpen(true)} className="b-btn mt-4 flex h-12 w-full items-center justify-center gap-2 bg-sun text-[14px] uppercase tracking-wide">
        <FlaskConical className="h-4 w-4" /> {data.tests[today()] ? 'Reprendre le test du jour' : 'Faire le test du mois'}
      </button>

      {open && <TestSheet onClose={() => setOpen(false)} />}
    </div>
  )
}

function TestSheet({ onClose }: { onClose: () => void }) {
  const data = useData()
  const date = today()
  const day = data.tests[date] ?? {}

  return createPortal(
    <div className="fade-in fixed inset-0 z-50 flex items-end justify-center bg-ink/40 md:items-stretch md:justify-end" onClick={onClose}>
      <div
        className="sheet pb-safe max-h-[92dvh] w-full max-w-xl overflow-y-auto border-[2.5px] border-b-0 border-ink bg-paper-2 px-4 pt-4 md:max-h-none md:w-[480px] md:border-b-[2.5px] md:border-r-0 rounded-t-[26px] md:rounded-none md:rounded-l-[26px]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Test mensuel"
        data-noswipe
      >
        <div className="flex items-center justify-between">
          <h2 className="headline text-[28px]">Test du mois</h2>
          <button type="button" onClick={onClose} className="b-btn grid h-11 w-11 place-items-center rounded-full" aria-label="Fermer">
            <X className="h-5 w-5" strokeWidth={3} />
          </button>
        </div>
        <p className="mt-1 text-[13px] font-semibold text-ink/75">Échauffe-toi 5 min, puis fais chaque test sur la jambe gauche et la droite. Tout est enregistré au fil de l’eau.</p>

        {MONTHLY_TESTS.map((t, n) => {
          const prev = previousResult(data, t, date)
          const r = day[t.id] ?? {}
          const timed = t.id === 'balance-eyes-closed' ? 60 : t.id === 'step-down-30s' ? 30 : 0
          return (
            <section key={t.id} className="b-card mt-5 p-4">
              <p className={`tag h-6 px-2 text-[10px] ${t.joint === 'ankle' ? 'bg-lilac' : 'bg-sky'}`}>
                Test {n + 1} · {t.joint === 'ankle' ? 'cheville' : 'genou'}
              </p>
              <h3 className="mt-2 text-[17px] font-black uppercase tracking-wide leading-tight">{t.name}</h3>
              <p className="mt-1 text-[12px] font-semibold text-ink/70">{t.why}</p>
              <ol className="mt-2 space-y-1">
                {t.protocol.map((s, i) => (
                  <li key={i} className="flex gap-2 text-[13px] leading-snug">
                    <span className="font-black italic">{i + 1}.</span>
                    {s}
                  </li>
                ))}
              </ol>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(['L', 'R'] as const).map((side) => (
                  <Stepper
                    key={side}
                    label={`${side === 'L' ? 'Gauche' : 'Droite'} · ${t.unit}`}
                    value={r[side] === undefined ? '' : String(r[side])}
                    placeholder={prev?.result[side] !== undefined ? String(prev.result[side]) : '0'}
                    step={t.step}
                    decimal={t.step < 1}
                    done={r[side] !== undefined}
                    onChange={(v) => updateTest(date, t.id, { [side]: v === '' ? undefined : Number(v.replace(',', '.')) })}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-bold text-ink/65">
                <span>
                  Repère : {t.target} {t.unit}
                  {prev ? ` · précédent (${fr(prev.date)}) : G ${prev.result.L ?? '–'} / D ${prev.result.R ?? '–'}` : ''}
                </span>
                {timed > 0 && (
                  <button type="button" onClick={() => timer.start(timed, t.name)} className="b-btn flex h-9 shrink-0 items-center gap-1 px-2.5 text-[11px] uppercase tracking-wide">
                    <Play className="h-3 w-3" fill="currentColor" /> {timed} s
                  </button>
                )}
              </div>
            </section>
          )
        })}

        <button type="button" onClick={onClose} className="b-btn mb-8 mt-6 h-12 w-full bg-sun text-[14px] uppercase tracking-wide">
          Terminer
        </button>
      </div>
    </div>,
    document.body,
  )
}
