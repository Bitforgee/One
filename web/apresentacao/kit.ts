import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { Browser, Locator, Page } from '@playwright/test'
import { narracao } from './tts'


export const Tamanho = { width: 1280, height: 720 }
export const Saida = path.join(import.meta.dirname, 'saida')
export const Contexto = {
  baseURL: process.env.APRESENTACAO_URL ?? 'http://localhost:5179',
  viewport: Tamanho,
  serviceWorkers: 'block' as const,
  locale: 'pt-BR',
  timezoneId: 'America/Cuiaba',
}
const Pausa = 1.2 // segundos de respiro depois de cada fala

export type Passo = { id: string; texto: string; acao?: (page: Page) => Promise<void> }
export type Cartao = { titulo: string; subtitulo?: string; nota?: string }
export type Segmento = { id: string; cartao?: Cartao; selo?: string; preparar?: (page: Page) => Promise<void>; passos: Passo[] }
export type Roteiro = { video: string; legendas: string; segmentos: Segmento[] }

const Pulso = {
  css: '@keyframes apr-pulso { to { opacity: .02; } } .apr-pulso { position: fixed; right: 0; bottom: 0; width: 2px; height: 2px; background: #000; opacity: .01; animation: apr-pulso .1s steps(2) infinite alternate; }',
  html: '<i class="apr-pulso"></i>',
}

function camada(pulso: typeof Pulso) {
  const ss = sessionStorage
  const montar = () => {
    if (document.getElementById('apr-camada')) return
    const raiz = document.createElement('div')
    raiz.id = 'apr-camada'
    raiz.innerHTML = `<style>
      #apr-camada, #apr-camada * { pointer-events: none !important; }
      #apr-legenda { position: fixed; top: 8px; width: fit-content; margin: 0 auto; z-index: 2147483646; box-sizing: border-box;
        padding: 10px 22px; border-radius: 10px; background: rgba(17, 24, 39, .82); color: #fff; font: 500 20px/1.4 'Inter Variable', Inter, system-ui, sans-serif;
        text-align: center; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      #apr-legenda:empty, #apr-selo:empty { display: none; }
      #apr-selo { position: fixed; left: 14px; bottom: 64px; z-index: 2147483646; padding: 5px 12px; border-radius: 999px; background: #224fa7;
        color: #fff; font: 600 13px/1.4 'Inter Variable', Inter, system-ui, sans-serif; letter-spacing: .02em; box-shadow: 0 1px 4px rgba(0,0,0,.25); }
      #apr-cursor { position: fixed; left: 0; top: 0; z-index: 2147483647; width: 24px; height: 24px; display: none; filter: drop-shadow(0 1px 2px rgba(0,0,0,.45)); }
      .apr-onda { position: fixed; z-index: 2147483646; width: 36px; height: 36px; margin: -18px 0 0 -18px; border-radius: 50%;
        border: 3px solid #224fa7; animation: apr-onda .5s ease-out forwards; }
      @keyframes apr-onda { from { transform: scale(.3); opacity: 1; } to { transform: scale(1.4); opacity: 0; } }
      [data-slot="alert"]:not(:has(> svg)):not(:has(> [data-slot])) { grid-template-columns: 1fr; }
      ${pulso.css}
    </style>${pulso.html}<div id="apr-legenda"></div><div id="apr-selo"></div>
    <svg id="apr-cursor" viewBox="0 0 24 24"><path d="M3 2l7 19 2.6-7.4L20 11z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`
    document.documentElement.appendChild(raiz)
    aplicar()
  }
  const el = (id: string) => document.getElementById(id)
  const mover = (x: number, y: number) => {
    const c = el('apr-cursor')
    if (!c) return
    c.style.display = 'block'
    c.style.transform = `translate(${x - 3}px, ${y - 2}px)` // a ponta da seta fica no ponto do mouse
  }
  const posicionar = () => {
    const legenda = el('apr-legenda')
    if (!legenda) return
    const h1 = document.querySelector('header h1')
    const faixa = document.createRange()
    if (h1) faixa.selectNodeContents(h1) // a largura do texto, não a do elemento
    const titulo = h1 ? faixa.getBoundingClientRect() : null
    const esquerda = titulo ? titulo.right + 24 : 40
    const direita = innerWidth - (titulo ? 90 : 40)
    legenda.style.left = `${esquerda}px`
    legenda.style.right = `${innerWidth - direita}px`
  }
  setInterval(posicionar, 250)
  const aplicar = () => {
    el('apr-legenda')!.textContent = ss.getItem('apr-legenda') ?? ''
    posicionar()
    el('apr-selo')!.textContent = ss.getItem('apr-selo') ?? ''
    const xy = ss.getItem('apr-xy')
    if (xy) mover(...(JSON.parse(xy) as [number, number]))
  }
  ;(window as unknown as { __apr: unknown }).__apr = {
    definir(chave: string, valor: string) {
      ss.setItem(chave, valor)
      if (el('apr-camada')) aplicar()
    },
  }
  addEventListener('mousemove', (e) => (mover(e.clientX, e.clientY), ss.setItem('apr-xy', JSON.stringify([e.clientX, e.clientY]))), true)
  addEventListener(
    'mousedown',
    (e) => {
      const onda = document.createElement('div')
      onda.className = 'apr-onda'
      onda.style.left = `${e.clientX}px`
      onda.style.top = `${e.clientY}px`
      el('apr-camada')?.appendChild(onda)
      setTimeout(() => onda.remove(), 600)
    },
    true,
  )
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar)
  else montar()
}

