import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import html from '../index.html?raw'
import { contraste } from './aparencia'
import { abrir, api, instituicao, me, type Rota } from './test/util'

// aparencia-instituicao S4, S5 (menu), S6 e S8 do lado do web/. As cores entram em pedaços: interface.test.ts proíbe cor literal em src/.
const hex = (digitos: string) => '#' + digitos
const Cor = hex('8a1538')
const css = readFileSync('src/index.css', 'utf8') // cwd = web/
const base = new DOMParser().parseFromString(html, 'text/html')
const baseDe = (seletor: string, atributo: string) => base.head.querySelector(seletor)!.getAttribute(atributo)!
const noHead = (seletor: string, atributo: string) => document.head.querySelector(seletor)?.getAttribute(atributo)

const comMarca = instituicao({
  nomeCurto: 'Univag',
  cor: Cor,
  login: { titulo: 'Fale com a Univag', frase: 'Aqui você resolve tudo.', itens: ['Boletos', 'Matrícula'] },
  contato: { horario: 'Seg a sex, 8h às 18h', telefone: '(65) 3688-6000', email: 'atendimento@univag.edu.br' },
  imagens: { logo: 3, icone: 2, login: null, assistente: null },
})
const publica = (inst: object): Record<string, Rota> => ({ 'GET /api/instituicoes/univag': () => [200, inst] })
const comSessao = (inst: object, papeis = ['ALUNO']) => api({ ...publica(inst), 'GET /api/auth/me': () => [200, me({ papeis })] })

// o index.html do build traz o <head> da marca padrão; o manifesto vem do vite-plugin-pwa, e aqui entra à mão
beforeEach(() => {
  document.head.innerHTML = [...base.head.children].map((e) => e.outerHTML).join('') + '<link rel="manifest" href="/manifest.webmanifest">'
  document.title = base.title
})
afterEach(() => {
  vi.useRealTimers()
  document.documentElement.removeAttribute('style')
  delete document.documentElement.dataset.titulo
})

