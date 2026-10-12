import { Settings } from 'lucide-react'
import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { PinLock } from './components/PinLock'
import { SessionView, type Group } from './components/SessionView'
import { SettingsSheet } from './components/SettingsSheet'
import { StatsView } from './components/StatsView'
import { TimerBar } from './components/TimerBar'
import { type FocusTag, type Session, type SessionId } from './data/program'
import { hasValidSession } from './lib/auth'
import { useAutoBackup } from './lib/backup'
import { useProgram } from './lib/custom'
import { today } from './lib/storage'

type FilterId = 'all' | SessionId | `focus-${FocusTag}` | 'stats'

const FILTERS: { id: FilterId; label: string; emoji: string; tone: 'ember' | 'iris' }[] = [
  { id: 'all', label: 'Tout', emoji: '', tone: 'ember' },
  { id: 'activation', label: 'Activation', emoji: '🔥', tone: 'ember' },
  { id: 'seanceA', label: 'Séance A', emoji: '🦵', tone: 'ember' },
  { id: 'seanceB', label: 'Séance B', emoji: '⚖️', tone: 'ember' },
  { id: 'tapis', label: 'Tapis D+', emoji: '⛰️', tone: 'ember' },
  { id: 'focus-knee', label: 'Focus Genou', emoji: '🩹', tone: 'iris' },
  { id: 'focus-ankle', label: 'Focus Cheville', emoji: '⚓', tone: 'iris' },
  { id: 'focus-glutes', label: 'Fessiers', emoji: '🍑', tone: 'iris' },
  { id: 'stats', label: 'Stats', emoji: '📊', tone: 'iris' },
]

const TAB_KEY = 'trailstrong:filter'

export default function App() {
  const [auth, setAuth] = useState<'checking' | 'locked' | 'open'>('checking')
  useEffect(() => {
    void hasValidSession().then((ok) => setAuth(ok ? 'open' : 'locked'))
  }, [])
  if (auth === 'checking') return null
  if (auth === 'locked') return <PinLock onUnlock={() => setAuth('open')} />
  return <Shell onLock={() => setAuth('locked')} />
}

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}

function view(PROGRAM: Session[], filter: FilterId): { title: string; subtitle?: string; groups: Group[]; allowAdd: boolean } {
  if (filter === 'all') {
    return {
      title: 'Programme complet',
      subtitle: 'Activation, force postérieure, unilatéral & D+ — ÉconoFitness Beaubien.',
      groups: PROGRAM.map((s) => ({ session: s, exercises: s.exercises })),
      allowAdd: true,
    }
  }
  if (filter.startsWith('focus-')) {
    const tag = filter.slice(6) as FocusTag
    const titles: Record<FocusTag, [string, string]> = {
      knee: ['Focus Genou', 'Tout ce qui protège la rotule : freinage, alignement, chaîne postérieure.'],
      ankle: ['Focus Cheville', 'Proprioception, mobilité et force de propulsion pour le trail.'],
      glutes: ['Fessiers', 'Grand et moyen fessiers : stopper le valgus et propulser en montée.'],
    }
    return {
      title: titles[tag][0],
      subtitle: titles[tag][1],
      groups: PROGRAM.map((s) => ({ session: s, exercises: s.exercises.filter((e) => e.tags.includes(tag)) })).filter((g) => g.exercises.length),
      allowAdd: false,
    }
  }
  const s = PROGRAM.find((p) => p.id === filter)!
  return { title: s.title, subtitle: `${s.subtitle.includes(s.duration) ? s.subtitle : `${s.subtitle} · ${s.duration}`}. ${s.goal}`, groups: [{ session: s, exercises: s.exercises }], allowAdd: true }
}

