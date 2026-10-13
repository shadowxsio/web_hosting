import { test as base, expect, type Page } from '@playwright/test'

interface Seed {
  /** Vue ouverte au démarrage (onglet du dock). */
  view?: string
  /** Connecté (PIN déjà saisi) — vrai par défaut. */
  logged?: boolean
  /** Visite guidée déjà vue — vrai par défaut. */
  tourDone?: boolean
}

export const test = base.extend<{ app: (seed?: Seed) => Promise<Page>; shot: (name: string) => Promise<void> }>({
  app: async ({ page }, use) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text())
    })
    await use(async ({ view = 'seanceA', logged = true, tourDone = true } = {}) => {
      await page.addInitScript(
        ({ view, logged, tourDone }) => {
          // L'aperçu de PR range ses clés sous « preview: » (voir vite.config.ts) : on écrit les deux.
          const keys = (k: string) => [k, `preview:${k}`]
          if (sessionStorage.getItem('e2e-seeded')) return
          sessionStorage.setItem('e2e-seeded', '1')
          for (const k of keys('trailstrong:view')) localStorage.setItem(k, view)
          if (logged) for (const k of keys('trailstrong:session')) sessionStorage.setItem(k, '2026')
          if (tourDone)
            for (const k of keys('trailstrong:v1'))
              localStorage.setItem(k, JSON.stringify({ version: 1, logs: {}, checkins: {}, tests: {}, sessions: {}, profile: { tourDone: true, weightKg: 70, weightUnit: 'kg' }, gist: { enabled: false, token: '', gistId: '' }, updatedAt: 1 }))
        },
        { view, logged, tourDone },
      )
      await page.goto('./')
      return page
    })
    expect(errors, 'erreurs JavaScript dans la console').toEqual([])
  },
  // Capture nommée, jointe au rapport et reprise dans le commentaire de PR.
  shot: async ({ page }, use, testInfo) => {
    await use(async (name) => {
      await page.waitForTimeout(250)
      await testInfo.attach(name, { body: await page.screenshot(), contentType: 'image/png' })
    })
  },
})

export { expect }