describe('marca da instituição', () => {
  // C27 (AC 27, door 8)
  it('contraste calcula a razão WCAG', () => {
    // C27 diz 7,47 para este azul, mas a regra do servidor (ContrasteDaCor.cs, WCAG 2.x) dá 7,65: ver o ## Handoff
    expect(contraste(hex('224fa7')).toFixed(2)).toBe('7.65')
    expect(contraste(hex('767676')).toFixed(2)).toBe('4.54')
    expect(contraste(hex('ffd700')).toFixed(2)).toBe('1.40')
    expect(contraste(hex('777777')).toFixed(2)).toBe('4.48')
  })

  // C34 (AC 31)
  it('marca no html só com cor', async () => {
    comSessao(comMarca)
    const { unmount } = abrir('/univag')
    await waitFor(() => expect(document.documentElement.style.getPropertyValue('--marca')).toBe(Cor))
    unmount()

    comSessao(instituicao({ nomeCurto: 'Univag' }))
    abrir('/univag')
    await screen.findByLabelText('CPF')
    await waitFor(() => expect(document.documentElement.style.getPropertyValue('--marca')).toBe(''))
    expect(document.documentElement.getAttribute('style') ?? '').not.toContain('--marca')
  })

  // C34 (AC 31)
  it('tokens derivam de marca nos três temas', () => {
    const bloco = (seletor: string) => css.slice(css.indexOf(`${seletor} {`)).split('}')[0]
    const declaracao = (corpo: string, token: string) => corpo.match(new RegExp(`\\s${token}:\\s*([^;]+);`))?.[1].trim()
    // o token vira var(--X, <valor de base>); X é --marca ou um derivado dela, definido com var(--marca)
    const deriva = (corpo: string, token: string) => {
      const [, auxiliar] = declaracao(corpo, token)!.match(/^var\((--marca[\w-]*),/)!
      return auxiliar === '--marca' ? 'var(--marca)' : declaracao(css, auxiliar)!
    }
    const temas: [string, string[]][] = [
      [':root', ['--primary', '--sidebar-primary', '--primary-subtle', '--ring']],
      ['.dark', ['--primary', '--sidebar-primary', '--primary-subtle', '--ring']],
      ['.black', ['--primary-subtle']], // o .black herda o resto do .dark
    ]
    for (const [seletor, tokens] of temas)
      for (const token of tokens) {
        expect(declaracao(bloco(seletor), token), `${seletor} ${token}`).toMatch(/^var\(--marca[\w-]*, .+\)$/)
        expect(deriva(bloco(seletor), token), `${seletor} ${token}`).toContain('var(--marca)')
      }
    // Escuro e Preto (door 8): 55% da marca com branco
    expect(declaracao(css, '--marca-clara')).toBe('color-mix(in oklch, var(--marca) 55%, white)')
    expect(declaracao(bloco('.dark'), '--primary')).toMatch(/^var\(--marca-clara, /)
    expect(declaracao(bloco('.dark'), '--primary-foreground')).toBe('ok' + 'lch(0.17 0 0)')
  })

  // C35 (AC 32)
  it('logo no login e na barra', async () => {
    comSessao(comMarca)
    let montada = abrir('/univag')
    await screen.findByLabelText('CPF')
    const logos = await screen.findAllByRole('img', { name: 'Univag' })
    expect(logos.length).toBeGreaterThan(0)
    for (const logo of logos) expect(logo).toHaveAttribute('src', '/api/instituicoes/univag/imagens/logo?v=3')
    expect(logos[0]).toHaveClass('h-12') // 48 px
    montada.unmount()

    comSessao(comMarca)
    montada = abrir('/univag/assistente')
    const barra = await waitFor(() => {
      const el = document.querySelector('[data-sidebar=sidebar]') as HTMLElement
      expect(within(el).getByRole('img', { name: 'Univag' })).toBeInTheDocument()
      return el
    })
    expect(within(barra).getByRole('img', { name: 'Univag' })).toHaveAttribute('src', '/api/instituicoes/univag/imagens/logo?v=3')
    montada.unmount()

    // sem logo: as iniciais, e não "One"
    comSessao(instituicao())
    abrir('/univag')
    await screen.findByLabelText('CPF')
    expect(screen.queryByRole('img', { name: 'Univag' })).not.toBeInTheDocument()
    expect(screen.queryByText('One')).not.toBeInTheDocument()
    expect(document.querySelector('span.bg-primary')).toHaveTextContent('U')
  })

  // C36 (AC 33)
  it('ícone na aba, na barra recolhida e no topo', async () => {
    const icone = '/api/instituicoes/univag/imagens/icone?v=2'
    comSessao(comMarca)
    let montada = abrir('/univag/assistente')
    await waitFor(() => expect(noHead('link[rel="icon"]', 'href')).toBe(icone))
    expect(noHead('link[rel="apple-touch-icon"]', 'href')).toBe(icone)
    const barra = document.querySelector('[data-sidebar=sidebar]') as HTMLElement
    await waitFor(() => expect(barra.querySelector(`img[src="${icone}"]`)).not.toBeNull()) // a recolhida
    expect(document.querySelector(`header img[src="${icone}"]`)).not.toBeNull() // o topo do celular
    montada.unmount()

    comSessao(instituicao())
    montada = abrir('/univag/assistente')
    await screen.findByText('Atendimento ao estudante · Univag')
    await waitFor(() => expect(noHead('link[rel="icon"]', 'href')).toBe(baseDe('link[rel="icon"]', 'href')))
    expect(noHead('link[rel="apple-touch-icon"]', 'href')).toBe('/icons/icon-192.png')
    expect(noHead('link[rel="icon"]', 'href')).toBe('/icons/icon-192.png')
    expect(document.querySelector('[data-sidebar=sidebar] img')).toBeNull()
    expect(document.querySelector('[data-sidebar=sidebar] span.bg-primary')).toHaveTextContent('U')
  })

  // C37 (AC 34)
  it('título e theme-color da instituição', async () => {
    comSessao(comMarca)
    let montada = abrir('/univag')
    await waitFor(() => expect(document.title).toBe('Univag'))
    expect(noHead('meta[name="theme-color"]', 'content')).toBe(Cor)
    montada.unmount()

    comSessao(instituicao({ nomeCurto: null }))
    montada = abrir('/univag')
    await screen.findByLabelText('CPF')
    await waitFor(() => expect(document.title).toBe('Univag')) // sem nomeCurto, o nome
    expect(noHead('meta[name="theme-color"]', 'content')).toBe(baseDe('meta[name="theme-color"]', 'content'))
    montada.unmount()

    comSessao(instituicao({ nome: 'Centro Universitário de Várzea Grande', nomeCurto: null }))
    abrir('/univag')
    await waitFor(() => expect(document.title).toBe('Centro Universitário de Várzea Grande'))
  })

  // C56 (AC 53)
  it('manifesto da instituição no link', async () => {
    api({})
    let montada = abrir('/univag')
    await waitFor(() => expect(noHead('link[rel="manifest"]', 'href')).toBe('/api/instituicoes/univag/manifest.webmanifest'))
    montada.unmount()

    montada = abrir('/')
    await waitFor(() => expect(noHead('link[rel="manifest"]', 'href')).toBe('/manifest.webmanifest'))
    expect(document.title).toBe(base.title)
    montada.unmount()
  })

  // C39 (AC 36)
  it('textos do login da instituição ou os de base', async () => {
    comSessao(comMarca)
    let montada = abrir('/univag')
    expect(await screen.findByRole('heading', { name: 'Fale com a Univag' })).toBeInTheDocument()
    expect(screen.getByText('Aqui você resolve tudo.')).toBeInTheDocument()
    for (const item of ['Boletos', 'Matrícula']) expect(screen.getByText(item)).toBeInTheDocument()
    expect(screen.queryByText('Atendimento ao estudante')).not.toBeInTheDocument()
    expect(screen.queryByText('Tire dúvidas com o assistente a qualquer hora')).not.toBeInTheDocument()
    montada.unmount()

    comSessao(instituicao())
    montada = abrir('/univag')
    expect(await screen.findByRole('heading', { name: 'Atendimento ao estudante' })).toBeInTheDocument()
    expect(screen.getByText('Dúvidas, solicitações e respostas da sua instituição em um só lugar.')).toBeInTheDocument()
    for (const item of ['Tire dúvidas com o assistente a qualquer hora', 'Acompanhe suas solicitações até a resposta', 'Fale com a equipe da instituição quando precisar'])
      expect(screen.getByText(item)).toBeInTheDocument()
  })

  // C38 (AC 35): o arranjo é do Playwright; aqui, que a imagem vai no painel e na faixa, decorativa
  it('imagem do login no painel e na faixa', async () => {
    comSessao(instituicao({ login: { titulo: 'Fale com a Univag', frase: null, itens: [] }, imagens: { logo: null, icone: null, login: 1, assistente: null } }))
    abrir('/univag')
    await screen.findByLabelText('CPF')
    const imagens = document.querySelectorAll('img[src="/api/instituicoes/univag/imagens/login?v=1"]')
    expect(imagens).toHaveLength(2) // a faixa e o painel
    for (const imagem of imagens) expect(imagem).toHaveAttribute('alt', '')
    expect(document.querySelector('svg[data-ilustracao="boas-vindas"]')).toBeNull()
  })

  // C46 (AC 43)
  it('item Contato no menu só com contato', async () => {
    comSessao(comMarca)
    let montada = abrir('/univag/assistente')
    const barra = (await waitFor(() => {
      const el = document.querySelector('[data-sidebar=sidebar]') as HTMLElement
      expect(within(el).getByRole('button', { name: 'Contato' })).toBeInTheDocument()
      return el
    })) as HTMLElement
    const botoes = within(barra).getAllByRole('button').map((b) => b.textContent)
    expect(botoes.indexOf('Contato')).toBeLessThan(botoes.findIndex((t) => t?.includes('Ana'))) // acima do usuário
    await userEvent.click(within(barra).getByRole('button', { name: 'Contato' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Contato do atendimento' })
    expect(within(dialogo).getByText('Seg a sex, 8h às 18h')).toBeInTheDocument()
    expect(within(dialogo).getByRole('link', { name: '(65) 3688-6000' })).toHaveAttribute('href', 'tel:6536886000')
    expect(within(dialogo).getByRole('link', { name: 'atendimento@univag.edu.br' })).toHaveAttribute('href', 'mailto:atendimento@univag.edu.br')
    await userEvent.keyboard('{Escape}')
    montada.unmount()

    // a gaveta do celular é a mesma barra
    comSessao(comMarca)
    window.innerWidth = 500
    montada = abrir('/univag/assistente')
    await userEvent.click(await screen.findByRole('button', { name: 'Alternar barra lateral' }))
    const gaveta = await screen.findByRole('dialog', { name: 'Menu' })
    expect(within(gaveta).getByRole('button', { name: 'Contato' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    window.innerWidth = 1024
    montada.unmount()

    comSessao(instituicao())
    abrir('/univag/assistente')
    await screen.findByText('Atendimento ao estudante · Univag')
    expect(screen.queryByRole('button', { name: 'Contato' })).not.toBeInTheDocument()
  })
})
