import { MONTHLY_TESTS, TEST_INTERVAL_DAYS, type MonthlyTest, type TestJoint } from '../data/tests'
import type { AppData, TestResult } from './storage'

export function testDates(data: AppData) {
  return Object.keys(data.tests)
    .filter((d) => Object.values(data.tests[d]).some((r) => r.L !== undefined || r.R !== undefined))
    .sort()
}

export function daysSince(date: string, today: string) {
  return Math.round((new Date(`${today}T12:00:00`).getTime() - new Date(`${date}T12:00:00`).getTime()) / 86_400_000)
}

/** Nombre de jours avant le prochain test (≤ 0 → à faire). */
export function nextTestIn(data: AppData, today: string) {
  const d = testDates(data)
  if (!d.length) return 0
  return TEST_INTERVAL_DAYS - daysSince(d[d.length - 1], today)
}

const avg = (r?: TestResult) => {
  const v = [r?.L, r?.R].filter((x): x is number => typeof x === 'number')
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined
}

/** Écart G/D en % (positif = droite meilleure). */
export function testAsym(r?: TestResult) {
  if (r?.L === undefined || r?.R === undefined || Math.max(r.L, r.R) === 0) return undefined
  return Math.round(((r.R - r.L) / Math.max(r.L, r.R)) * 100)
}

/**
 * Score /100 d'une articulation pour une date : moyenne des tests (moyenne G/D
 * rapportée au repère, plafonnée à 100) pénalisée par l'asymétrie au-delà de 10 %.
 */
export function jointScore(data: AppData, date: string, joint: TestJoint) {
  const day = data.tests[date] ?? {}
  const parts = MONTHLY_TESTS.filter((t) => t.joint === joint)
    .map((t) => {
      const a = avg(day[t.id])
      if (a === undefined) return undefined
      const base = Math.min(100, (a / t.target) * 100)
      const asym = Math.abs(testAsym(day[t.id]) ?? 0)
      return Math.max(0, base - Math.max(0, asym - 10))
    })
    .filter((x): x is number => x !== undefined)
  return parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : undefined
}

export function previousResult(data: AppData, test: MonthlyTest, before: string) {
  const d = testDates(data).filter((x) => x < before && data.tests[x][test.id])
  return d.length ? { date: d[d.length - 1], result: data.tests[d[d.length - 1]][test.id] } : undefined
}
