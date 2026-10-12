import { Menu, Search } from 'lucide-react'
import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { Catalog, FILTERS, type FilterId } from './components/Catalog'
import { PinLock } from './components/PinLock'
import { SettingsSheet } from './components/SettingsSheet'
import { StatsView } from './components/StatsView'
import { TimerBar } from './components/TimerBar'
import { hasValidSession } from './lib/auth'
import { useAutoBackup } from './lib/backup'
import { useProgram } from './lib/custom'
import { today } from './lib/storage'

type Tab = 'catalogue' | 'progression'

const FILTER_KEY = 'trailstrong:filter'

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

function Shell({ onLock }: { onLock: () => void }) {
  useAutoBackup()
  const online = useOnline()
  const program = useProgram()
  const [tab, setTab] = useState<Tab>('catalogue')
  const [filter, setFilterState] = useState<FilterId>(() => {
    const saved = localStorage.getItem(FILTER_KEY) as FilterId | null
    return saved && FILTERS.some((f) => f.id === saved) ? saved : 'activation'
  })
  const [query, setQuery] = useState('')
  const [date, setDate] = useState(today())
  const [menu, setMenu] = useState(false)
  const touch = useRef<{ x: number; y: number; ok: boolean } | null>(null)

  const setFilter = (f: FilterId) => {
    setFilterState(f)
    localStorage.setItem(FILTER_KEY, f)
  }

  const focusSearch = () => {
    setTab('catalogue')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    window.setTimeout(() => document.getElementById('search')?.focus(), 80)
  }

  // Balayage horizontal entre filtres (hors champs, graphiques et tiroirs).
  const onTouchStart = (e: TouchEvent) => {
    const el = e.target as HTMLElement
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ok: tab === 'catalogue' && !el.closest('input, textarea, select, svg, [data-noswipe], [role=toolbar]') }
  }
  const onTouchEnd = (e: TouchEvent) => {
    const t0 = touch.current
    touch.current = null
    if (!t0?.ok) return
    const dx = e.changedTouches[0].clientX - t0.x
    const dy = e.changedTouches[0].clientY - t0.y
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return
    const i = FILTERS.findIndex((f) => f.id === filter)
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

  return (
    <div className="min-h-dvh" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* ── En-tête ── */}
      <header className="pt-safe dots border-b border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 pb-3 pt-3">
          <span className="relative -rotate-1 border border-dashed border-zinc-600 bg-zinc-900 px-2.5 py-1.5">
            <span className="headline block text-[19px] text-zinc-50 [text-shadow:2px_2px_0_rgba(249,115,22,0.6)]">TrailStrong</span>
            <span className="mt-0.5 block font-mono text-[9px] tracking-[0.14em] text-zinc-500">2026 // ÉCONOFITNESS</span>
          </span>
          <span className="ml-auto mr-1 hidden items-center gap-1.5 text-[11px] text-zinc-500 min-[400px]:flex" title={online ? 'Session privée, en ligne' : 'Hors-ligne'}>
            <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            {online ? 'Privé' : 'Hors-ligne'}
          </span>
          <button
            type="button"
            onClick={focusSearch}
            aria-label="Rechercher"
            className="ml-auto grid h-11 w-11 place-items-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-200 min-[400px]:ml-0"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => setMenu(true)}
            className="flex h-11 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-100 px-3.5 font-display text-[14px] font-black uppercase italic text-zinc-950"
          >
            <Menu className="h-4 w-4" strokeWidth={2.5} /> Menu
          </button>
        </div>

        {/* Onglets « dossiers » */}
        <nav className="mx-auto flex max-w-6xl items-end gap-1 px-3" aria-label="Sections">
          {(
            [
              ['catalogue', 'Catalogue'],
              ['progression', 'Progression'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={`-mb-px rounded-t-lg border border-b-0 px-3.5 font-display text-[12px] font-black uppercase italic tracking-tight transition-all duration-150 ${
                tab === id ? 'h-10 border-zinc-700 bg-zinc-950 text-zinc-50' : 'h-8 border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-3 pb-28">
        {tab === 'catalogue' ? (
          <Catalog program={program} filter={filter} setFilter={setFilter} query={query} setQuery={setQuery} date={date} setDate={setDate} />
        ) : (
          <div className="pt-4">
            <StatsView />
          </div>
        )}
      </main>

      <TimerBar />

      {menu && (
        <SettingsSheet
          onClose={() => setMenu(false)}
          onLock={onLock}
          onNavigate={(t) => {
            setTab(t)
            setMenu(false)
            window.scrollTo({ top: 0 })
          }}
        />
      )}
    </div>
  )
}
