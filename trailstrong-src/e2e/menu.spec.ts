import { expect, test } from './fixtures'

test.describe('Menu', () => {
  test('Thème clair et sombre', async ({ app, page, shot }) => {
    await app()
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('radio', { name: /Clair/ }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.getByRole('button', { name: 'Fermer' }).first().click()
    await shot('Thème clair')
  })

  test('Pas d’assistant IA dans les réglages', async ({ app, page }) => {
    await app()
    await page.getByRole('button', { name: 'Menu' }).click()
    await expect(page.getByText(/Gemini|Assistant IA/)).toHaveCount(0)
  })

  test('Visite guidée pas à pas', async ({ app, page, shot }) => {
    await app()
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('button', { name: /Visite guidée/ }).click()
    const tour = page.getByRole('dialog', { name: /Visite guidée/ })
    await expect(tour).toBeVisible()
    const seen: string[] = []
    for (let i = 0; i < 15; i++) {
      seen.push((await tour.getAttribute('aria-label')) ?? '')
      const next = tour.getByRole('button', { name: /Suivant|Compris/ })
      if ((await next.textContent())?.includes('Compris')) break
      if (seen.at(-1)?.includes('Ajouter un exercice')) await shot('Étape « Ajouter un exercice »')
      await next.click()
    }
    expect(seen.join(' | ')).toContain('Ajouter un exercice')
  })

  test('Profil de test : questionnaire puis programme généré', async ({ app, page, shot }) => {
    await app()
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('button', { name: /Saisir le PIN admin/ }).click()
    for (const d of '2026') await page.getByRole('button', { name: d, exact: true }).click()
    await page.getByRole('button', { name: /Ouvrir le profil de test/ }).click()
    await page.getByRole('button', { name: /Créer mon programme/ }).click()
    const next = () => page.getByRole('button', { name: /Suivant|Voir mon programme/ }).click()
    await next()
    await next()
    await page.getByRole('checkbox', { name: /Genoux/ }).click()
    for (let i = 0; i < 5; i++) await next()
    await expect(page.getByRole('button', { name: /C’est parti/ })).toBeVisible()
    await shot('Programme proposé')
    await page.getByRole('button', { name: /C’est parti/ }).click()
    await expect(page.getByRole('navigation', { name: 'Onglets' }).last()).toBeVisible()
  })
})
