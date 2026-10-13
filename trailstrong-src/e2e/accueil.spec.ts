import { expect, test } from './fixtures'

test.describe('Accueil', () => {
  test('Connexion par code PIN', async ({ app, page, shot }) => {
    await app({ logged: false })
    for (const d of '2026') await page.getByRole('button', { name: d, exact: true }).click()
    await expect(page.getByRole('navigation', { name: 'Onglets' }).last()).toBeVisible()
    await shot('Programme affiché après le PIN')
  })

  test('Navigation : Tout, Séance A, Séance B, Tapis, Stats', async ({ app, page, shot }) => {
    await app()
    const dock = page.getByRole('navigation', { name: 'Onglets' }).last()
    for (const tab of ['Tout', 'Séance A', 'Séance B', 'Tapis', 'Stats']) {
      await dock.getByRole('button', { name: new RegExp(tab) }).first().click()
      await page.waitForTimeout(200)
    }
    await shot('Vue Stats')
  })
})

test('Aperçu : données isolées du vrai site', async ({ app, page, context }) => {
  await app()
  await page.getByLabel('Ouvrir RDL aux haltères').click()
  await page.getByRole('dialog', { name: 'RDL aux haltères' }).getByRole('button', { name: /Valider la série 1/ }).click()
  const state = await context.storageState()
  const keys = state.origins.flatMap((o) => o.localStorage.map((x) => x.name))
  // Seules les clés préfixées « preview: » sont écrites par l'app (les autres viennent de la préparation du test).
  const written = keys.filter((k) => k.startsWith('preview:'))
  expect(written.length).toBeGreaterThan(0)
  expect(keys.filter((k) => !k.startsWith('preview:')).every((k) => ['trailstrong:view', 'trailstrong:v1'].includes(k))).toBe(true)
})
