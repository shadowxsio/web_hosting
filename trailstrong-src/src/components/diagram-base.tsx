/**
 * Schémas d'exécution (statiques) des exercices — un squelette 2D calculé en cinématique
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
  | 'spanishSquat'
  | 'nordic'
  | 'copenhagen'
  | 'soleusRaise'
  // Modèles génériques (exercices du catalogue / ajoutés par l'IA)
  | 'squat'
  | 'lunge'
  | 'lateralLunge'
  | 'stepUp'
  | 'legExtension'
  | 'pushUp'
  | 'plank'
  | 'sidePlank'
  | 'row'
  | 'press'
  | 'deadBug'
  | 'birdDog'
  | 'wallSit'
  | 'jump'
  | 'kneelingStretch'
  | 'calfStretch'

export type JointName = 'hip' | 'sh' | 'head' | 'k1' | 'a1' | 't1' | 'k2' | 'a2' | 't2' | 'e1' | 'h1' | 'e2' | 'h2'

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


const GROUND = 182
const C = {
  ink: 'var(--color-ink)',
  paper: 'var(--color-paper)',
  prop: 'color-mix(in srgb, var(--color-ink) 16%, transparent)',
  propLight: 'color-mix(in srgb, var(--color-ink) 32%, transparent)',
  accent: 'var(--color-sky)',
  ember: 'var(--color-flame)',
  ok: 'var(--color-mint)',
}

const Ground = ({ y = GROUND, x1 = 8, x2 = 192 }: { y?: number; x1?: number; x2?: number }) => (
  <line x1={x1} y1={y} x2={x2} y2={y} style={{ stroke: C.propLight }} strokeWidth={2} strokeDasharray="4 5" />
)

const Dumbbell = ({ at, color = C.accent }: { at: Vec; color?: string }) => (
  <g>
    <rect x={at[0] - 9} y={at[1] - 2} width={18} height={4} rx={2} style={{ fill: color, stroke: C.ink }} strokeWidth={1.2} />
    <rect x={at[0] - 11} y={at[1] - 6} width={5} height={12} rx={1.5} style={{ fill: color, stroke: C.ink }} strokeWidth={1.2} />
    <rect x={at[0] + 6} y={at[1] - 6} width={5} height={12} rx={1.5} style={{ fill: color, stroke: C.ink }} strokeWidth={1.2} />
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
  front?: boolean
  /** Flèches de mouvement : position d'un point du corps au départ → à la fin. */
  arrows?: { joint: JointName; color: 'flame' | 'sky'; bend?: number }[]
}

