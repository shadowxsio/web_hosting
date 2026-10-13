import { expect, test } from './fixtures'

test.describe('Animations bonus', () => {
  test('En-tête compact en verre au défilement', async ({ app, page, shot }) => {
    await app()
    const header = page.locator('header').first()
    await expect(header).not.toHaveClass(/header-glass/)
    await page.mouse.wheel(0, 700)
    await expect(header).toHaveClass(/header-glass/)
    await shot('En-tête compact')
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(header).not.toHaveClass(/header-glass/)
  })

  test('Carte → fiche : la carte s’ouvre en fiche', async ({ app, page, shot }) => {
    await app()
    await page.getByLabel('Ouvrir Nordic Hamstring Curl').click()
    const drawer = page.getByRole('dialog', { name: 'Nordic Hamstring Curl' })
    await expect(drawer).toBeVisible()
    // Fin de l'animation : la fiche n'est plus l'élément partagé.
    await expect(drawer).not.toHaveClass(/morph/)
    await shot('Fiche ouverte depuis la carte')
  })
})
