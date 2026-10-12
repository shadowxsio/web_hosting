/**
 * Illustrations animées des exercices — un squelette 2D calculé en cinématique
 * directe (angles) ou inverse (pied posé sur une cible), interpolé entre une
 * position de DÉPART et une position de FIN. Zéro vidéo, zéro asset : quelques
 * Ko de SVG, parfait hors-ligne.
 */
import type { ReactNode } from 'react'

type Vec = [number, number]

export type AnimationId =
  | 'balance'
  | 'tibialis'
  | 'calfRaise'
  | 'singleCalf'
  | 'gluteBridge'
  | 'bandedWalk'
  | 'rdl'
  | 'bulgarian'
  | 'legCurl'
  | 'abduction'
  | 'singleLegRdl'
  | 'hipThrust'
  | 'legPress'
  | 'stepDown'
  | 'powerHike'

type JointName = 'hip' | 'sh' | 'head' | 'k1' | 'a1' | 't1' | 'k2' | 'a2' | 't2' | 'e1' | 'h1' | 'e2' | 'h2'

/** Angles en degrés, repère SVG : 0 = droite, 90 = bas, -90 = haut, 180 = gauche. */
export interface Pose {
  anchor: { joint: JointName; at: Vec }
  trunk: number
  ua1: number
  fa1: number
  ua2?: number
  fa2?: number
  th1?: number
  sh1?: number
  ft1: number
  th2?: number
  sh2?: number
  ft2: number
  /** Pied posé sur une cible (cinématique inverse) au lieu des angles. */
  tgt1?: Vec
  tgt2?: Vec
  bend1?: number
  bend2?: number
  /** Vue de face : largeur de hanches / d'épaules. */
  hipW?: number
  shW?: number
}

export type Joints = Record<JointName, Vec> & { hipL: Vec; hipR: Vec; shL: Vec; shR: Vec }

const L = { trunk: 50, neck: 14, ua: 26, fa: 24, th: 42, sh: 40, ft: 12 }

const rad = (d: number) => (d * Math.PI) / 180
const dir = (deg: number, len: number): Vec => [Math.cos(rad(deg)) * len, Math.sin(rad(deg)) * len]
const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]]
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]]
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerpV = (a: Vec, b: Vec, t: number): Vec => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]

function ik(base: Vec, target: Vec, bend: number): Vec {
  const d0 = sub(target, base)
  const dist = Math.min(Math.max(Math.hypot(d0[0], d0[1]), Math.abs(L.th - L.sh) + 0.5), L.th + L.sh - 0.01)
  const a = Math.atan2(d0[1], d0[0])
  const alpha = Math.acos((L.th * L.th + dist * dist - L.sh * L.sh) / (2 * L.th * dist))
  const k = a + bend * alpha
  return add(base, [Math.cos(k) * L.th, Math.sin(k) * L.th])
}

export function solve(p: Pose): Joints {
  const hip: Vec = [0, 0]
  const hw = (p.hipW ?? 0) / 2
  const sw = (p.shW ?? 0) / 2
  const hipR: Vec = [hw, 0]
  const hipL: Vec = [-hw, 0]
  const sh = add(hip, dir(p.trunk, L.trunk))
  const head = add(sh, dir(p.trunk, L.neck))
  const shR = add(sh, [sw, 0])
  const shL = add(sh, [-sw, 0])
  const e1 = add(shR, dir(p.ua1, L.ua))
  const h1 = add(e1, dir(p.fa1, L.fa))
  const e2 = add(shL, dir(p.ua2 ?? p.ua1, L.ua))
  const h2 = add(e2, dir(p.fa2 ?? p.fa1, L.fa))
  const rel: Partial<Joints> = { hip, sh, head, e1, h1, e2, h2, hipL, hipR, shL, shR }
  if (!p.tgt1) {
    rel.k1 = add(hipR, dir(p.th1 ?? 90, L.th))
    rel.a1 = add(rel.k1, dir(p.sh1 ?? 90, L.sh))
    rel.t1 = add(rel.a1, dir(p.ft1, L.ft))
  }
  if (!p.tgt2) {
    rel.k2 = add(hipL, dir(p.th2 ?? 90, L.th))
    rel.a2 = add(rel.k2, dir(p.sh2 ?? 90, L.sh))
    rel.t2 = add(rel.a2, dir(p.ft2, L.ft))
  }
  const ref = rel[p.anchor.joint]
  if (!ref) throw new Error(`anchor ${p.anchor.joint} must be angle-driven`)
  const off = sub(p.anchor.at, ref)
  const out = {} as Joints
  for (const [k, v] of Object.entries(rel)) out[k as JointName] = add(v as Vec, off)
  if (p.tgt1) {
    out.a1 = p.tgt1
    out.k1 = ik(out.hipR, p.tgt1, p.bend1 ?? -1)
    out.t1 = add(p.tgt1, dir(p.ft1, L.ft))
  }
  if (p.tgt2) {
    out.a2 = p.tgt2
    out.k2 = ik(out.hipL, p.tgt2, p.bend2 ?? -1)
    out.t2 = add(p.tgt2, dir(p.ft2, L.ft))
  }
  return out
}

