import { expect, test } from './fixtures'

test.describe('Séance', () => {
  test('Fiche exercice : schéma, photos et consignes', async ({ app, page, shot }) => {
    await app()
    await page.getByLabel('Ouvrir RDL aux haltères').click()
    const drawer = page.getByRole('dialog', { name: 'RDL aux haltères' })
    await expect(drawer.getByRole('img', { name: /Schéma d’exécution/ })).toBeVisible()
    await shot('Haut de la fiche')
    await expect(drawer.getByText('Photo réelle')).toBeVisible()
    await expect(drawer.getByRole('img', { name: /position 1/ })).toBeAttached()
  })

  test('Valider une série lance le chrono de repos', async ({ app, page, shot }) => {
    await app()
    await page.getByLabel('Ouvrir RDL aux haltères').click()
    const drawer = page.getByRole('dialog', { name: 'RDL aux haltères' })
    await drawer.getByRole('button', { name: /Valider la série 1/ }).click()
    await expect(page.getByRole('button', { name: 'Pause' }).first()).toBeVisible()
    await shot('Chrono de repos lancé')
  })

  test('Coach sonore : décompte puis tempo', async ({ app, page, shot }) => {
    await app()
    await page.getByLabel('Ouvrir RDL aux haltères').click()
    await page.getByRole('dialog', { name: 'RDL aux haltères' }).getByRole('button', { name: 'Lancer le coach sonore de la série' }).click()
    const coach = page.getByRole('dialog', { name: /Coach : RDL/ })
    await expect(coach).toBeVisible()
    await page.waitForTimeout(4500)
    await shot('Coach en cours de série')
    await coach.getByRole('button', { name: 'Quitter le coach sans valider' }).click()
    await expect(coach).toBeHidden()
  })

  test('Terminer la séance : bilan et conseils de récup', async ({ app, page, shot }) => {
    await app()
    await page.getByRole('button', { name: /Terminer la séance/ }).click()
    const recap = page.getByRole('dialog', { name: 'Bilan de séance' })
    await expect(recap).toBeVisible()
    await recap.getByRole('radio', { name: '7' }).click()
    await shot('Bilan de séance')
  })

  test('Retour au calme guidé avec schémas et photos', async ({ app, page, shot }) => {
    await app()
    await page.getByRole('button', { name: /Lancer le retour au calme guidé/ }).click()
    await expect(page.getByRole('heading', { name: 'Retour au calme' })).toBeVisible()
    await shot('Liste des étirements')
    await page.getByRole('button', { name: 'Lancer le retour au calme', exact: true }).click()
    await expect(page.getByText(/Mets-toi en place|Tiens, respire/)).toBeVisible()
    await shot('Étirement guidé')
  })
})
