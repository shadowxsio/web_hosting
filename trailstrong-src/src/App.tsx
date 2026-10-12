import { BarChart3, LayoutGrid, Menu, Search } from 'lucide-react'
import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { Catalog, type Scope } from './components/Catalog'
import { SESSION_META } from './components/meta'
import { PinLock } from './components/PinLock'
import { SettingsSheet } from './components/SettingsSheet'
import { StatsView } from './components/StatsView'
import { TimerBar } from './components/TimerBar'
import type { FocusTag } from './data/program'
import { hasValidSession } from './lib/auth'
import { useAutoBackup } from './lib/backup'
import { useProgram } from './lib/custom'
import { today } from './lib/storage'

export type View = Scope | 'stats'

/** Onglets : dossiers colorés en haut (desktop) / dock en bas (mobile). */
export const TABS: { id: View; label: string; short: string; emoji?: string; bg: string }[] = [
  { id: 'all', label: 'Tout', short: 'Tout', bg: 'bg-paper' },
  ...(Object.entries(SESSION_META) as [View, (typeof SESSION_META)[keyof typeof SESSION_META]][]).map(([id, m]) => ({
    id,
    label: m.label,
    short: m.short,
    emoji: m.emoji,
    bg: m.bg,
  })),
  { id: 'stats', label: 'Progression', short: 'Stats', bg: 'bg-sky' },
]

const VIEW_KEY = 'trailstrong:view'

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
  const program = useProgram()
  const [view, setViewState] = useState<View>(() => {
    const saved = localStorage.getItem(VIEW_KEY) as View | null
    return saved && TABS.some((t) => t.id === saved) ? saved : 'activation'
  })
  const [focus, setFocus] = useState<FocusTag | null>(null)
  const [query, setQuery] = useState('')
  const [date, setDate] = useState(today())
  const [menu, setMenu] = useState(false)
  const touch = useRef<{ x: number; y: number; ok: boolean } | null>(null)

  const setView = (v: View) => {
    setViewState(v)
    setFocus(null)
    localStorage.setItem(VIEW_KEY, v)
    window.scrollTo({ top: 0 })
  }

  const focusSearch = () => {
    if (view === 'stats') setView('all')
    window.setTimeout(() => {
      const el = document.getElementById('search')
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.focus({ preventScroll: true })
    }, 60)
  }

  // Balayage horizontal entre onglets.
  const onTouchStart = (e: TouchEvent) => {
    const el = e.target as HTMLElement
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ok: !el.closest('input, textarea, select, svg, [data-noswipe], [role=toolbar]') }
  }
  const onTouchEnd = (e: TouchEvent) => {
    const t0 = touch.current
    touch.current = null
    if (!t0?.ok) return
    const dx = e.changedTouches[0].clientX - t0.x
    const dy = e.changedTouches[0].clientY - t0.y
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return
    const i = TABS.findIndex((t) => t.id === view)
    const j = i + (dx < 0 ? 1 : -1)
    if (j >= 0 && j < TABS.length) {
      navigator.vibrate?.(8)
      setView(TABS[j].id)
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
      <header className="pt-safe">
        <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-3 pb-4 pt-4 md:px-6">
          <button type="button" onClick={() => setView('all')} className="-rotate-2 border-[2.5px] border-ink bg-paper p-1 shadow-[4px_4px_0_var(--color-shadow)]" aria-label="Accueil">
            <span className="block border-2 border-dashed border-ink px-2.5 py-1.5 min-[400px]:px-3">
              <span className="headline block text-[19px] [text-shadow:2px_2px_0_#f0773a] min-[400px]:text-[22px]">TrailStrong</span>
            </span>
          </button>
          <button
            type="button"
            onClick={focusSearch}
            aria-label="Rechercher"
            className="b-btn ml-auto grid h-12 w-12 shrink-0 place-items-center rounded-full"
          >
            <Search className="h-5 w-5" strokeWidth={2.8} />
          </button>
          <button type="button" onClick={() => setMenu(true)} className="b-btn flex h-12 shrink-0 items-center gap-1.5 bg-sun px-3 text-[15px] uppercase italic min-[400px]:px-4">
            <Menu className="h-5 w-5" strokeWidth={3} /> Menu
          </button>
        </div>

        {/* Onglets-dossiers (desktop) */}
        <nav className="mx-auto hidden max-w-6xl items-end gap-1.5 px-6 md:flex" aria-label="Onglets">
          {TABS.map((t) => {
            const active = t.id === view
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setView(t.id)}
                aria-current={active ? 'page' : undefined}
                className={`-mb-[2.5px] rounded-t-xl border-[2.5px] border-ink px-4 text-[13px] font-black uppercase italic transition-all duration-150 ${
                  active ? `h-12 border-b-hero bg-hero` : `h-10 ${t.bg} hover:h-11`
                }`}
              >
                {t.emoji && <span className="mr-1 not-italic">{t.emoji}</span>}
                {t.label}
              </button>
            )
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-3 pb-44 md:px-6 md:pb-28">
        {view === 'stats' ? (
          <StatsView />
        ) : (
          <Catalog program={program} scope={view} focus={focus} setFocus={setFocus} query={query} setQuery={setQuery} date={date} setDate={setDate} />
        )}
      </main>

      <TimerBar />

      {/* ── Dock mobile ── */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t-[2.5px] border-ink bg-paper md:hidden" aria-label="Onglets" data-noswipe>
        <ul className="grid grid-cols-6">
          {TABS.map((t) => {
            const active = t.id === view
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setView(t.id)}
                  aria-current={active ? 'page' : undefined}
                  className="flex h-[60px] w-full flex-col items-center justify-center gap-0.5 px-0.5"
                >
                  <span
                    className={`grid h-8 w-11 place-items-center rounded-lg border-2 text-[16px] transition-all duration-150 ${
                      active ? `${t.bg} -translate-y-0.5 border-ink shadow-[2px_2px_0_var(--color-shadow)]` : 'border-transparent'
                    }`}
                  >
                    {t.id === 'all' ? <LayoutGrid className="h-[18px] w-[18px]" strokeWidth={2.5} /> : t.id === 'stats' ? <BarChart3 className="h-[18px] w-[18px]" strokeWidth={2.5} /> : t.emoji}
                  </span>
                  <span className={`truncate text-[10px] uppercase italic ${active ? 'font-black text-ink' : 'font-extrabold text-ink/55'}`}>{t.short}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {menu && (
        <SettingsSheet
          onClose={() => setMenu(false)}
          onLock={onLock}
          onNavigate={(v, f) => {
            setView(v)
            if (f) setFocus(f)
            setMenu(false)
          }}
        />
      )}
    </div>
  )
}