export function interpolate(a: Pose, b: Pose, t: number): Pose {
  const n = (x: number | undefined, y: number | undefined, fb: number) => lerp(x ?? fb, y ?? fb, t)
  const v = (x?: Vec, y?: Vec) => (x && y ? lerpV(x, y, t) : undefined)
  return {
    anchor: { joint: a.anchor.joint, at: lerpV(a.anchor.at, b.anchor.at, t) },
    trunk: lerp(a.trunk, b.trunk, t),
    ua1: lerp(a.ua1, b.ua1, t),
    fa1: lerp(a.fa1, b.fa1, t),
    ua2: n(a.ua2, b.ua2, a.ua1),
    fa2: n(a.fa2, b.fa2, a.fa1),
    th1: n(a.th1, b.th1, 90),
    sh1: n(a.sh1, b.sh1, 90),
    ft1: lerp(a.ft1, b.ft1, t),
    th2: n(a.th2, b.th2, 90),
    sh2: n(a.sh2, b.sh2, 90),
    ft2: lerp(a.ft2, b.ft2, t),
    tgt1: v(a.tgt1, b.tgt1),
    tgt2: v(a.tgt2, b.tgt2),
    bend1: a.bend1,
    bend2: a.bend2,
    hipW: n(a.hipW, b.hipW, 0),
    shW: n(a.shW, b.shW, 0),
  }
}

const GROUND = 182
const C = {
  front: '#e2e8f0',
  back: '#475569',
  prop: '#1e293b',
  propLight: '#334155',
  accent: '#06b6d4',
  ember: '#f97316',
  ok: '#10b981',
}

const Ground = ({ y = GROUND, x1 = 8, x2 = 192 }: { y?: number; x1?: number; x2?: number }) => (
  <line x1={x1} y1={y} x2={x2} y2={y} stroke={C.propLight} strokeWidth={2} strokeDasharray="4 5" />
)

const Dumbbell = ({ at, color = C.accent }: { at: Vec; color?: string }) => (
  <g>
    <rect x={at[0] - 9} y={at[1] - 2} width={18} height={4} rx={2} fill={color} opacity={0.9} />
    <rect x={at[0] - 11} y={at[1] - 6} width={5} height={12} rx={1.5} fill={color} />
    <rect x={at[0] + 6} y={at[1] - 6} width={5} height={12} rx={1.5} fill={color} />
  </g>
)

export interface FigureDef {
  start: Pose
  end: Pose
  /** Accessoires dessinés derrière le corps (dépendants de la pose). */
  props?: (j: Joints) => ReactNode
  /** Accessoires dessinés devant le corps. */
  over?: (j: Joints) => ReactNode
  /** Segments surlignés (muscle ciblé). */
  focus?: Segment[]
  duration?: number
  front?: boolean
  label?: [string, string]
}

type Segment = 'trunk' | 'th1' | 'sh1' | 'th2' | 'sh2' | 'ft1' | 'ft2' | 'glute'

const stand = {
  trunk: -90,
  ua1: 92,
  fa1: 90,
  th1: 90,
  sh1: 90,
  ft1: 0,
  th2: 90,
  sh2: 90,
  ft2: 0,
}

