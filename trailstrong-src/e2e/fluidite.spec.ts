import { expect, test } from './fixtures'

test.describe('Fluidité', () => {
  test('Dock en verre : la pastille liquide suit l’onglet', async ({ app, page, shot }) => {
    await app()
    const dock = page.getByRole('navigation', { name: 'Onglets' }).last()
    const pill = dock.locator('.liquid-pill')
    const before = await pill.evaluate((el) => getComputedStyle(el).transform)
    await dock.getByRole('button', { name: /Séance B/ }).click()
    await expect(dock.getByRole('button', { name: /Séance B/ })).toHaveAttribute('aria-current', 'page')
    await expect.poll(() => pill.evaluate((el) => getComputedStyle(el).transform)).not.toBe(before)
    await page.waitForTimeout(600)
    await shot('Dock sur Séance B')
  })

  test('Fiche : fermeture animée', async ({ app, page }) => {
    await app()
    await page.getByLabel('Ouvrir RDL aux haltères').click()
    const drawer = page.getByRole('dialog', { name: 'RDL aux haltères' })
    await expect(drawer).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(drawer).toHaveClass(/closing/)
    await expect(drawer).toBeHidden()
  })

  test('Fiche : glisser vers le bas pour fermer', async ({ app, page }) => {
    await app()
    await page.getByLabel('Ouvrir RDL aux haltères').click()
    const drawer = page.getByRole('dialog', { name: 'RDL aux haltères' })
    await expect(drawer).toBeVisible()
    await page.waitForTimeout(500)
    await drawer.evaluate((el) => {
      const head = el.querySelector('header')!
      const r = head.getBoundingClientRect()
      const touch = (y: number) => new Touch({ identifier: 1, target: head, clientX: r.left + 40, clientY: y })
      const fire = (type: string, y: number) =>
        head.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [touch(y)], changedTouches: [touch(y)] }))
      fire('touchstart', r.top + 10)
      for (let i = 1; i <= 10; i++) fire('touchmove', r.top + 10 + i * 22)
      fire('touchend', r.top + 230)
    })
    await expect(drawer).toBeHidden()
  })

  test('Valider : coche animée et séance complète célébrée', async ({ app, page, shot }) => {
    await app({ view: 'activation' })
    const buttons = page.getByRole('button', { name: /^Valider$/ })
    const n = await buttons.count()
    expect(n).toBeGreaterThan(0)
    for (let i = 0; i < n; i++) await page.getByRole('button', { name: /^Valider$/ }).first().click()
    await expect(page.locator('.confetti')).toBeAttached()
    await expect(page.locator('button.drop.pop svg.check-draw').first()).toBeAttached()
    await shot('Séance à 100 % : confettis')
  })
})
