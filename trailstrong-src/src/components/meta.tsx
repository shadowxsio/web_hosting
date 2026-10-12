import {
  Activity,
  Anchor,
  ArrowDown,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpFromLine,
  ArrowUpRight,
  Dumbbell,
  Footprints,
  Mountain,
  MoveHorizontal,
  MoveVertical,
  CircleDot,
  Repeat,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { Direction, Exercise, FocusTag, IconName, SessionId, Zone } from '../data/program'

export const TAG_META: Record<FocusTag, { label: string; emoji: string }> = {
  knee: { label: 'Genou', emoji: '🩹' },
  ankle: { label: 'Cheville', emoji: '⚓' },
  glutes: { label: 'Fessiers', emoji: '🍑' },
}

/** Couleur d'étiquette par séance (onglet de carte façon quelleia). */
export const SESSION_META: Record<SessionId, { label: string; emoji: string; tab: string; dot: string }> = {
  activation: { label: 'Activation', emoji: '🔥', tab: 'bg-amber-400/15 text-amber-300 border-amber-400/25', dot: 'bg-amber-400' },
  seanceA: { label: 'Séance A', emoji: '🦵', tab: 'bg-orange-500/15 text-orange-300 border-orange-500/25', dot: 'bg-orange-500' },
  seanceB: { label: 'Séance B', emoji: '⚖️', tab: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25', dot: 'bg-cyan-500' },
  tapis: { label: 'Tapis D+', emoji: '⛰️', tab: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25', dot: 'bg-emerald-500' },
}

const ICONS: Record<IconName, LucideIcon> = {
  Footprints,
  ArrowUpFromLine,
  MoveVertical,
  MoveHorizontal,
  Anchor,
  Dumbbell,
  Repeat,
  ArrowDownToLine,
  ArrowUpRight,
  Activity,
  Mountain,
}

export const iconOf = (ex: Exercise): LucideIcon => (ex.icon ? ICONS[ex.icon] : Sparkles)

/** Catégorie lisible (badge de carte) : badge perso, sinon groupe ciblé principal. */
export function categoryOf(ex: Exercise) {
  if (ex.badge) return ex.badge
  const t = ex.target.split('·')[0].trim()
  return t.length > 22 ? (ex.tags[0] ? TAG_META[ex.tags[0]].label : 'Perso') : t
}

export const restLabel = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m${s % 60 ? String(s % 60).padStart(2, '0') : ''}` : `${s}s`)

export const ZONE_META: Record<Zone, { label: string; cls: string }> = {
  hanche: { label: 'Hanche', cls: 'text-orange-300 bg-orange-500/10 border-orange-500/20' },
  genou: { label: 'Genou', cls: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20' },
  cheville: { label: 'Cheville', cls: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20' },
  pied: { label: 'Pied', cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
  tronc: { label: 'Tronc', cls: 'text-zinc-300 bg-zinc-500/10 border-zinc-500/20' },
}

export const DIR_META: Record<Direction, { icon: LucideIcon; label: string }> = {
  up: { icon: ArrowUp, label: 'monte' },
  down: { icon: ArrowDown, label: 'descend' },
  back: { icon: ArrowLeft, label: 'recule' },
  forward: { icon: ArrowRight, label: 'avance' },
  out: { icon: MoveHorizontal, label: 'écarte' },
  hold: { icon: CircleDot, label: 'stable' },
}

export function Pill({ children, tone = 'zinc' }: { children: React.ReactNode; tone?: 'zinc' | 'orange' | 'cyan' }) {
  const cls =
    tone === 'orange'
      ? 'border-orange-500/25 bg-orange-500/10 text-orange-300'
      : tone === 'cyan'
        ? 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300'
        : 'border-zinc-800 bg-zinc-900 text-zinc-400'
  return <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-md border px-2 text-[11px] font-medium ${cls}`}>{children}</span>
}
