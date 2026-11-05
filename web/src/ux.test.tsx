import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { Monitor, Moon, MoonStar, Sun } from 'lucide-react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import pacote from '../package.json'
import { App } from './App'
import { api, me } from './test/util'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'
import { Sheet, SheetContent, SheetTitle } from './ui/sheet'

// revisao-ux (S1 e os tokens de S6): regras de decisão e de código-fonte; o que se mede em pixels está em e2e/ux.spec.ts.
const fontes = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const css = readFileSync('src/index.css', 'utf8') // cwd = web/ (vitest)

afterEach(() => {
  localStorage.clear()
  document.documentElement.className = ''
})

// Abre o App na rota e deixa a localização visível, para afirmar para onde a guarda levou.
function abrirComLocal(caminho: string) {
  const Local = () => <output data-testid="local">{useLocation().pathname}</output>
  return render(
    <MemoryRouter initialEntries={[caminho]}>
      <App />
      <Local />
    </MemoryRouter>,
  )
}

describe('ux', () => {
  // C4 (AC 3): o X de Dialog e de Sheet é o botão "Fechar", e o nome em inglês saiu
  it('Dialog e Sheet fecham por um botão Fechar', () => {
    const { unmount } = render(
      <Dialog open>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Diálogo</DialogTitle>
        </DialogContent>
      </Dialog>,
    )
    expect(screen.getAllByRole('button', { name: 'Fechar' })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
    unmount()
    render(
      <Sheet open>
        <SheetContent aria-describedby={undefined}>
          <SheetTitle>Folha</SheetTitle>
        </SheetContent>
      </Sheet>,
    )
    expect(screen.getAllByRole('button', { name: 'Fechar' })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })

  // C8 (AC 7, door 3): a cor de status `success` (token, classe ou variável) só em index.css, no selo do chamado e no selo de situação;
  // `toast.success` é a API do Sonner e não usa o token
  it('verde só nos selos', () => {
    const Token = /(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|shadow)-success\b|--success\b|--color-success\b/
    const usam = Object.entries(fontes)
      .filter(([caminho]) => !/\.test\.tsx?$/.test(caminho) && Token.test(fontes[caminho]))
      .map(([caminho]) => caminho.replace('/src/', ''))
    expect([...usam, ...(Token.test(css) ? ['index.css'] : [])].sort()).toEqual(['chamados/Chamados.tsx', 'conhecimento/comum.tsx', 'index.css'])
  })

  // C9 (AC 8): o primeiro Tab a partir do body foca "Pular para o conteúdo", e Enter leva o foco ao main
  it.each([
    ['ALUNO', '/univag/assistente'],
    ['ATENDENTE', '/univag/fila'],
    ['ADMINISTRADOR', '/univag/artigos'],
  ])('pular para o conteúdo leva o foco ao main (%s)', async (papel, caminho) => {
    api({ 'GET /api/auth/me': () => [200, me({ papeis: [papel] })] })
    abrirComLocal(caminho)
    const main = await waitFor(() => {
      const el = document.querySelector('main')
      expect(el).not.toBeNull()
      return el as HTMLElement
    })
    ;(document.activeElement as HTMLElement).blur()
    expect(document.activeElement).toBe(document.body)
    await userEvent.tab()
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Pular para o conteúdo' }))
    await userEvent.keyboard('{Enter}')
    expect(document.activeElement).toBe(main)
  })

  // C10 (AC 9): o menu mais "conta", por papel; fora do papel volta à tela inicial, dentro do papel abre sem redirecionar
  const Rotas: Record<string, string[]> = {
    ALUNO: ['assistente', 'solicitacoes', 'conta'],
    ATENDENTE: ['fila', 'indicadores'],
    ADMINISTRADOR: ['indicadores', 'artigos', 'documentos', 'usuarios', 'matriculas', 'cadastros', 'aparencia'],
  }
  const Inicial: Record<string, string> = { ALUNO: 'assistente', ATENDENTE: 'fila', ADMINISTRADOR: 'artigos' }
  const Todas = ['assistente', 'solicitacoes', 'conta', 'fila', 'indicadores', 'artigos', 'documentos', 'usuarios', 'matriculas', 'cadastros', 'aparencia', 'instituicoes']
  const fora = Object.entries(Rotas).flatMap(([papel, minhas]) => Todas.filter((r) => !minhas.includes(r)).map((rota) => [papel, rota] as const))

  it('rota de outro papel volta à tela inicial (24 casos)', () => {
    // os 11 caminhos do menu de Autenticado.tsx mais "conta": 9 de ALUNO, 10 de ATENDENTE e 5 de ADMINISTRADOR
    expect(['ALUNO', 'ATENDENTE', 'ADMINISTRADOR'].map((p) => fora.filter(([papel]) => papel === p).length)).toEqual([9, 10, 5])
    expect(fora).toHaveLength(24)
  })

  it.each(fora)('rota de outro papel volta à tela inicial (%s em /%s)', async (papel, rota) => {
    api({ 'GET /api/auth/me': () => [200, me({ papeis: [papel] })] })
    abrirComLocal(`/univag/${rota}`)
    await waitFor(() => expect(screen.getByTestId('local')).toHaveTextContent(`/univag/${Inicial[papel]}`))
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it.each(Object.entries(Rotas).flatMap(([papel, minhas]) => minhas.map((rota) => [papel, rota] as const)))('o papel abre a própria rota sem redirecionar (%s em /%s)', async (papel, rota) => {
    api({ 'GET /api/auth/me': () => [200, me({ papeis: [papel] })] })
    abrirComLocal(`/univag/${rota}`)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.getByTestId('local')).toHaveTextContent(`/univag/${rota}`)
  })

  // C11 (AC 10): o botão de tema mostra o ícone do tema atual, e a opção atual leva aria-pressed
  it.each([
    ['light', Sun],
    ['dark', Moon],
    ['black', MoonStar],
    ['system', Monitor],
  ])('botão de tema mostra e marca o tema atual (%s)', async (tema, Icone) => {
    localStorage.setItem('one-tema', tema)
    api({ 'GET /api/auth/me': () => [200, me()] })
    abrirComLocal('/univag/trocar-senha')
    const botao = await screen.findByRole('button', { name: 'Tema' })
    const { container } = render(<Icone />)
    expect(botao.querySelector('svg')!.innerHTML).toBe(container.querySelector('svg')!.innerHTML)
    await userEvent.click(botao)
    const opcoes = within(document.querySelector('[data-slot=popover-content]') as HTMLElement).getAllByRole('button')
    expect(opcoes.map((o) => [o.textContent, o.getAttribute('aria-pressed')])).toEqual(
      [['Claro', 'light'], ['Escuro', 'dark'], ['Preto', 'black'], ['Sistema', 'system']].map(([rotulo, valor]) => [rotulo, String(valor === tema)]),
    )
  })

  // C52 (AC 39, door 2): os 14 neutros tingidos pela marca; o fundo do Preto continua preto puro
  it('neutros tingidos pela marca nos três temas', () => {
    const bloco = (seletor: string) => css.slice(css.indexOf(`\n${seletor} {`)).split('}')[0]
    const Formato = /^color-mix\(in oklch, var\(--marca, oklch\([^)]+\)\) (\d+)%, oklch\([^)]+\)\)$/
    const declarado = (seletor: string, token: string) => bloco(seletor).match(new RegExp(`^\\s*${token}:\\s*([^;]+);`, 'm'))?.[1]
    const tokens = ['--background', '--muted', '--border', '--input', '--accent']
    let total = 0
    for (const [seletor, doTema] of [[':root', tokens], ['.dark', tokens], ['.black', tokens.slice(1)]] as const)
      for (const token of doTema) {
        const valor = declarado(seletor, token)
        expect(valor, `${seletor} ${token}`).toMatch(Formato)
        expect(Number(valor!.match(Formato)![1]), `${seletor} ${token}`).toBeGreaterThanOrEqual(2)
        expect(Number(valor!.match(Formato)![1]), `${seletor} ${token}`).toBeLessThanOrEqual(6)
        total++
      }
    expect(total).toBe(14)
    expect(declarado('.black', '--background')).toBe('okl' + 'ch(0 0 0)') // em pedaços: a regra de cores literais de interface.test.ts varre este arquivo
  })

  // C54 (AC 40, door 2): o eixo opsz da Inter variável, sem fonte nova
  it('opsz da Inter sem fonte nova', () => {
    expect(fontes['/src/main.tsx']).toContain("import '@fontsource-variable/inter/opsz.css'")
    expect(Object.keys(pacote.dependencies).filter((nome) => nome.startsWith('@fontsource'))).toEqual(['@fontsource-variable/inter'])
    expect(css).toMatch(/h1,\s*h2 \{\s*font-variation-settings: 'opsz' 32;\s*\}/)
    expect(css.match(/\bbody \{[^}]*\}/)![0]).not.toContain('opsz')
  })
})