export type Segment = 'trunk' | 'th1' | 'sh1' | 'th2' | 'sh2' | 'ft1' | 'ft2' | 'glute'

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
        <ellipse cx={104} cy={GROUND + 1} rx={30} ry={4} style={{ fill: C.accent }} opacity={0.15} />
      </g>
    ),
    focus: ['sh1', 'ft1', 'glute'],
    arrows: [{ joint: 'h1', color: 'flame' }, { joint: 'a2', color: 'sky' }],
  },
  tibialis: {
    start: { ...stand, anchor: { joint: 'a1', at: [118, GROUND - 3] }, trunk: -97, th1: 72, sh1: 70, th2: 74, sh2: 72, ft1: 0, ft2: 0, ua1: 100, fa1: 95 },
    end: { ...stand, anchor: { joint: 'a1', at: [118, GROUND - 3] }, trunk: -97, th1: 72, sh1: 70, th2: 74, sh2: 72, ft1: -40, ft2: -40, ua1: 100, fa1: 95 },
    props: () => (
      <g>
        <Ground />
        <rect x={52} y={20} width={8} height={GROUND - 20} style={{ fill: C.prop }} rx={2} />
      </g>
    ),
    focus: ['sh1', 'ft1'],
    arrows: [{ joint: 't1', color: 'sky', bend: -0.6 }],
  },
  calfRaise: {
    start: { ...stand, anchor: { joint: 't1', at: [120, 166] }, ft1: -25, ft2: -25, ua1: 92, fa1: 90 },
    end: { ...stand, anchor: { joint: 't1', at: [120, 166] }, ft1: 50, ft2: 50, ua1: 92, fa1: 90 },
    props: () => (
      <g>
        <Ground />
        <rect x={108} y={166} width={60} height={GROUND - 166} style={{ fill: C.prop }} rx={3} />
      </g>
    ),
    over: (j) => <Dumbbell at={j.h1} />,
    focus: ['sh1', 'sh2'],
    arrows: [{ joint: 'a1', color: 'sky' }],
  },
  singleCalf: {
    start: { ...stand, anchor: { joint: 't1', at: [120, 166] }, ft1: -25, th2: 100, sh2: 160, ft2: 80, ua1: 30, fa1: -10, ua2: 95 },
    end: { ...stand, anchor: { joint: 't1', at: [120, 166] }, ft1: 50, th2: 100, sh2: 160, ft2: 80, ua1: 30, fa1: -10, ua2: 95 },
    props: () => (
      <g>
        <Ground />
        <rect x={108} y={166} width={60} height={GROUND - 166} style={{ fill: C.prop }} rx={3} />
        <rect x={150} y={36} width={8} height={130} style={{ fill: C.prop }} rx={2} />
      </g>
    ),
    focus: ['sh1'],
    arrows: [{ joint: 'a1', color: 'sky' }],
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
    arrows: [{ joint: 'hip', color: 'flame' }],
  },
  bandedWalk: {
    front: true,
    start: { anchor: { joint: 'a2', at: [86, GROUND - 3] }, trunk: -90, hipW: 22, shW: 30, ua1: 80, fa1: 100, ua2: 100, fa2: 80, th1: 72, sh1: 104, ft1: 20, th2: 108, sh2: 76, ft2: 160 },
    end: { anchor: { joint: 'a2', at: [86, GROUND - 3] }, trunk: -90, hipW: 22, shW: 30, ua1: 80, fa1: 100, ua2: 100, fa2: 80, th1: 52, sh1: 88, ft1: 20, th2: 112, sh2: 74, ft2: 160 },
    props: () => <Ground />,
    over: (j) => (
      <path
        d={`M${j.k1[0]} ${j.k1[1] - 4} L${j.k2[0]} ${j.k2[1] - 4}`}
        style={{ stroke: C.ok }}
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.9}
      />
    ),
    focus: ['glute'],
    arrows: [{ joint: 'a1', color: 'sky' }, { joint: 'k1', color: 'flame' }],
  },
  rdl: {
    start: { ...stand, anchor: { joint: 'a1', at: [100, GROUND - 3] }, th1: 88, sh1: 92, th2: 88, sh2: 92 },
    end: { ...stand, anchor: { joint: 'a1', at: [100, GROUND - 3] }, trunk: -12, th1: 72, sh1: 96, th2: 72, sh2: 96, ua1: 92, fa1: 90 },
    props: () => <Ground />,
    over: (j) => <Dumbbell at={j.h1} />,
    focus: ['th1', 'glute'],
    arrows: [{ joint: 'head', color: 'flame' }, { joint: 'hip', color: 'sky' }],
  },
  bulgarian: {
    start: { ...stand, anchor: { joint: 'a1', at: [136, GROUND - 3] }, trunk: -70, th1: 76, sh1: 98, tgt2: [66, 138], bend2: -1, ft2: 175, ua1: 92 },
    end: { ...stand, anchor: { joint: 'a1', at: [136, GROUND - 3] }, trunk: -68, th1: 14, sh1: 98, tgt2: [66, 138], bend2: -1, ft2: 175, ua1: 92 },
    props: () => (
      <g>
        <Ground />
        <rect x={26} y={142} width={50} height={9} rx={3} style={{ fill: C.propLight }} />
        <rect x={32} y={151} width={6} height={GROUND - 151} style={{ fill: C.prop }} />
        <rect x={64} y={151} width={6} height={GROUND - 151} style={{ fill: C.prop }} />
      </g>
    ),
    over: (j) => <Dumbbell at={j.h1} />,
    focus: ['glute', 'th1'],
    arrows: [{ joint: 'hip', color: 'flame' }, { joint: 'k2', color: 'sky' }],
  },
  legCurl: {
    start: { anchor: { joint: 'hip', at: [70, 118] }, trunk: -98, ua1: 70, fa1: 20, th1: -4, sh1: 22, ft1: -70, th2: -4, sh2: 22, ft2: -70 },
    end: { anchor: { joint: 'hip', at: [70, 118] }, trunk: -98, ua1: 70, fa1: 20, th1: -4, sh1: 118, ft1: 20, th2: -4, sh2: 22, ft2: -70 },
    props: (j) => (
      <g>
        <Ground />
        <rect x={40} y={122} width={68} height={10} rx={4} style={{ fill: C.propLight }} />
        <rect x={34} y={58} width={10} height={70} rx={4} style={{ fill: C.propLight }} />
        <rect x={68} y={132} width={8} height={GROUND - 132} style={{ fill: C.prop }} />
        <line x1={110} y1={128} x2={j.a1[0]} y2={j.a1[1]} style={{ stroke: C.prop }} strokeWidth={4} />
        <circle cx={110} cy={128} r={5} style={{ fill: C.prop }} />
      </g>
    ),
    over: (j) => <circle cx={j.a1[0] + 2} cy={j.a1[1] - 7} r={7} style={{ fill: C.accent }} opacity={0.85} />,
    focus: ['th1'],
    arrows: [{ joint: 'a1', color: 'sky' }],
  },
  abduction: {
    front: true,
    start: { anchor: { joint: 'a2', at: [92, GROUND - 3] }, trunk: -90, hipW: 22, shW: 30, ua1: 95, fa1: 90, ua2: 150, fa2: 120, th1: 90, sh1: 90, ft1: 20, th2: 92, sh2: 90, ft2: 160 },
    end: { anchor: { joint: 'a2', at: [92, GROUND - 3] }, trunk: -93, hipW: 22, shW: 30, ua1: 95, fa1: 90, ua2: 150, fa2: 120, th1: 52, sh1: 52, ft1: 10, th2: 92, sh2: 90, ft2: 160 },
    props: (j) => (
      <g>
        <Ground />
        <rect x={22} y={40} width={10} height={GROUND - 40} style={{ fill: C.prop }} rx={2} />
        <circle cx={34} cy={GROUND - 8} r={5} style={{ fill: C.propLight }} />
        <line x1={34} y1={GROUND - 8} x2={j.a1[0]} y2={j.a1[1]} style={{ stroke: C.accent }} strokeWidth={2} opacity={0.7} />
      </g>
    ),
    focus: ['glute'],
    arrows: [{ joint: 'a1', color: 'flame' }],
  },
  singleLegRdl: {
    start: { ...stand, anchor: { joint: 'a1', at: [104, GROUND - 3] }, th1: 90, sh1: 90, th2: 98, sh2: 100, ft2: 40, ua1: 92 },
    end: { ...stand, anchor: { joint: 'a1', at: [104, GROUND - 3] }, trunk: -6, th1: 80, sh1: 96, th2: 172, sh2: 174, ft2: 90, ua1: 92 },
    props: () => <Ground />,
    over: (j) => <Dumbbell at={j.h1} />,
    focus: ['th1', 'glute', 'ft1'],
    arrows: [{ joint: 'head', color: 'flame' }, { joint: 'a2', color: 'sky' }],
  },
  hipThrust: {
    start: { anchor: { joint: 'sh', at: [56, 132] }, trunk: -147, ua1: 30, fa1: -20, tgt1: [140, GROUND - 3], bend1: -1, ft1: 0, th2: -55, sh2: 40, ft2: 0 },
    end: { anchor: { joint: 'sh', at: [56, 132] }, trunk: 176, ua1: 40, fa1: -10, tgt1: [140, GROUND - 3], bend1: -1, ft1: 0, th2: -55, sh2: 40, ft2: 0 },
    props: () => (
      <g>
        <Ground />
        <rect x={12} y={136} width={50} height={10} rx={3} style={{ fill: C.propLight }} />
        <rect x={18} y={146} width={6} height={GROUND - 146} style={{ fill: C.prop }} />
        <rect x={50} y={146} width={6} height={GROUND - 146} style={{ fill: C.prop }} />
      </g>
    ),
    over: (j) => <Dumbbell at={[j.hip[0], j.hip[1] - 9]} />,
    focus: ['glute'],
    arrows: [{ joint: 'hip', color: 'flame' }],
  },
  legPress: {
    start: { anchor: { joint: 'hip', at: [86, 150] }, trunk: -150, ua1: 60, fa1: 10, tgt1: [124, 112], bend1: -1, ft1: -80, th2: -12, sh2: 100, ft2: 0 },
    end: { anchor: { joint: 'hip', at: [86, 150] }, trunk: -150, ua1: 60, fa1: 10, tgt1: [148, 88], bend1: -1, ft1: -80, th2: -12, sh2: 100, ft2: 0 },
    props: (j) => {
      const p: Vec = add(j.t1, dir(45, 3))
      const a = dir(-45, 34)
      return (
        <g>
          <Ground />
          <line x1={118} y1={142} x2={194} y2={66} style={{ stroke: C.prop }} strokeWidth={5} strokeLinecap="round" />
          <line x1={118} y1={142} x2={118} y2={GROUND} style={{ stroke: C.prop }} strokeWidth={5} />
          <line x1={34} y1={130} x2={92} y2={162} style={{ stroke: C.propLight }} strokeWidth={8} strokeLinecap="round" />
          <line x1={60} y1={150} x2={60} y2={GROUND} style={{ stroke: C.prop }} strokeWidth={5} />
          <line x1={p[0] - a[0]} y1={p[1] - a[1]} x2={p[0] + a[0] * 0.3} y2={p[1] + a[1] * 0.3} style={{ stroke: C.accent }} strokeWidth={6} strokeLinecap="round" />
        </g>
      )
    },
    focus: ['glute', 'th1'],
    arrows: [{ joint: 'a1', color: 'sky' }],
  },
  stepDown: {
    start: { ...stand, anchor: { joint: 'a1', at: [78, 153] }, trunk: -88, th2: 70, sh2: 85, ft2: 10, ua1: 10, fa1: 0 },
    end: { ...stand, anchor: { joint: 'a1', at: [78, 153] }, trunk: -72, th1: 25, sh1: 115, th2: 55, sh2: 60, ft2: 30, ua1: 0, fa1: -5 },
    props: () => (
      <g>
        <Ground />
        <rect x={28} y={156} width={66} height={GROUND - 156} style={{ fill: C.prop }} rx={3} />
      </g>
    ),
    focus: ['th1', 'glute'],
    arrows: [{ joint: 'hip', color: 'flame' }, { joint: 'a2', color: 'sky' }],
  },
  powerHike: {
    start: { anchor: { joint: 'hip', at: [96, 98] }, trunk: -76, ua1: 50, fa1: -20, ua2: 120, fa2: 110, th1: 62, sh1: 96, ft1: -8, th2: 112, sh2: 122, ft2: 30 },
    end: { anchor: { joint: 'hip', at: [96, 98] }, trunk: -76, ua1: 120, fa1: 110, ua2: 50, fa2: -20, th1: 112, sh1: 122, ft1: 30, th2: 62, sh2: 96, ft2: -8 },
    props: () => (
      <g>
        <line x1={14} y1={190} x2={186} y2={164} style={{ stroke: C.prop }} strokeWidth={8} strokeLinecap="round" />
        <line x1={14} y1={190} x2={186} y2={164} style={{ stroke: C.accent }} strokeWidth={1.5} strokeDasharray="6 8" opacity={0.6}>
          <animate attributeName="stroke-dashoffset" from="0" to="28" dur="0.8s" repeatCount="indefinite" />
        </line>
        <line x1={170} y1={166} x2={176} y2={70} style={{ stroke: C.prop }} strokeWidth={5} strokeLinecap="round" />
        <line x1={176} y1={70} x2={150} y2={74} style={{ stroke: C.prop }} strokeWidth={5} strokeLinecap="round" />
        <text x={18} y={176} style={{ fill: C.accent }} fontSize={12} fontWeight={700}>15 %</text>
      </g>
    ),
    focus: ['th1', 'sh1', 'glute'],
    arrows: [{ joint: 'a1', color: 'sky' }, { joint: 'a2', color: 'flame' }],
  },
  spanishSquat: {
    start: { ...stand, anchor: { joint: 'a1', at: [96, GROUND - 3] }, th1: 88, sh1: 90, th2: 88, sh2: 90, ua1: 10, fa1: 0 },
    end: { ...stand, anchor: { joint: 'a1', at: [96, GROUND - 3] }, trunk: -82, th1: 14, sh1: 90, th2: 16, sh2: 90, ua1: -2, fa1: -4 },
    props: (j) => (
      <g>
        <Ground />
        <rect x={172} y={30} width={9} height={GROUND - 30} style={{ fill: C.prop }} rx={2} />
        <path
          d={`M174 ${j.k1[1] - 4} L${j.k1[0] - 5} ${j.k1[1] - 3} L${j.k1[0] - 5} ${j.k1[1] + 5} L174 ${j.k1[1] + 6}`}
          fill="none"
          style={{ stroke: C.ok }}
          strokeWidth={3}
          strokeLinejoin="round"
          opacity={0.85}
        />
      </g>
    ),
    focus: ['th1'],
    arrows: [{ joint: 'hip', color: 'flame' }],
  },
  nordic: {
    start: { anchor: { joint: 'a1', at: [44, GROUND - 6] }, trunk: -90, ua1: 20, fa1: -150, th1: 90, sh1: 180, ft1: 150, th2: 90, sh2: 180, ft2: 150 },
    end: { anchor: { joint: 'a1', at: [44, GROUND - 6] }, trunk: -22, ua1: 60, fa1: 75, th1: 158, sh1: 180, ft1: 150, th2: 158, sh2: 180, ft2: 150 },
    props: (j) => (
      <g>
        <Ground />
        <rect x={20} y={GROUND - 3} width={150} height={4} rx={2} style={{ fill: C.propLight }} />
        <circle cx={j.a1[0] - 2} cy={j.a1[1] - 10} r={7} style={{ fill: C.accent }} opacity={0.85} />
        <line x1={j.a1[0] - 2} y1={j.a1[1] - 10} x2={j.a1[0] - 2} y2={GROUND} style={{ stroke: C.prop }} strokeWidth={4} />
      </g>
    ),
    focus: ['th1'],
    arrows: [{ joint: 'head', color: 'flame' }],
  },
  copenhagen: {
    start: { anchor: { joint: 'sh', at: [45, 150] }, trunk: -150, ua1: 90, fa1: 0, ua2: 90, fa2: 0, tgt1: [170, 133], bend1: -1, ft1: -10, th2: 8, sh2: 2, ft2: -40 },
    end: { anchor: { joint: 'sh', at: [45, 150] }, trunk: 172, ua1: 90, fa1: 0, ua2: 90, fa2: 0, tgt1: [170, 133], bend1: -1, ft1: -10, th2: -6, sh2: -6, ft2: -40 },
    props: () => (
      <g>
        <Ground />
        <rect x={154} y={136} width={42} height={9} rx={3} style={{ fill: C.propLight }} />
        <rect x={160} y={145} width={6} height={GROUND - 145} style={{ fill: C.prop }} />
        <rect x={184} y={145} width={6} height={GROUND - 145} style={{ fill: C.prop }} />
      </g>
    ),
    focus: ['th1', 'glute'],
    arrows: [{ joint: 'hip', color: 'flame' }, { joint: 'a2', color: 'sky' }],
  },
  soleusRaise: {
    start: { anchor: { joint: 'hip', at: [78, 133] }, trunk: -92, ua1: 60, fa1: 10, tgt1: [119, 173], bend1: -1, ft1: -25, tgt2: [115, 173], bend2: -1, ft2: -25 },
    end: { anchor: { joint: 'hip', at: [78, 133] }, trunk: -92, ua1: 55, fa1: 5, tgt1: [121, 161], bend1: -1, ft1: 40, tgt2: [117, 161], bend2: -1, ft2: 40 },
    props: () => (
      <g>
        <Ground />
        <rect x={34} y={138} width={60} height={9} rx={3} style={{ fill: C.propLight }} />
        <rect x={40} y={147} width={6} height={GROUND - 147} style={{ fill: C.prop }} />
        <rect x={82} y={147} width={6} height={GROUND - 147} style={{ fill: C.prop }} />
        <rect x={118} y={170} width={30} height={GROUND - 170} rx={2} style={{ fill: C.prop }} />
      </g>
    ),
    over: (j) => <Dumbbell at={[(j.hip[0] + j.k1[0]) / 2 + 6, (j.hip[1] + j.k1[1]) / 2 - 6]} />,
    focus: ['sh1', 'ft1'],
    arrows: [{ joint: 'k1', color: 'sky' }],
  },

  // ── Modèles génériques ────────────────────────────────────────────────
  squat: {
    start: { ...stand, anchor: { joint: 'a1', at: [100, GROUND - 3] }, ua1: 70, fa1: -70 },
    end: { ...stand, anchor: { joint: 'a1', at: [100, GROUND - 3] }, trunk: -58, th1: 14, sh1: 112, th2: 18, sh2: 110, ua1: 40, fa1: -80 },
    props: () => <Ground />,
    over: (j) => <Dumbbell at={[j.h1[0], j.h1[1] + 2]} />,
    focus: ['th1', 'glute'],
    arrows: [{ joint: 'hip', color: 'flame' }, { joint: 'k1', color: 'sky' }],
  },
  lunge: {
    start: { ...stand, anchor: { joint: 'a1', at: [124, GROUND - 3] } },
    end: { ...stand, anchor: { joint: 'a1', at: [124, GROUND - 3] }, trunk: -88, th1: 6, sh1: 96, th2: 102, sh2: 176, ft2: 100 },
    props: () => <Ground />,
    over: (j) => <Dumbbell at={j.h1} />,
    focus: ['th1', 'glute'],
    arrows: [{ joint: 'hip', color: 'flame' }, { joint: 'k2', color: 'sky' }],
  },
  lateralLunge: {
    front: true,
    start: { anchor: { joint: 'a2', at: [58, GROUND - 3] }, trunk: -90, hipW: 22, shW: 30, ua1: 70, fa1: 120, ua2: 110, fa2: 60, th1: 62, sh1: 62, ft1: 20, th2: 118, sh2: 118, ft2: 160 },
    end: { anchor: { joint: 'a2', at: [58, GROUND - 3] }, trunk: -78, hipW: 22, shW: 30, ua1: 70, fa1: 120, ua2: 110, fa2: 60, th1: 20, sh1: 98, ft1: 20, th2: 150, sh2: 150, ft2: 160 },
    props: () => <Ground />,
    focus: ['th1', 'glute', 'th2'],
    arrows: [{ joint: 'hip', color: 'flame' }],
  },
  stepUp: {
    start: { ...stand, anchor: { joint: 'a1', at: [124, 160] }, trunk: -78, th1: 14, sh1: 108, th2: 96, sh2: 92, ua1: 92 },
    end: { ...stand, anchor: { joint: 'a1', at: [124, 160] }, th1: 90, sh1: 90, th2: 10, sh2: 92, ft2: 0, ua1: 92 },
    props: () => (
      <g>
        <Ground />
        <rect x={104} y={163} width={70} height={GROUND - 163} style={{ fill: C.prop }} rx={3} />
      </g>
    ),
    over: (j) => <Dumbbell at={j.h1} />,
    focus: ['th1', 'glute'],
    arrows: [{ joint: 'hip', color: 'flame' }, { joint: 'k2', color: 'sky' }],
  },
  legExtension: {
    start: { anchor: { joint: 'hip', at: [70, 118] }, trunk: -98, ua1: 70, fa1: 20, th1: -4, sh1: 100, ft1: 10, th2: -4, sh2: 100, ft2: 10 },
    end: { anchor: { joint: 'hip', at: [70, 118] }, trunk: -98, ua1: 70, fa1: 20, th1: -4, sh1: 4, ft1: -80, th2: -4, sh2: 100, ft2: 10 },
    props: () => (
      <g>
        <Ground />
        <rect x={40} y={122} width={68} height={10} rx={4} style={{ fill: C.propLight }} />
        <rect x={34} y={58} width={10} height={70} rx={4} style={{ fill: C.propLight }} />
        <rect x={68} y={132} width={8} height={GROUND - 132} style={{ fill: C.prop }} />
      </g>
    ),
    over: (j) => <circle cx={j.a1[0] - 2} cy={j.a1[1] + 7} r={7} style={{ fill: C.accent }} opacity={0.85} />,
    focus: ['th1'],
    arrows: [{ joint: 'a1', color: 'sky' }],
  },
  pushUp: {
    start: { anchor: { joint: 'h1', at: [146, GROUND - 2] }, trunk: -14, ua1: 92, fa1: 90, th1: 168, sh1: 168, ft1: 100, th2: 168, sh2: 168, ft2: 100 },
    end: { anchor: { joint: 'h1', at: [146, GROUND - 2] }, trunk: -3, ua1: 150, fa1: 50, th1: 177, sh1: 177, ft1: 100, th2: 177, sh2: 177, ft2: 100 },
    props: () => <Ground />,
    focus: [],
    arrows: [{ joint: 'sh', color: 'flame' }],
  },
  plank: {
    start: { anchor: { joint: 'e1', at: [140, GROUND - 4] }, trunk: 10, ua1: 82, fa1: 0, th1: 152, sh1: 175, ft1: 100, th2: 152, sh2: 175, ft2: 100 },
    end: { anchor: { joint: 'e1', at: [140, GROUND - 4] }, trunk: -14, ua1: 92, fa1: 0, th1: 168, sh1: 168, ft1: 100, th2: 168, sh2: 168, ft2: 100 },
    props: () => <Ground />,
    focus: ['glute'],
    arrows: [{ joint: 'hip', color: 'flame' }],
  },
  sidePlank: {
    start: { anchor: { joint: 'sh', at: [45, 150] }, trunk: 178, ua1: 90, fa1: 0, ua2: 90, fa2: 0, tgt1: [168, GROUND - 3], bend1: -1, ft1: -10, tgt2: [168, GROUND - 8], bend2: -1, ft2: -10 },
    end: { anchor: { joint: 'sh', at: [45, 150] }, trunk: 162, ua1: 90, fa1: 0, ua2: -90, fa2: -90, tgt1: [168, GROUND - 3], bend1: -1, ft1: -10, tgt2: [168, GROUND - 8], bend2: -1, ft2: -10 },
    props: () => <Ground />,
    focus: ['glute'],
    arrows: [{ joint: 'hip', color: 'flame' }],
  },
  row: {
    start: { ...stand, anchor: { joint: 'a1', at: [96, GROUND - 3] }, trunk: -20, th1: 74, sh1: 98, th2: 74, sh2: 98, ua1: 92, fa1: 90 },
    end: { ...stand, anchor: { joint: 'a1', at: [96, GROUND - 3] }, trunk: -20, th1: 74, sh1: 98, th2: 74, sh2: 98, ua1: 205, fa1: 100 },
    props: () => <Ground />,
    over: (j) => <Dumbbell at={j.h1} />,
    focus: [],
    arrows: [{ joint: 'h1', color: 'flame' }],
  },
  press: {
    start: { anchor: { joint: 'hip', at: [92, 140] }, trunk: -90, ua1: 120, fa1: -80, ua2: 60, fa2: -100, th1: 0, sh1: 90, ft1: 0, th2: 4, sh2: 92, ft2: 0 },
    end: { anchor: { joint: 'hip', at: [92, 140] }, trunk: -90, ua1: -92, fa1: -90, ua2: -88, fa2: -90, th1: 0, sh1: 90, ft1: 0, th2: 4, sh2: 92, ft2: 0 },
    props: () => (
      <g>
        <Ground />
        <rect x={62} y={144} width={50} height={9} rx={3} style={{ fill: C.propLight }} />
        <rect x={68} y={153} width={6} height={GROUND - 153} style={{ fill: C.prop }} />
        <rect x={100} y={153} width={6} height={GROUND - 153} style={{ fill: C.prop }} />
      </g>
    ),
    over: (j) => <Dumbbell at={j.h1} />,
    focus: [],
    arrows: [{ joint: 'h1', color: 'flame' }],
  },
  deadBug: {
    start: { anchor: { joint: 'sh', at: [58, GROUND - 10] }, trunk: 180, ua1: -90, fa1: -90, ua2: -90, fa2: -90, th1: -90, sh1: 0, ft1: -90, th2: -90, sh2: 0, ft2: -90 },
    end: { anchor: { joint: 'sh', at: [58, GROUND - 10] }, trunk: 180, ua1: -90, fa1: -90, ua2: 182, fa2: 182, th1: -6, sh1: -4, ft1: -90, th2: -90, sh2: 0, ft2: -90 },
    props: () => <Ground />,
    focus: ['glute'],
    arrows: [{ joint: 'a1', color: 'sky' }, { joint: 'h2', color: 'flame' }],
  },
  birdDog: {
    start: { anchor: { joint: 'k2', at: [86, GROUND - 6] }, trunk: -2, ua1: 90, fa1: 90, ua2: 90, fa2: 90, th1: 90, sh1: 180, ft1: 180, th2: 90, sh2: 180, ft2: 180 },
    end: { anchor: { joint: 'k2', at: [86, GROUND - 6] }, trunk: -2, ua1: 90, fa1: 90, ua2: -14, fa2: -14, th1: 180, sh1: 180, ft1: 90, th2: 90, sh2: 180, ft2: 180 },
    props: () => <Ground />,
    focus: ['glute', 'th1'],
    arrows: [{ joint: 'a1', color: 'sky' }, { joint: 'h2', color: 'flame' }],
  },
  wallSit: {
    start: { ...stand, anchor: { joint: 'a1', at: [104, GROUND - 3] }, trunk: -90, th1: 60, sh1: 115, th2: 62, sh2: 113, ua1: 92 },
    end: { ...stand, anchor: { joint: 'a1', at: [104, GROUND - 3] }, trunk: -90, th1: 0, sh1: 90, th2: 2, sh2: 90, ua1: 20, fa1: 10 },
    props: () => (
      <g>
        <Ground />
        <rect x={40} y={20} width={9} height={GROUND - 20} style={{ fill: C.prop }} rx={2} />
      </g>
    ),
    focus: ['th1'],
    arrows: [{ joint: 'hip', color: 'flame' }],
  },
  jump: {
    start: { ...stand, anchor: { joint: 'a1', at: [100, GROUND - 3] }, trunk: -55, th1: 18, sh1: 112, th2: 22, sh2: 110, ua1: 120, fa1: 110 },
    end: { ...stand, anchor: { joint: 'a1', at: [100, GROUND - 20] }, trunk: -88, th1: 92, sh1: 92, th2: 96, sh2: 88, ft1: 60, ft2: 60, ua1: -25, fa1: -15 },
    props: () => <Ground />,
    focus: ['th1', 'sh1', 'glute'],
    arrows: [{ joint: 'hip', color: 'flame' }],
  },
  kneelingStretch: {
    start: { ...stand, anchor: { joint: 'a1', at: [128, GROUND - 3] }, trunk: -90, th1: 20, sh1: 90, th2: 112, sh2: 180, ft2: 180, ua1: 60, fa1: 30 },
    end: { ...stand, anchor: { joint: 'a1', at: [128, GROUND - 3] }, trunk: -92, th1: 0, sh1: 70, th2: 130, sh2: 180, ft2: 180, ua1: -92, fa1: -95 },
    props: () => <Ground />,
    focus: ['th2'],
    arrows: [{ joint: 'hip', color: 'flame' }],
  },
  calfStretch: {
    start: { ...stand, anchor: { joint: 'a2', at: [70, GROUND - 3] }, trunk: -80, th1: 60, sh1: 100, th2: 115, sh2: 115, ua1: -10, fa1: -10 },
    end: { ...stand, anchor: { joint: 'a2', at: [70, GROUND - 3] }, trunk: -64, th1: 40, sh1: 90, th2: 125, sh2: 125, ua1: -18, fa1: -18 },
    props: () => (
      <g>
        <Ground />
        <rect x={170} y={20} width={9} height={GROUND - 20} style={{ fill: C.prop }} rx={2} />
      </g>
    ),
    focus: ['sh2'],
    arrows: [{ joint: 'hip', color: 'flame' }],
  },
}