function Shell({ onLock }: { onLock: () => void }) {
  useAutoBackup()
  const online = useOnline()
  const program = useProgram()
  const [filter, setFilterState] = useState<FilterId>(() => {
    const saved = localStorage.getItem(TAB_KEY) as FilterId | null
    return saved && FILTERS.some((t) => t.id === saved) ? saved : 'activation'
  })
  const [date, setDate] = useState(today())
  const [settings, setSettings] = useState(false)
  const touch = useRef<{ x: number; y: number; ok: boolean } | null>(null)
  const pills = useRef<HTMLDivElement>(null)

  const setFilter = (next: FilterId) => {
    setFilterState(next)
    localStorage.setItem(TAB_KEY, next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Garde la pastille active visible dans la barre défilante.
  useEffect(() => {
    pills.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [filter])

  // Balayage horizontal entre filtres (hors champs de saisie / graphiques).
  const onTouchStart = (e: TouchEvent) => {
    const el = e.target as HTMLElement
    const ok = !el.closest('input, textarea, select, svg, [data-noswipe]')
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ok }
  }
  const onTouchEnd = (e: TouchEvent) => {
    const t0 = touch.current
    touch.current = null
    if (!t0?.ok) return
    const dx = e.changedTouches[0].clientX - t0.x
    const dy = e.changedTouches[0].clientY - t0.y
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return
    const i = FILTERS.findIndex((t) => t.id === filter)
    const j = i + (dx < 0 ? 1 : -1)
    if (j >= 0 && j < FILTERS.length) {
      navigator.vibrate?.(8)
      setFilter(FILTERS[j].id)
    }
  }

  // Passage de minuit, app restée ouverte : si on était sur « aujourd'hui », on suit.
  const lastToday = useRef(today())
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = today()
      if (t === lastToday.current) return
      if (date === lastToday.current) setDate(t)
      lastToday.current = t
    }, 60_000)
    return () => window.clearInterval(id)
  }, [date])

  const v = filter === 'stats' ? null : view(program, filter)

  return (
    <div className="min-h-dvh" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* ── Top bar ── */}
      <header className="pt-safe sticky top-0 z-30 border-b border-line bg-ink/75 backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-xl items-center gap-2 px-3">
          <span className="flex min-w-0 items-center gap-2 rounded-lg border border-line bg-panel/80 px-2 py-1">
            <span className="h-2 w-2 shrink-0 rounded-sm bg-gradient-to-br from-ember to-iris" />
            <span className="truncate font-mono text-[10px] font-semibold tracking-[0.12em] text-slate-200">
              TRAILSTRONG 2026 <span className="text-slate-600">//</span> <span className="text-slate-400">ÉCONOFITNESS</span>
            </span>
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[10px] font-medium text-slate-400" title={online ? 'En ligne' : 'Hors-ligne'}>
            <span className="relative flex h-2 w-2">
              {online && <span className="absolute inset-0 animate-ping rounded-full bg-moss/60" />}
              <span className={`relative h-2 w-2 rounded-full ${online ? 'bg-moss' : 'bg-amber-400'}`} />
            </span>
            {online ? 'Privé' : 'Hors-ligne'}
          </span>
          <button
            type="button"
            onClick={() => setSettings(true)}
            className="grid h-11 w-10 shrink-0 place-items-center rounded-lg text-slate-400 transition duration-150 active:bg-white/5"
            aria-label="Réglages"
          >
            <Settings className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* ── Filtres en pastilles ── */}
        <div ref={pills} className="no-scrollbar mx-auto flex max-w-xl gap-1.5 overflow-x-auto px-3 pb-2.5" role="toolbar" aria-label="Filtres">
          {FILTERS.map((f) => {
            const active = f.id === filter
            const on =
              f.tone === 'ember'
                ? 'border-ember/50 bg-ember/15 text-orange-100 shadow-[0_0_16px_-4px_rgba(249,115,22,0.6)]'
                : 'border-iris/50 bg-iris/15 text-violet-100 shadow-[0_0_16px_-4px_rgba(139,92,246,0.6)]'
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f.id)}
                className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition duration-150 active:scale-95 ${
                  active ? on : 'border-transparent bg-chip text-slate-400 opacity-80 hover:opacity-100'
                }`}
              >
                {f.emoji && <span className="text-[13px] leading-none">{f.emoji}</span>}
                {f.label}
              </button>
            )
          })}
        </div>
      </header>

      <main key={filter} className="fade-up mx-auto max-w-xl px-3 pb-40 pt-4">
        {v ? <SessionView title={v.title} subtitle={v.subtitle} groups={v.groups} allowAdd={v.allowAdd} date={date} setDate={setDate} /> : <StatsView />}
      </main>

      <TimerBar />

      {settings && <SettingsSheet onClose={() => setSettings(false)} onLock={onLock} />}
    </div>
  )
}
