import { Activity, CalendarCheck, Dumbbell, Mountain, Table2, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useProgram } from '../lib/custom'
import { exerciseHistory, today, treadmillStats, useData, type AppData } from '../lib/storage'
import { AsymmetryPanel } from './AsymmetryPanel'
import { LineChart } from './LineChart'

const shortDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })

function weekStart(d: string) {
  const dt = new Date(`${d}T12:00:00`)
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7)) // lundi
  return today(dt)
}

function activeDays(data: AppData) {
  return Object.entries(data.logs)
    .filter(([, day]) => Object.values(day).some((l) => l.done || l.sets.some((s) => s.done)))
    .map(([d]) => d)
    .sort()
}

export function StatsView() {
  const data = useData()
  const PROGRAM = useProgram()
  const ALL_EXERCISES = useMemo(() => PROGRAM.flatMap((s) => s.exercises.map((e) => ({ ...e, sessionId: s.id }))), [PROGRAM])
  const weighted = ALL_EXERCISES.filter((e) => e.mode === 'strength' && !e.bodyweight)
  const [exId, setExId] = useState(weighted[0].id)
  const [table, setTable] = useState(false)

  const s = useMemo(() => {
    const days = activeDays(data)
    const since = new Date()
    since.setDate(since.getDate() - 28)
    const last4w = days.filter((d) => d >= today(since)).length

    let dplus = 0
    let km = 0
    const hikes: { date: string; dplus: number; km: number }[] = []
    for (const [date, day] of Object.entries(data.logs)) {
      const st = treadmillStats(day['power-hike']?.treadmill)
      if (st) {
        dplus += st.dplus
        km += st.km
        hikes.push({ date, ...st })
      }
    }
    hikes.sort((a, b) => a.date.localeCompare(b.date))

    // Volume hebdo (lbs × reps), 8 dernières semaines.
    const weeks = new Map<string, number>()
    const now = new Date()
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 7)
      weeks.set(weekStart(today(d)), 0)
    }
    let prs = 0
    for (const ex of ALL_EXERCISES) {
      const hist = exerciseHistory(data, ex.id)
      let best = 0
      hist.forEach((h, i) => {
        if (i > 0 && h.maxW > best) prs++
        best = Math.max(best, h.maxW)
        const w = weekStart(h.date)
        if (weeks.has(w)) weeks.set(w, weeks.get(w)! + h.volume)
      })
    }
    return { days, last4w, dplus, km, hikes, weeks: [...weeks.entries()], prs }
  }, [data, ALL_EXERCISES])

  const hist = exerciseHistory(data, exId).filter((h) => h.maxW > 0)
  const current = weighted.find((e) => e.id === exId) ?? weighted[0]

  const kpis = [
    { icon: CalendarCheck, label: 'Séances', value: s.days.length, sub: `${s.last4w} sur 4 sem.`, color: 'text-ink' },
    { icon: Mountain, label: 'D+ tapis', value: `${s.dplus.toLocaleString('fr-CA')} m`, sub: `${s.km.toFixed(1)} km`, color: 'text-ink' },
    { icon: TrendingUp, label: 'Records battus', value: s.prs, sub: 'charges max', color: 'text-ink' },
    {
      icon: Dumbbell,
      label: 'Volume',
      value: compact(s.weeks.at(-1)?.[1] ?? 0),
      sub: 'lbs × reps, cette semaine',
      color: 'text-ink/70',
    },
  ]

  return (
    <section className="space-y-5">
      <header className="hero -mx-3 mb-6 px-4 pb-6 pt-5 md:-mx-6 md:px-8">
        <span className="tag h-7 bg-paper px-2.5 text-[12px]">Charges · volume · D+</span>
        <h2 className="headline mt-3 text-[42px] sm:text-[56px]">Progression</h2>
        <p className="mt-2 text-[15px] font-bold">L’évolution de tes charges, semaine après semaine.</p>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpis.map((k, i) => (
          <div key={k.label} className={`b-card p-3.5 ${['bg-sun', 'bg-peach', 'bg-mint', 'bg-lilac'][i]}`}>
            <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em]">
              <k.icon className={`h-3.5 w-3.5 ${k.color}`} />
              {k.label}
            </p>
            <p className="mt-1 text-[30px] font-black italic leading-none tabular-nums">{k.value}</p>
            <p className="text-xs text-ink/60">{k.sub}</p>
          </div>
        ))}
      </div>

      <AsymmetryPanel exercises={ALL_EXERCISES} />

      <div className="b-card p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-[14px] font-bold tracking-tight text-ink">Charge max par séance</h3>
          <button
            type="button"
            onClick={() => setTable((t) => !t)}
            className={` p-1.5 ${table ? 'bg-sky border-2 border-ink' : 'text-ink/60'}`}
            aria-label="Afficher en tableau"
            aria-pressed={table}
          >
            <Table2 className="h-4 w-4" />
          </button>
        </div>
        <select
          value={exId}
          onChange={(e) => setExId(e.target.value)}
          className="mb-3 w-full h-11 border-2 border-ink bg-paper px-3 text-[13px] text-ink"
        >
          {PROGRAM.map((sess) => {
            const exs = weighted.filter((e) => e.sessionId === sess.id)
            return exs.length ? (
              <optgroup key={sess.id} label={sess.short}>
                {exs.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </optgroup>
            ) : null
          })}
        </select>
        {table ? (
          <HistTable rows={hist.map((h) => [shortDate(h.date), `${h.maxW} lbs`, `${h.reps} reps`, `${h.volume.toLocaleString('fr-CA')}`])} head={['Date', 'Max', 'Reps', 'Volume']} />
        ) : (
          <LineChart
            unit="lbs"
            points={hist.map((h) => ({ label: shortDate(h.date), value: h.maxW, detail: `${h.reps} reps · vol. ${h.volume.toLocaleString('fr-CA')}` }))}
          />
        )}
        {hist.length > 1 && (
          <p className="mt-2 text-xs text-ink/70">
            {current.name} : {hist[0].maxW} → <b className="font-mono text-ink">{hist.at(-1)!.maxW} lbs</b>{' '}
            <span className={hist.at(-1)!.maxW >= hist[0].maxW ? 'text-leaf' : 'text-danger'}>
              ({hist.at(-1)!.maxW >= hist[0].maxW ? '+' : ''}
              {Math.round(((hist.at(-1)!.maxW - hist[0].maxW) / (hist[0].maxW || 1)) * 100)} %)
            </span>
          </p>
        )}
      </div>

      <div className="b-card p-4">
        <h3 className="mb-2 text-[14px] font-bold tracking-tight text-ink">Volume hebdomadaire</h3>
        <LineChart
          kind="bar"
          unit="lbs × reps"
          points={s.weeks.map(([w, v]) => ({ label: shortDate(w), value: Math.round(v), detail: `semaine du ${shortDate(w)}` }))}
        />
      </div>

      <div className="b-card p-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-[14px] font-bold tracking-tight text-ink">
          <Mountain className="h-4 w-4 text-flame" /> D+ sur tapis
        </h3>
        <LineChart kind="bar" unit="m D+" points={s.hikes.slice(-12).map((h) => ({ label: shortDate(h.date), value: h.dplus, detail: `${h.km.toFixed(2)} km` }))} />
      </div>

      <div className="b-card p-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-[14px] font-bold tracking-tight text-ink">
          <Activity className="h-4 w-4 text-ink/70" /> Historique
        </h3>
        {s.days.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink/60">Aucune séance enregistrée pour l’instant.</p>
        ) : (
          <ul className="divide-y divide-ink/20">
            {[...s.days]
              .reverse()
              .slice(0, 12)
              .map((d) => {
                const day = data.logs[d]
                const sessions = PROGRAM.filter((p) => p.exercises.some((e) => day[e.id]?.done || day[e.id]?.sets.some((x) => x.done)))
                const sets = Object.values(day).reduce((n, l) => n + l.sets.filter((x) => x.done).length, 0)
                return (
                  <li key={d} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-ink/85">
                      {new Date(`${d}T12:00:00`).toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <span className="flex flex-wrap justify-end gap-1">
                      {sessions.map((p) => (
                        <span key={p.id} className="border-2 border-ink bg-sun px-1.5 py-0.5 text-[10px] font-black uppercase italic">
                          {p.short}
                        </span>
                      ))}
                      {sets > 0 && <span className="bg-paper px-1.5 py-0.5 font-mono text-[10px] text-ink/70">{sets} séries</span>}
                    </span>
                  </li>
                )
              })}
          </ul>
        )}
      </div>
    </section>
  )
}

function HistTable({ head, rows }: { head: string[]; rows: string[][] }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-ink/60">Pas encore de données.</p>
  return (
    <div className="max-h-64 overflow-auto">
      <table className="w-full text-left text-sm tabular-nums">
        <thead className="text-[11px] uppercase tracking-wider text-ink/60">
          <tr>
            {head.map((h) => (
              <th key={h} className="pb-1.5 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/20 text-ink/85">
          {[...rows].reverse().map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="py-1.5">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const compact = (v: number) => (v >= 10000 ? `${(v / 1000).toLocaleString('fr-CA', { maximumFractionDigits: 1 })} k` : Math.round(v).toLocaleString('fr-CA'))
