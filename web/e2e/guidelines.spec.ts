import { expect, test, type Page } from '@playwright/test'
import { simularApi } from './simulada'

test.use({ serviceWorkers: 'block' })

const medir = (page: Page) =>
  page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'smooth'
    const sonda = (classe: string) => {
      const el = document.createElement('div')
      el.className = classe
      if (!classe) el.style.animation = 'spin 3s linear infinite'
      el.style.transition = 'opacity 3s'
      document.body.append(el)
      const e = getComputedStyle(el)
      const lido = { animacao: e.animationDuration, transicao: e.transitionDuration }
      el.remove()
      return lido
    }
    return { comum: sonda(''), giro: sonda('animate-spin'), rolagem: getComputedStyle(document.documentElement).scrollBehavior }
  })

const segundos = (v: string) => (v.endsWith('ms') ? parseFloat(v) / 1000 : parseFloat(v))

test('C1 movimento reduzido zera animação, transição e rolagem, menos no spinner', async ({ page }) => {
  await simularApi(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/univag')
  await page.getByLabel('CPF').waitFor()

  const reduzido = await medir(page)
  expect(segundos(reduzido.comum.animacao)).toBeCloseTo(0.00001, 6)
  expect(segundos(reduzido.comum.transicao)).toBeCloseTo(0.00001, 6)
  expect(reduzido.rolagem).toBe('auto')
  expect(segundos(reduzido.giro.animacao)).toBeCloseTo(1, 3)
  expect(segundos(reduzido.giro.transicao)).toBeCloseTo(3, 3)

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const normal = await medir(page)
  expect(segundos(normal.comum.animacao)).toBeCloseTo(3, 3)
  expect(segundos(normal.comum.transicao)).toBeCloseTo(3, 3)
  expect(normal.rolagem).toBe('smooth')
})