const definir = (page: Page, chave: string, valor: string) =>
  page.evaluate(([c, v]) => (window as unknown as { __apr?: { definir(c: string, v: string): void } }).__apr?.definir(c, v), [chave, valor])
export const legendar = (page: Page, texto: string) => definir(page, 'apr-legenda', texto)
export const selo = (page: Page, texto: string) => definir(page, 'apr-selo', texto)

const posicoes = new WeakMap<Page, { x: number; y: number }>()
export async function mover(page: Page, x: number, y: number, ms = 700) {
  const de = posicoes.get(page) ?? { x: Tamanho.width / 2, y: Tamanho.height / 2 }
  const quadros = Math.max(1, Math.round(ms / 16))
  for (let i = 1; i <= quadros; i++) {
    const t = i / quadros
    const k = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
    await page.mouse.move(de.x + (x - de.x) * k, de.y + (y - de.y) * k)
    await page.waitForTimeout(16)
  }
  posicoes.set(page, { x, y })
}

export async function apontar(page: Page, alvo: Locator) {
  await alvo.scrollIntoViewIfNeeded()
  const caixa = (await alvo.boundingBox())!
  await mover(page, caixa.x + caixa.width / 2, caixa.y + caixa.height / 2)
  await page.waitForTimeout(150)
}

export async function clicar(page: Page, alvo: Locator) {
  await apontar(page, alvo)
  await alvo.click() // o clique cai no mesmo centro, sem salto do cursor
}

export async function digitar(page: Page, alvo: Locator, texto: string, atraso = 55) {
  await clicar(page, alvo)
  await alvo.pressSequentially(texto, { delay: atraso })
}

export async function rolar(page: Page, dy: number, ms = 800) {
  const quadros = Math.max(1, Math.round(ms / 16))
  for (let i = 0; i < quadros; i++) {
    await page.mouse.wheel(0, dy / quadros)
    await page.waitForTimeout(16)
  }
}