export const FIGURES: Record<AnimationId, FigureDef> = {
  balance: {
    start: { ...stand, anchor: { joint: 'a1', at: [100, GROUND - 3] }, th1: 92, sh1: 88, th2: 60, sh2: 110, ft2: 20, ua1: 100, fa1: 95, ua2: 80, fa2: 85 },
    end: { ...stand, anchor: { joint: 'a1', at: [100, GROUND - 3] }, th1: 94, sh1: 86, th2: 35, sh2: 100, ft2: 10, ua1: -5, fa1: -10, ua2: 175, fa2: 180 },
    props: () => (
      <g>
        <Ground />
        <ellipse cx={104} cy={GROUND + 1} rx={30} ry={4} fill={C.accent} opacity={0.15} />
      </g>
    ),
    focus: ['sh1', 'ft1', 'glute'],
    duration: 3200,
  },
  tibialis: {
    start: { ...stand, anchor: { joint: 'a1', at: [118, GROUND - 3] }, trunk: -97, th1: 72, sh1: 70, th2: 74, sh2: 72, ft1: 0, ft2: 0, ua1: 100, fa1: 95 },
    end: { ...stand, anchor: { joint: 'a1', at: [118, GROUND - 3] }, trunk: -97, th1: 72, sh1: 70, th2: 74, sh2: 72, ft1: -40, ft2: -40, ua1: 100, fa1: 95 },
    props: () => (
      <g>
        <Ground />
        <rect x={52} y={20} width={8} height={GROUND - 20} fill={C.prop} rx={2} />
      </g>
    ),
    focus: ['sh1', 'ft1'],
    duration: 1800,
  },
  calfRaise: {
    start: { ...stand, anchor: { joint: 't1', at: [120, 166] }, ft1: -25, ft2: -25, ua1: 92, fa1: 90 },
    end: { ...stand, anchor: { joint: 't1', at: [120, 166] }, ft1: 50, ft2: 50, ua1: 92, fa1: 90 },
    props: () => (
      <g>
        <Ground />
        <rect x={108} y={166} width={60} height={GROUND - 166} fill={C.prop} rx={3} />
      </g>
    ),
    over: (j) => <Dumbbell at={j.h1} />,
    focus: ['sh1', 'sh2'],
    duration: 1800,
  },
  singleCalf: {
    start: { ...stand, anchor: { joint: 't1', at: [120, 166] }, ft1: -25, th2: 100, sh2: 160, ft2: 80, ua1: 30, fa1: -10, ua2: 95 },
    end: { ...stand, anchor: { joint: 't1', at: [120, 166] }, ft1: 50, th2: 100, sh2: 160, ft2: 80, ua1: 30, fa1: -10, ua2: 95 },
    props: () => (
      <g>
        <Ground />
        <rect x={108} y={166} width={60} height={GROUND - 166} fill={C.prop} rx={3} />
        <rect x={150} y={36} width={8} height={130} fill={C.prop} rx={2} />
      </g>
    ),
    focus: ['sh1'],
    duration: 1800,
  },
  gluteBridge: {
    start: { anchor: { joint: 'sh', at: [44, GROUND - 10] }, trunk: 180, ua1: 4, fa1: 0, th1: -48, sh1: 72, ft1: 0, th2: -22, sh2: -22, ft2: -20 },
    end: { anchor: { joint: 'sh', at: [44, GROUND - 10] }, trunk: 156, ua1: 12, fa1: 4, th1: -10, sh1: 84, ft1: 0, th2: -24, sh2: -24, ft2: -20 },
    props: () => (
      <g>
        <Ground />
      </g>
    ),
    focus: ['glute', 'th1'],
    duration: 2400,
  },
  bandedWalk: {
    front: true,
    start: { anchor: { joint: 'a2', at: [86, GROUND - 3] }, trunk: -90, hipW: 22, shW: 30, ua1: 80, fa1: 100, ua2: 100, fa2: 80, th1: 72, sh1: 104, ft1: 20, th2: 108, sh2: 76, ft2: 160 },
    end: { anchor: { joint: 'a2', at: [86, GROUND - 3] }, trunk: -90, hipW: 22, shW: 30, ua1: 80, fa1: 100, ua2: 100, fa2: 80, th1: 52, sh1: 88, ft1: 20, th2: 112, sh2: 74, ft2: 160 },
    props: () => <Ground />,
    over: (j) => (
      <path
        d={`M${j.k1[0]} ${j.k1[1] - 4} L${j.k2[0]} ${j.k2[1] - 4}`}
        stroke={C.ok}
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.9}
      />
    ),
    focus: ['glute'],
    duration: 2000,
  },
  rdl: {
    start: { ...stand, anchor: { joint: 'a1', at: [100, GROUND - 3] }, th1: 88, sh1: 92, th2: 88, sh2: 92 },
    end: { ...stand, anchor: { joint: 'a1', at: [100, GROUND - 3] }, trunk: -12, th1: 72, sh1: 96, th2: 72, sh2: 96, ua1: 92, fa1: 90 },
    props: () => <Ground />,
    over: (j) => <Dumbbell at={j.h1} />,
    focus: ['th1', 'glute'],
    duration: 2800,
  },
  bulgarian: {
    start: { ...stand, anchor: { joint: 'a1', at: [136, GROUND - 3] }, trunk: -70, th1: 76, sh1: 98, tgt2: [66, 138], bend2: -1, ft2: 175, ua1: 92 },
    end: { ...stand, anchor: { joint: 'a1', at: [136, GROUND - 3] }, trunk: -68, th1: 14, sh1: 98, tgt2: [66, 138], bend2: -1, ft2: 175, ua1: 92 },
    props: () => (
      <g>
        <Ground />
        <rect x={26} y={142} width={50} height={9} rx={3} fill={C.propLight} />
        <rect x={32} y={151} width={6} height={GROUND - 151} fill={C.prop} />
        <rect x={64} y={151} width={6} height={GROUND - 151} fill={C.prop} />
      </g>
    ),
    over: (j) => <Dumbbell at={j.h1} />,
    focus: ['glute', 'th1'],
    duration: 2600,
  },
  legCurl: {
    start: { anchor: { joint: 'hip', at: [70, 118] }, trunk: -98, ua1: 70, fa1: 20, th1: -4, sh1: 22, ft1: -70, th2: -4, sh2: 22, ft2: -70 },
    end: { anchor: { joint: 'hip', at: [70, 118] }, trunk: -98, ua1: 70, fa1: 20, th1: -4, sh1: 118, ft1: 20, th2: -4, sh2: 118, ft2: 20 },
    props: (j) => (
      <g>
        <Ground />
        <rect x={40} y={122} width={68} height={10} rx={4} fill={C.propLight} />
        <rect x={34} y={58} width={10} height={70} rx={4} fill={C.propLight} />
        <rect x={68} y={132} width={8} height={GROUND - 132} fill={C.prop} />
        <line x1={110} y1={128} x2={j.a1[0]} y2={j.a1[1]} stroke={C.prop} strokeWidth={4} />
        <circle cx={110} cy={128} r={5} fill={C.prop} />
      </g>
    ),
    over: (j) => <circle cx={j.a1[0] + 2} cy={j.a1[1] - 7} r={7} fill={C.accent} opacity={0.85} />,
    focus: ['th1'],
    duration: 2600,
  },
  abduction: {
    front: true,
    start: { anchor: { joint: 'a2', at: [92, GROUND - 3] }, trunk: -90, hipW: 22, shW: 30, ua1: 95, fa1: 90, ua2: 150, fa2: 120, th1: 90, sh1: 90, ft1: 20, th2: 92, sh2: 90, ft2: 160 },
    end: { anchor: { joint: 'a2', at: [92, GROUND - 3] }, trunk: -93, hipW: 22, shW: 30, ua1: 95, fa1: 90, ua2: 150, fa2: 120, th1: 52, sh1: 52, ft1: 10, th2: 92, sh2: 90, ft2: 160 },
    props: (j) => (
      <g>
        <Ground />
        <rect x={22} y={40} width={10} height={GROUND - 40} fill={C.prop} rx={2} />
        <circle cx={34} cy={GROUND - 8} r={5} fill={C.propLight} />
        <line x1={34} y1={GROUND - 8} x2={j.a1[0]} y2={j.a1[1]} stroke={C.accent} strokeWidth={2} opacity={0.7} />
      </g>
    ),
    focus: ['glute'],
    duration: 2200,
  },
  singleLegRdl: {
    start: { ...stand, anchor: { joint: 'a1', at: [104, GROUND - 3] }, th1: 90, sh1: 90, th2: 98, sh2: 100, ft2: 40, ua1: 92 },
    end: { ...stand, anchor: { joint: 'a1', at: [104, GROUND - 3] }, trunk: -6, th1: 80, sh1: 96, th2: 172, sh2: 174, ft2: 90, ua1: 92 },
    props: () => <Ground />,
    over: (j) => <Dumbbell at={j.h1} />,
    focus: ['th1', 'glute', 'ft1'],
    duration: 3000,
  },
  hipThrust: {
    start: { anchor: { joint: 'sh', at: [56, 132] }, trunk: -147, ua1: 30, fa1: -20, tgt1: [140, GROUND - 3], bend1: -1, ft1: 0, tgt2: [134, GROUND - 3], bend2: -1, ft2: 0 },
    end: { anchor: { joint: 'sh', at: [56, 132] }, trunk: 176, ua1: 40, fa1: -10, tgt1: [140, GROUND - 3], bend1: -1, ft1: 0, tgt2: [134, GROUND - 3], bend2: -1, ft2: 0 },
    props: () => (
      <g>
        <Ground />
        <rect x={12} y={136} width={50} height={10} rx={3} fill={C.propLight} />
        <rect x={18} y={146} width={6} height={GROUND - 146} fill={C.prop} />
        <rect x={50} y={146} width={6} height={GROUND - 146} fill={C.prop} />
      </g>
    ),
    over: (j) => (
      <g>
        <circle cx={j.hip[0]} cy={j.hip[1] - 9} r={9} fill="none" stroke={C.accent} strokeWidth={4} />
        <circle cx={j.hip[0]} cy={j.hip[1] - 9} r={3} fill={C.accent} />
      </g>
    ),
    focus: ['glute'],
    duration: 2400,
  },
  legPress: {
    start: { anchor: { joint: 'hip', at: [86, 150] }, trunk: -150, ua1: 60, fa1: 10, tgt1: [124, 112], bend1: -1, ft1: -80, tgt2: [120, 118], bend2: -1, ft2: -80 },
    end: { anchor: { joint: 'hip', at: [86, 150] }, trunk: -150, ua1: 60, fa1: 10, tgt1: [148, 88], bend1: -1, ft1: -80, tgt2: [144, 94], bend2: -1, ft2: -80 },
    props: (j) => {
      const p: Vec = add(j.t1, dir(45, 3))
      const a = dir(-45, 34)
      return (
        <g>
          <Ground />
          <line x1={118} y1={142} x2={194} y2={66} stroke={C.prop} strokeWidth={5} strokeLinecap="round" />
          <line x1={118} y1={142} x2={118} y2={GROUND} stroke={C.prop} strokeWidth={5} />
          <line x1={34} y1={130} x2={92} y2={162} stroke={C.propLight} strokeWidth={8} strokeLinecap="round" />
          <line x1={60} y1={150} x2={60} y2={GROUND} stroke={C.prop} strokeWidth={5} />
          <line x1={p[0] - a[0]} y1={p[1] - a[1]} x2={p[0] + a[0] * 0.3} y2={p[1] + a[1] * 0.3} stroke={C.accent} strokeWidth={6} strokeLinecap="round" />
        </g>
      )
    },
    focus: ['glute', 'th1'],
    duration: 2600,
  },
  stepDown: {
    start: { ...stand, anchor: { joint: 'a1', at: [78, 153] }, trunk: -88, th2: 70, sh2: 85, ft2: 10, ua1: 10, fa1: 0 },
    end: { ...stand, anchor: { joint: 'a1', at: [78, 153] }, trunk: -72, th1: 25, sh1: 115, th2: 55, sh2: 60, ft2: 30, ua1: 0, fa1: -5 },
    props: () => (
      <g>
        <Ground />
        <rect x={28} y={156} width={66} height={GROUND - 156} fill={C.prop} rx={3} />
      </g>
    ),
    focus: ['th1', 'glute'],
    duration: 3600,
  },
  powerHike: {
    start: { anchor: { joint: 'hip', at: [96, 98] }, trunk: -76, ua1: 50, fa1: -20, ua2: 120, fa2: 110, th1: 62, sh1: 96, ft1: -8, th2: 112, sh2: 122, ft2: 30 },
    end: { anchor: { joint: 'hip', at: [96, 98] }, trunk: -76, ua1: 120, fa1: 110, ua2: 50, fa2: -20, th1: 112, sh1: 122, ft1: 30, th2: 62, sh2: 96, ft2: -8 },
    props: () => (
      <g>
        <line x1={14} y1={190} x2={186} y2={164} stroke={C.prop} strokeWidth={8} strokeLinecap="round" />
        <line x1={14} y1={190} x2={186} y2={164} stroke={C.accent} strokeWidth={1.5} strokeDasharray="6 8" opacity={0.6}>
          <animate attributeName="stroke-dashoffset" from="0" to="28" dur="0.8s" repeatCount="indefinite" />
        </line>
        <line x1={170} y1={166} x2={176} y2={70} stroke={C.prop} strokeWidth={5} strokeLinecap="round" />
        <line x1={176} y1={70} x2={150} y2={74} stroke={C.prop} strokeWidth={5} strokeLinecap="round" />
        <text x={18} y={176} fill={C.accent} fontSize={12} fontWeight={700}>15 %</text>
      </g>
    ),
    focus: ['th1', 'sh1', 'glute'],
    duration: 1300,
    label: ['Pas gauche', 'Pas droit'],
  },
}

