import { BarChart3, Dumbbell, Flame, Mountain, Settings, Zap } from 'lucide-react'
import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { PinLock } from './components/PinLock'
import { SessionView } from './components/SessionView'
import { SettingsSheet } from './components/SettingsSheet'
import { StatsView } from './components/StatsView'
import { TimerBar } from './components/TimerBar'
import { PROGRAM, type SessionId } from './data/program'
import { hasValidSession } from './lib/auth'
import { useAutoBackup } from './lib/backup'
import { today } from './lib/storage'

type TabId = SessionId | 'stats'

const TABS: { id: TabId; label: string; icon: typeof Flame }[] = [
  { id: 'activation', label: 'Activation', icon: Flame },
  { id: 'seanceA', label: 'Séance A', icon: Dumbbell },
  { id: 'seanceB', label: 'Séance B', icon: Zap },
  { id: 'tapis', label: 'Tapis D+', icon: Mountain },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
]

const TAB_KEY = 'trailstrong:tab'

export default function App() {
  const [auth, setAuth] = useState<'checking' | 'locked' | 'open'>('checking')
  useEffect(() => {
    void hasValidSession().then((ok) => setAuth(ok ? 'open' : 'locked'))
  }, [])
  if (auth === 'checking') return null
  if (auth === 'locked') return <PinLock onUnlock={() => setAuth('open')} />
  return <Shell onLock={() => setAuth('locked')} />
}

function Shell({ onLock }: { onLock: () => void }) {
  useAutoBackup()
  const [tab, setTabState] = useState<TabId>(() => {
    const saved = localStorage.getItem(TAB_KEY) as TabId | null
    return saved && TABS.some((t) => t.id === saved) ? saved : 'activation'
  })
  const [date, setDate] = useState(today())
  const [settings, setSettings] = useState(false)
  const touch = useRef<{ x: number; y: number; ok: boolean } | null>(null)

  const setTab = (next: TabId) => {
    setTabState(next)
    localStorage.setItem(TAB_KEY, next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Balayage horizontal entre onglets (hors champs de saisie / graphiques).
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
    const i = TABS.findIndex((t) => t.id === tab)
    const j = i + (dx < 0 ? 1 : -1)
    if (j >= 0 && j < TABS.length) {
      navigator.vibrate?.(8)
      setTab(TABS[j].id)
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

  const session = PROGRAM.find((p) => p.id === tab)

  return (
    <div className="min-h-dvh" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <TimerBar />

      <div className="mx-auto max-w-xl px-3 pb-28 pt-3">
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="font-display text-lg font-extrabold tracking-tight text-white">
            TrailStrong <span className="text-ember">2026</span>
          </p>
          <button
            type="button"
            onClick={() => setSettings(true)}
            className="rounded-full p-2 text-slate-400 transition active:rotate-45 active:bg-white/10"
            aria-label="Réglages"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        <main key={tab} className="slide-in">
          {session ? <SessionView session={session} date={date} setDate={setDate} /> : <StatsView />}
        </main>
      </div>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-ink/80 backdrop-blur-xl">
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {TABS.map((t) => {
            const active = t.id === tab
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex w-full flex-col items-center gap-0.5 pb-2 pt-2.5 text-[10px] font-semibold transition ${
                    active ? 'text-ember' : 'text-slate-500'
                  }`}
                >
                  {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-ember shadow-[0_0_12px_#f97316]" />}
                  <t.icon className={`h-5 w-5 transition-transform ${active ? 'scale-110' : ''}`} strokeWidth={active ? 2.5 : 2} />
                  {t.label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {settings && <SettingsSheet onClose={() => setSettings(false)} onLock={onLock} />}
    </div>
  )
}