const Inter = readFileSync(path.join(import.meta.dirname, '..', 'node_modules', '@fontsource-variable', 'inter', 'files', 'inter-latin-wght-normal.woff2')).toString('base64')
const escapar = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)
export function htmlCartao({ titulo, subtitulo, nota }: Cartao) {
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>
    @font-face { font-family: Inter; src: url(data:font/woff2;base64,${Inter}) format('woff2'); font-weight: 100 900; }
    html, body { margin: 0; height: 100%; }
    body { display: flex; flex-direction: column; justify-content: center; padding: 0 120px; background: #f6f7f9; color: #111827; font-family: Inter, sans-serif; }
    .marca { width: 56px; height: 6px; border-radius: 3px; background: #224fa7; margin-bottom: 28px; }
    h1 { margin: 0; font-size: 52px; font-weight: 650; letter-spacing: -.02em; line-height: 1.15; }
    p { margin: 18px 0 0; font-size: 24px; color: #4b5563; line-height: 1.45; max-width: 900px; }
    small { position: fixed; left: 120px; bottom: 56px; font-size: 15px; color: #6b7280; letter-spacing: .03em; }
    ${Pulso.css}
  </style><body>${Pulso.html}<div class="marca"></div><h1>${escapar(titulo)}</h1>${subtitulo ? `<p>${escapar(subtitulo)}</p>` : ''}${nota ? `<small>${escapar(nota)}</small>` : ''}</body></html>`
}

type PassoGravado = { id: string; texto: string; inicio: number; arquivo: string; duracao: number; motor: string }
const gravacoes = new WeakMap<Page, { t0: number; cartao: boolean; passos: PassoGravado[] }>()
const agora = (page: Page) => (Date.now() - gravacoes.get(page)!.t0) / 1000

export async function passo(page: Page, p: Passo) {
  const g = gravacoes.get(page)!
  const audio = await narracao(p.texto)
  if (!g.cartao) await legendar(page, p.texto)
  const inicio = agora(page)
  g.passos.push({ id: p.id, texto: p.texto, inicio, ...audio })
  await p.acao?.(page)
  const resta = inicio + audio.duracao + Pausa - agora(page)
  if (resta > 0) await page.waitForTimeout(resta * 1000)
}

export async function gravar(browser: Browser, seg: Segmento) {
  const pasta = path.join(Saida, 'segmentos')
  const bruto = path.join(Saida, 'bruto', seg.id)
  rmSync(bruto, { recursive: true, force: true })
  mkdirSync(pasta, { recursive: true })
  for (const p of seg.passos) await narracao(p.texto) // sintetiza antes de começar a gravar
  const context = await browser.newContext({ ...Contexto, recordVideo: { dir: bruto, size: Tamanho } })
  await context.addInitScript(camada, Pulso)
  const page = await context.newPage()
  gravacoes.set(page, { t0: Date.now(), cartao: !!seg.cartao, passos: [] })
  if (seg.cartao) await page.setContent(htmlCartao(seg.cartao))
  else {
    await seg.preparar?.(page)
    if (seg.selo) await selo(page, seg.selo)
    await page.mouse.move(Tamanho.width / 2, Tamanho.height / 2)
  }
  await page.waitForTimeout(400) // fontes e animações de entrada assentam antes do corte
  await page.evaluate(() => {
    const m = document.createElement('div')
    m.id = 'apr-sinc'
    m.style.cssText = 'position:fixed;left:0;top:0;width:24px;height:24px;background:#f0f;z-index:2147483647'
    document.documentElement.appendChild(m)
  })
  const sinc = agora(page)
  await page.waitForTimeout(300)
  await page.evaluate(() => document.getElementById('apr-sinc')?.remove())
  await page.waitForTimeout(100)
  const corte = agora(page)
  for (const p of seg.passos) await passo(page, p)
  const fim = agora(page)
  const passos = gravacoes.get(page)!.passos
  await context.close()
  await page.video()!.saveAs(path.join(pasta, `${seg.id}.webm`))
  rmSync(bruto, { recursive: true, force: true })
  writeFileSync(path.join(pasta, `${seg.id}.json`), JSON.stringify({ id: seg.id, sinc, corte, fim, passos }, null, 2))
}