const segs = (j: Joints): Record<Exclude<Segment, 'glute'>, [Vec, Vec]> => ({
  trunk: [j.hip, j.sh],
  th1: [j.hipR, j.k1],
  sh1: [j.k1, j.a1],
  ft1: [j.a1, j.t1],
  th2: [j.hipL, j.k2],
  sh2: [j.k2, j.a2],
  ft2: [j.a2, j.t2],
})

/** Rendu « fil de fer » : traits fins, articulations creuses, zones ciblées en cyan. */
function Body({ j, def }: { j: Joints; def: FigureDef }) {
  const line = (a: Vec, b: Vec, color: string, w = 4, key?: string, opacity = 1) => (
    <line key={key} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={w} strokeLinecap="round" opacity={opacity} />
  )
  const s = segs(j)
  const focus = def.focus ?? []
  const back = def.front ? C.front : C.back
  return (
    <g>
      {/* membres arrière */}
      {line(j.shL, j.e2, back, 3)}
      {line(j.e2, j.h2, back, 3)}
      {line(j.hipL, j.k2, back, 3.5)}
      {line(j.k2, j.a2, back, 3.5)}
      {line(j.a2, j.t2, back, 3)}
      {/* zones musculaires ciblées : halo cyan */}
      {focus
        .filter((f): f is Exclude<Segment, 'glute'> => f !== 'glute')
        .map((f) => line(s[f][0], s[f][1], C.accent, 10, `f-${f}`, 0.28))}
      {/* tronc + tête */}
      {line(j.hip, j.sh, C.front, 4.5)}
      {def.front && line(j.hipL, j.hipR, C.front, 4)}
      {def.front && line(j.shL, j.shR, C.front, 4)}
      <circle cx={j.head[0]} cy={j.head[1]} r={8.5} fill="#0c111d" stroke={C.front} strokeWidth={3} />
      {/* membres avant */}
      {line(j.hipR, j.k1, C.front, 4)}
      {line(j.k1, j.a1, C.front, 4)}
      {line(j.a1, j.t1, C.front, 3.5)}
      {line(j.shR, j.e1, C.front, 3.5)}
      {line(j.e1, j.h1, C.front, 3.5)}
      {[j.sh, j.e1, j.k2, j.a2].map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={2.4} fill="#0c111d" stroke="#64748b" strokeWidth={1.4} />
      ))}
    </g>
  )
}

