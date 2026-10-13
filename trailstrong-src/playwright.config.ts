import { defineConfig, devices } from '@playwright/test'

/**
 * Tests de bout en bout : tournent sur le build d'aperçu (npm run build:preview),
 * servi par vite preview, sur un iPhone 13 émulé (Chromium).
 * Rapport HTML dans playwright-report/, résultats JSON pour le commentaire de PR.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 3,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: 'http://localhost:4173/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Bac à sable local : Chromium préinstallé (inutile en CI, Playwright l'installe).
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  projects: [{ name: 'iphone', use: { ...devices['iPhone 13'], browserName: 'chromium' } }],
  webServer: {
    command: 'npx vite preview --outDir dist-preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
  },
})
