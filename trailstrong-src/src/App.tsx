import { BarChart3, LayoutGrid, Menu, Search } from 'lucide-react'
import { Suspense, lazy, useEffect, useMemo, useRef, useState, type CSSProperties, type ComponentProps, type TouchEvent } from 'react'
import { flushSync } from 'react-dom'
import { Catalog, type Scope } from './components/Catalog'
import { SESSION_META } from './components/meta'
import { LoginScreen } from './components/LoginScreen'
import type { SettingsSheet as SettingsSheetType } from './components/SettingsSheet'
import { TimerBar } from './components/TimerBar'
import type { FocusTag, Session } from './data/program'
import { hasValidSession } from './lib/auth'
import { useAutoBackup } from './lib/backup'
import { useProgram } from './lib/custom'
import { firebaseEnabled } from './lib/firebaseConfig'
import { inSandbox } from './lib/sandbox'
import { today, updateProfile, useData } from './lib/storage'
import { haptic } from './lib/haptics'

const CloudApp = lazy(() => import('./CloudApp'))
// Écrans secondaires chargés à la demande (démarrage plus léger ; précachés pour le hors-ligne).
const SettingsSheet = lazy(() => import('./components/SettingsSheet').then((m) => ({ default: m.SettingsSheet })))
const StatsView = lazy(() => import('./components/StatsView').then((m) => ({ default: m.StatsView })))
const GuidedTour = lazy(() => import('./components/GuidedTour').then((m) => ({ default: m.GuidedTour })))
const SandboxApp = lazy(() => import('./SandboxApp'))

export type View = Scope | 'stats'

type Tab = { id: View; label: string; short: string; emoji?: string; bg: string }

/** Onglets : dossiers colorés en haut (desktop) / dock en bas (mobile), d'après le programme du compte. */
function tabsOf(program: Session[]): Tab[] {
  return [
    { id: 'all', label: 'Tout', short: 'Tout', bg: 'bg-paper' },
    // L'Activation est intégrée en tête de chaque séance : pas d'onglet dédié.
    ...program
      .filter((s) => s.id !== 'activation' && s.exercises.length > 0)
      .map((s) => ({
        id: s.id as View,
        label: s.short,
        short: s.short.length > 9 ? SESSION_META[s.id].short : s.short,
        // L'emplacement « tapis » peut accueillir une Séance C (gainage…) dans un programme généré.
        emoji: s.id === 'tapis' && !/tapis/i.test(s.short) ? '🧱' : SESSION_META[s.id].emoji,
        bg: SESSION_META[s.id].bg,
      })),
    { id: 'stats', label: 'Progression', short: 'Stats', bg: 'bg-sky' },
  ]
}

const VIEW_KEY = 'trailstrong:view'

export default function App() {
  if (inSandbox)
    return (
      <Suspense fallback={null}>
        <SandboxApp />
      </Suspense>
    )
  if (firebaseEnabled)
    return (
      <Suspense fallback={null}>
        <CloudApp />
      </Suspense>
    )
  return <LocalApp />
}

/** Mode local historique : un seul utilisateur, données sur l'appareil. */
function LocalApp() {
  const [auth, setAuth] = useState<'checking' | 'locked' | 'open'>('checking')
  useEffect(() => {
    void hasValidSession().then((ok) => setAuth(ok ? 'open' : 'locked'))
  }, [])
  if (auth === 'checking') return null
  if (auth === 'locked') return <LoginScreen onUnlock={() => setAuth('open')} />
  return <Shell onLock={() => setAuth('locked')} />
}

