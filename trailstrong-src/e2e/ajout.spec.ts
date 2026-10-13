import { expect, test } from './fixtures'

test.describe('Ajout d’exercices', () => {
  test('Bibliothèque : ajouter un exercice puis le retirer', async ({ app, page, shot }) => {
    await app()
    await page.getByRole('button', { name: /Ajouter un exercice à cette séance/ }).last().click()
    const sheet = page.getByRole('dialog', { name: 'Ajouter un exercice' })
    await expect(sheet.getByText(/Fiches complètes/)).toBeVisible()
    await shot('Onglet Bibliothèque')
    await sheet.getByRole('button', { name: 'Voir Pont fessier', exact: true }).click()
    await sheet.getByRole('button', { name: /^Ajouter$/ }).click()
    await expect(page.locator('#check-glute-bridge')).toBeAttached()
    await page.getByLabel('Ouvrir Pont fessier', { exact: true }).click()
    await page.getByRole('button', { name: /Retirer/ }).click()
    await page.getByRole('button', { name: 'Oui', exact: true }).click()
    await expect(page.locator('#check-glute-bridge')).toHaveCount(0)
  })

  test('Catalogue : fiche simplifiée traduite en français', async ({ app, page, shot }) => {
    await app()
    await page.getByRole('button', { name: /Ajouter un exercice à cette séance/ }).last().click()
    const sheet = page.getByRole('dialog', { name: 'Ajouter un exercice' })
    await sheet.getByRole('tab', { name: /Catalogue/ }).click()
    await sheet.locator('#catalog-search').fill('leg curl')
    await sheet.getByRole('button', { name: /Leg curl allongé/ }).first().click()
    await expect(sheet.getByText(/Fiche simplifiée/)).toBeVisible()
    await shot('Brouillon du catalogue')
    await sheet.getByRole('button', { name: /^Ajouter$/ }).click()
    const tile = page.getByLabel(/Ouvrir Leg curl allongé/)
    await expect(tile).toBeVisible()
    await expect(page.getByText('Fiche simplifiée').first()).toBeVisible()
  })

  test('Catalogue : renvoie vers la fiche complète quand elle existe', async ({ app, page, shot }) => {
    await app()
    await page.getByRole('button', { name: /Ajouter un exercice à cette séance/ }).last().click()
    const sheet = page.getByRole('dialog', { name: 'Ajouter un exercice' })
    await sheet.getByRole('tab', { name: /Catalogue/ }).click()
    await sheet.locator('#catalog-search').fill('corde')
    await sheet.locator('ul button').first().click()
    await expect(sheet.getByText(/existe en fiche complète/)).toBeVisible()
    await shot('Fiche complète proposée')
  })
})
