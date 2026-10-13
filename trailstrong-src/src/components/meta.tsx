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
import type { ReactNode } from 'react'
import type { Direction, Exercise, FocusTag, IconName, SessionId, Zone } from '../data/program'

export const TAG_META: Record<FocusTag, { label: string; emoji: string }> = {
  knee: { label: 'Genou', emoji: '🩹' },
  ankle: { label: 'Cheville', emoji: '⚓' },
  glutes: { label: 'Fessiers', emoji: '🍑' },
}

/** Couleur d'étiquette par séance (onglets et bandeaux de section). */
export const SESSION_META: Record<SessionId, { label: string; short: string; emoji: string; bg: string }> = {
  activation: { label: 'Activation', short: 'Activ.', emoji: '🔥', bg: 'bg-sun' },
  seanceA: { label: 'Séance A', short: 'Séance A', emoji: '🦵', bg: 'bg-peach' },
  seanceB: { label: 'Séance B', short: 'Séance B', emoji: '⚖️', bg: 'bg-mint' },
  tapis: { label: 'Tapis D+', short: 'Tapis', emoji: '⛰️', bg: 'bg-lilac' },
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
  hanche: { label: 'Hanche', cls: 'bg-peach' },
  genou: { label: 'Genou', cls: 'bg-sky' },
  cheville: { label: 'Cheville', cls: 'bg-lilac' },
  pied: { label: 'Pied', cls: 'bg-mint' },
  tronc: { label: 'Tronc', cls: 'bg-sun' },
}

export const DIR_META: Record<Direction, { icon: LucideIcon; label: string }> = {
  up: { icon: ArrowUp, label: 'monte' },
  down: { icon: ArrowDown, label: 'descend' },
  back: { icon: ArrowLeft, label: 'recule' },
  forward: { icon: ArrowRight, label: 'avance' },
  out: { icon: MoveHorizontal, label: 'écarte' },
  hold: { icon: CircleDot, label: 'stable' },
}

export function Pill({ children, tone = 'paper' }: { children: ReactNode; tone?: 'paper' | 'sun' | 'sky' }) {
  const bg = tone === 'sun' ? 'bg-sun' : tone === 'sky' ? 'bg-sky' : 'bg-paper'
  return (
    <span className={`inline-flex h-6 items-center whitespace-nowrap border-2 border-ink px-2 text-[11px] font-bold text-ink rounded-xl ${bg}`}>{children}</span>
  )
}
