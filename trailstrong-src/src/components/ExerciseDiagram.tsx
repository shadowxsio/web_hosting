/**
 * Schéma d'exécution statique, façon croquis : mannequin à contour dans la
 * position finale, position de départ en pointillés, flèches de mouvement
 * (orange = hanche / tronc, cyan = genou / cheville). Aucune animation.
 */
import type { ReactNode } from 'react'
import { FIGURES, solve, type AnimationId, type FigureDef, type JointName, type Joints } from './diagram-base'

type Vec = [number, number]

/** Exercice → schéma. */
export const DIAGRAM_OF: Record<string, AnimationId> = {
  'sl-balance': 'balance',
  'tibialis-raise': 'tibialis',
  'calf-raise-warm': 'calfRaise',
  'sl-glute-bridge': 'gluteBridge',
  'banded-walk': 'bandedWalk',
  'spanish-squat': 'spanishSquat',
  'db-rdl': 'rdl',
  bulgarian: 'bulgarian',
  'leg-curl': 'legCurl',
  'nordic-curl': 'nordic',
  'hip-abduction': 'abduction',
  'standing-calf': 'singleCalf',
  'sl-rdl': 'singleLegRdl',
  'hip-thrust': 'hipThrust',
  'leg-press-high': 'legPress',
  'step-down': 'stepDown',
  'copenhagen-plank': 'copenhagen',
  'soleus-raise': 'soleusRaise',
  'sl-calf-raise': 'singleCalf',
  'power-hike': 'powerHike',
}

const INK = 'var(--color-ink)'
const FILL = 'var(--color-paper)'
const FILL_BACK = 'color-mix(in srgb, var(--color-ink) 14%, var(--color-paper))'
const FOCUS = 'color-mix(in srgb, var(--color-ocean) 55%, var(--color-paper))'
const COLORS = { flame: 'var(--color-flame)', sky: 'var(--color-ocean)' }

/** Segment « capsule » à contour : trait épais encre + trait plus fin rempli. */
function Capsule({ a, b, w, fill }: { a: Vec; b: Vec; w: number; fill: string }) {
  return (
    <g strokeLinecap="round">
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} style={{ stroke: INK }} strokeWidth={w} />
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} style={{ stroke: fill }} strokeWidth={w - 4.4} />
    </g>
  )
}

function Mannequin({ j, def }: { j: Joints; def: FigureDef }) {
  const focus = new Set(def.focus ?? [])
  const f = (seg: string, base: string) => (focus.has(seg as never) ? FOCUS : base)
  const back = def.front ? FILL : FILL_BACK
  return (
    <g>
      {/* membres arrière */}
      <Capsule a={j.shL} b={j.e2} w={8.5} fill={back} />
      <Capsule a={j.e2} b={j.h2} w={7.5} fill={back} />
      <Capsule a={j.hipL} b={j.k2} w={12} fill={f('th2', back)} />
      <Capsule a={j.k2} b={j.a2} w={10} fill={f('sh2', back)} />
      <Capsule a={j.a2} b={j.t2} w={6.5} fill={back} />
      {/* tronc + tête */}
      {def.front && <Capsule a={j.hipL} b={j.hipR} w={14} fill={FILL} />}
      {def.front && <Capsule a={j.shL} b={j.shR} w={12} fill={FILL} />}
      <Capsule a={j.hip} b={j.sh} w={18} fill={FILL} />
      {focus.has('glute') && <circle cx={j.hip[0]} cy={j.hip[1]} r={6.5} style={{ fill: 'color-mix(in srgb, var(--color-flame) 60%, var(--color-paper))' }} />}
      <circle cx={j.head[0]} cy={j.head[1]} r={9.5} style={{ fill: FILL, stroke: INK }} strokeWidth={2.2} />
      {/* membres avant */}
      <Capsule a={j.hipR} b={j.k1} w={12} fill={f('th1', FILL)} />
      <Capsule a={j.k1} b={j.a1} w={10} fill={f('sh1', FILL)} />
      <Capsule a={j.a1} b={j.t1} w={6.5} fill={f('ft1', FILL)} />
      <Capsule a={j.shR} b={j.e1} w={8.5} fill={FILL} />
      <Capsule a={j.e1} b={j.h1} w={7.5} fill={FILL} />
    </g>
  )
}