export function Shell({ onLock, cloud }: { onLock: () => void; cloud?: ComponentProps<typeof SettingsSheetType>['cloud'] }) {
  useAutoBackup()
  const program = useProgram()
  const { profile } = useData()
  // Visite guidée : automatique pour un nouveau compte, puis depuis le Menu.
  const [tour, setTour] = useState(false)
  useEffect(() => {
    if (!profile.tourPending) return
    const id = window.setTimeout(() => setTour(true), 700)
    return () => window.clearTimeout(id)
  }, [profile.tourPending])
  const endTour = () => {
    setTour(false)
    if (profile.tourPending || !profile.tourDone) updateProfile({ tourPending: false, tourDone: true })
  }
  const TABS = useMemo(() => tabsOf(program), [program])
  const [view, setViewState] = useState<View>(() => (localStorage.getItem(VIEW_KEY) as View | null) ?? 'seanceA')
  // Vue mémorisée qui n'existe plus dans ce programme → première séance.
  useEffect(() => {
    if (!TABS.some((t) => t.id === view)) setViewState(TABS[1]?.id ?? 'all')
  }, [TABS, view])
  const [focus, setFocus] = useState<FocusTag | null>(null)
  const [query, setQuery] = useState('')
  const [date, setDate] = useState(today())
  const [menu, setMenu] = useState(false)
  const [testsOpen, setTestsOpen] = useState(false)
  const openTests = () => {
    setView('stats')
    setTestsOpen(true)
  }
  const touch = useRef<{ x: number; y: number; ok: boolean } | null>(null)

  const setView = (v: View) => {
    localStorage.setItem(VIEW_KEY, v)
    const apply = () => {
      setViewState(v)
      setFocus(null)
      window.scrollTo({ top: 0 })
    }
    // Changement d'onglet animé : la page glisse dans le sens de l'onglet (View Transitions).
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
    if (v === view || !doc.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return apply()
    const ids = TABS.map((t) => t.id)
    document.documentElement.dataset.vt = ids.indexOf(v) < ids.indexOf(view) ? 'back' : 'fwd'
    const vt = doc.startViewTransition(() => flushSync(apply)) as { finished?: Promise<void> }
    vt.finished?.finally(() => delete document.documentElement.dataset.vt)
  }
  const tabIndex = Math.max(0, TABS.findIndex((t) => t.id === view))
  // En-tête compact (verre) dès qu'on fait défiler la page.
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setScrolled(window.scrollY > 24))
    }
    window.addEventListener('scroll', on, { passive: true })
    on()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', on)
    }
  }, [])
  // Pastille du dock : étirement « liquide » pendant le déplacement.
  const [pillMoving, setPillMoving] = useState(false)
  const firstPill = useRef(true)
  useEffect(() => {
    if (firstPill.current) {
      firstPill.current = false
      return
    }
    setPillMoving(true)
    const id = window.setTimeout(() => setPillMoving(false), 560)
    return () => window.clearTimeout(id)
  }, [tabIndex])

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
      haptic(8)
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
      <header className={`pt-safe sticky top-0 z-30 transition-[background-color,box-shadow] duration-300 ${scrolled ? 'header-glass' : ''}`}>
        <div className={`mx-auto flex max-w-6xl items-center gap-2.5 px-3 transition-[padding] duration-300 md:px-6 ${scrolled ? 'pb-2 pt-2' : 'pb-4 pt-4'}`}>
          <button
            type="button"
            onClick={() => setView('all')}
            className={`logo-patch -rotate-2 origin-left text-[19px] transition-[scale] duration-300 min-[400px]:text-[22px] ${scrolled ? 'scale-[0.84]' : ''}`}
            aria-label="Accueil"
          >
            <span>TrailStrong</span>
          </button>
          <button
            type="button"
            onClick={focusSearch}
            aria-label="Rechercher"
            className="b-btn ml-auto grid h-12 w-12 shrink-0 place-items-center rounded-full"
          >
            <Search className="h-5 w-5" strokeWidth={2.8} />
          </button>
          <button type="button" onClick={() => setMenu(true)} data-tour="menu" className="b-btn flex h-12 shrink-0 items-center gap-1.5 bg-sun px-3 text-[15px] uppercase tracking-wide min-[400px]:px-4">
            <Menu className="h-5 w-5" strokeWidth={3} /> Menu
          </button>
        </div>

        {/* Onglets-dossiers (desktop) */}
        <nav className="mx-auto hidden max-w-6xl items-end gap-1.5 px-6 md:flex" aria-label="Onglets" data-tour="tabs">
          {TABS.map((t) => {
            const active = t.id === view
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setView(t.id)}
                aria-current={active ? 'page' : undefined}
                className={`-mb-[2.5px] rounded-t-xl border-[2.5px] border-ink px-4 text-[13px] font-black uppercase tracking-wide transition-all duration-150 ${
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

      <main className="mx-auto max-w-6xl px-3 pb-48 md:px-6 md:pb-28" style={{ viewTransitionName: 'page' } as CSSProperties}>
        {view === 'stats' ? (
          <Suspense fallback={null}>
            <StatsView testsOpen={testsOpen} setTestsOpen={setTestsOpen} />
          </Suspense>
        ) : (
          <Catalog program={program} scope={view} focus={focus} setFocus={setFocus} query={query} setQuery={setQuery} date={date} setDate={setDate} onTests={openTests} />
        )}
      </main>

      <TimerBar />

      {/* ── Dock mobile : capsule en verre + pastille liquide ── */}
      <nav
        className="vt-dock pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(10px+env(safe-area-inset-bottom))] md:hidden"
        aria-label="Onglets"
        data-noswipe
        data-tour="tabs"
      >
        <div className="glass pointer-events-auto relative mx-auto max-w-xl rounded-[30px] p-1">
          <span
            aria-hidden="true"
            className={`liquid-pill absolute bottom-1 left-1 top-1 rounded-[26px] border-2 border-ink shadow-[0_2px_0_var(--color-shadow)] ${TABS[tabIndex]?.bg ?? 'bg-paper'} ${pillMoving ? 'moving' : ''}`}
            style={{ width: `calc((100% - 8px) / ${TABS.length})`, transform: `translateX(${tabIndex * 100}%)` }}
          />
          <ul className="relative grid" style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }}>
            {TABS.map((t) => {
              const active = t.id === view
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!active) haptic(6)
                      setView(t.id)
                    }}
                    aria-current={active ? 'page' : undefined}
                    className={`squish flex h-[56px] w-full flex-col items-center justify-center gap-0.5 px-0.5 ${active && t.bg !== 'bg-paper' ? 'text-on' : ''}`}
                  >
                    <span className={`grid h-7 place-items-center text-[17px] transition-transform duration-300 ${active ? '-translate-y-px scale-110' : ''}`}>
                      {t.id === 'all' ? <LayoutGrid className="h-[18px] w-[18px]" strokeWidth={2.5} /> : t.id === 'stats' ? <BarChart3 className="h-[18px] w-[18px]" strokeWidth={2.5} /> : t.emoji}
                    </span>
                    <span className={`truncate text-[10px] uppercase tracking-wide ${active ? 'font-black' : 'font-extrabold text-ink/60'}`}>{t.short}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      <Suspense fallback={null}>
        {menu && (
          <SettingsSheet
            onClose={() => setMenu(false)}
            onLock={onLock}
            cloud={cloud}
            onTour={() => {
              setMenu(false)
              setView(TABS[1]?.id ?? 'all')
              window.setTimeout(() => setTour(true), 400)
            }}
            onNavigate={(v, f) => {
              setView(v)
              if (f) setFocus(f)
              setMenu(false)
            }}
            onTests={() => {
              setMenu(false)
              openTests()
            }}
          />
        )}
        {tour && <GuidedTour onClose={endTour} />}
      </Suspense>
    </div>
  )
}
