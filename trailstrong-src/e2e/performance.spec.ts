import { expect, test } from './fixtures'

test.describe('Performance', () => {
  test('Polices embarquées : aucun appel à Google Fonts', async ({ app, page }) => {
    const external: string[] = []
    page.on('request', (r) => {
      if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) external.push(r.url())
    })
    await app()
    await page.evaluate(() => document.fonts.ready)
    const loaded = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')))
    expect(loaded).toEqual(expect.arrayContaining(['Karla', 'Shrikhand']))
    expect(external).toEqual([])
  })

  test('Chrono de repos : barre animée par le navigateur', async ({ app, page, shot }) => {
    await app()
    await page.getByLabel('Ouvrir RDL aux haltères').click()
    await page.getByRole('dialog', { name: 'RDL aux haltères' }).getByRole('button', { name: /Valider la série 1/ }).click()
    await page.keyboard.press('Escape')
    const fill = page.locator('[data-tour="timer"] span.origin-left')
    await expect(fill).toHaveCSS('animation-name', 'timer-drain')
    await shot('Chrono en cours')
  })

  test('Ajouter un exercice : liste complète affichée progressivement', async ({ app, page }) => {
    await app()
    await page.getByRole('button', { name: /Ajouter un exercice à cette séance/ }).last().click()
    const sheet = page.getByRole('dialog', { name: 'Ajouter un exercice' })
    await expect(sheet.getByRole('button', { name: /^Voir / })).toHaveCount(55)
  })

  test('Fiche exercice : contenu complet après l’ouverture', async ({ app, page }) => {
    await app()
    await page.getByLabel('Ouvrir RDL aux haltères').click()
    const drawer = page.getByRole('dialog', { name: 'RDL aux haltères' })
    await expect(drawer.getByText('Suivi du jour')).toBeVisible()
    await expect(drawer.getByText('Photo réelle')).toBeVisible()
    await expect(drawer.getByText('Points d’attention')).toBeAttached()
  })
})