/** Position de départ : squelette fin en pointillés. */
function Ghost({ j }: { j: Joints }) {
  const segs: [JointName | 'hipL' | 'hipR' | 'shL' | 'shR', JointName | 'hipL' | 'hipR' | 'shL' | 'shR'][] = [
    ['hip', 'sh'],
    ['hipR', 'k1'],
    ['k1', 'a1'],
    ['a1', 't1'],
    ['hipL', 'k2'],
    ['k2', 'a2'],
    ['a2', 't2'],
    ['shR', 'e1'],
    ['e1', 'h1'],
    ['shL', 'e2'],
    ['e2', 'h2'],
  ]
  return (
    <g style={{ stroke: INK }} strokeWidth={2} strokeDasharray="3 4" strokeLinecap="round" opacity={0.45} fill="none">
      {segs.map(([a, b], i) => (
        <line key={i} x1={j[a][0]} y1={j[a][1]} x2={j[b][0]} y2={j[b][1]} />
      ))}
      <circle cx={j.head[0]} cy={j.head[1]} r={9} />
    </g>
  )
}

function Arrows({ s, e, def }: { s: Joints; e: Joints; def: FigureDef }) {
  const pts = Object.values(e) as Vec[]
  const c: Vec = [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length]
  const out: ReactNode[] = []
  for (const [k, ar] of (def.arrows ?? []).entries()) {
    let p0 = s[ar.joint]
    let p1 = e[ar.joint]
    const d0: Vec = [p1[0] - p0[0], p1[1] - p0[1]]
    const len0 = Math.hypot(d0[0], d0[1])
    if (len0 < 3) continue
    // Petits mouvements (mollets, tibialis) : flèche allongée à 24 px minimum, centrée.
    if (len0 < 24) {
      const k = (24 - len0) / 2 / len0
      p0 = [p0[0] - d0[0] * k, p0[1] - d0[1] * k]
      p1 = [p1[0] + d0[0] * k, p1[1] + d0[1] * k]
    }
    const d: Vec = [p1[0] - p0[0], p1[1] - p0[1]]
    const len = Math.hypot(d[0], d[1])
    const mid: Vec = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2]
    let n: Vec = [-d[1] / len, d[0] / len]
    // La flèche se courbe et se décale vers l'extérieur du corps.
    if (n[0] * (mid[0] - c[0]) + n[1] * (mid[1] - c[1]) < 0) n = [-n[0], -n[1]]
    const bend = ar.bend ?? 0.32
    const off = 11
    const a: Vec = [p0[0] + n[0] * off, p0[1] + n[1] * off]
    const b: Vec = [p1[0] + n[0] * off, p1[1] + n[1] * off]
    const q: Vec = [mid[0] + n[0] * (off + len * bend), mid[1] + n[1] * (off + len * bend)]
    // Pointe : direction tangente en fin de courbe (b - q).
    const t: Vec = [b[0] - q[0], b[1] - q[1]]
    const tl = Math.hypot(t[0], t[1]) || 1
    const u: Vec = [t[0] / tl, t[1] / tl]
    const tip: Vec = [b[0] + u[0] * 2, b[1] + u[1] * 2]
    const left: Vec = [tip[0] - u[0] * 9 - u[1] * 5.5, tip[1] - u[1] * 9 + u[0] * 5.5]
    const right: Vec = [tip[0] - u[0] * 9 + u[1] * 5.5, tip[1] - u[1] * 9 - u[0] * 5.5]
    const col = COLORS[ar.color]
    out.push(
      <g key={k}>
        <path d={`M${a[0]} ${a[1]} Q${q[0]} ${q[1]} ${b[0]} ${b[1]}`} fill="none" style={{ stroke: col }} strokeWidth={3.2} strokeLinecap="round" />
        <path d={`M${left[0]} ${left[1]} L${tip[0]} ${tip[1]} L${right[0]} ${right[1]} Z`} style={{ fill: col, stroke: col }} strokeWidth={1.5} strokeLinejoin="round" />
      </g>,
    )
  }
  return <g>{out}</g>
}

export function ExerciseDiagram({ id }: { id: AnimationId }) {
  const def = FIGURES[id]
  const s = solve(def.start)
  const e = solve(def.end)
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="Schéma d’exécution : départ en pointillés, fin en plein, flèches de mouvement">
      {def.props?.(e)}
      <Ghost j={s} />
      <Mannequin j={e} def={def} />
      {def.over?.(e)}
      <Arrows s={s} e={e} def={def} />
    </svg>
  )
}