/** Points de pression animés : hanche (orange) si fessiers, genou / cheville (cyan) selon le focus. */
function PressurePoints({ j, def }: { j: Joints; def: FigureDef }) {
  const focus = def.focus ?? []
  const pts: [Vec, string][] = []
  if (focus.includes('glute')) pts.push([j.hip, C.ember])
  if (focus.some((f) => f === 'th1' || f === 'sh1')) pts.push([j.k1, C.accent])
  if (focus.some((f) => f === 'sh1' || f === 'ft1' || f === 'sh2')) pts.push([j.a1, C.accent])
  return (
    <g>
      {pts.map(([p, c], i) => (
        <g key={i}>
          <circle className="pulse-ring" cx={p[0]} cy={p[1]} r={4} fill="none" stroke={c} strokeWidth={1.5} />
          <circle cx={p[0]} cy={p[1]} r={4} fill={c} stroke="#0c111d" strokeWidth={1.5} />
        </g>
      ))}
    </g>
  )
}

export function Figure({ id, t, pressure = true }: { id: AnimationId; t: number; pressure?: boolean }) {
  const def = FIGURES[id]
  const j = solve(interpolate(def.start, def.end, t))
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="Illustration de l’exercice">
      {def.props?.(j)}
      <Body j={j} def={def} />
      {def.over?.(j)}
      {pressure && <PressurePoints j={j} def={def} />}
    </svg>
  )
}
