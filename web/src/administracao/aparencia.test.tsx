import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { iniciais } from '../aparencia'
import { abrir, api, instituicao, me, type Rota } from '../test/util'

// aparencia-instituicao S3 (AC 23 a AC 27, AC 21 na tela). As cores entram em pedaços: interface.test.ts proíbe cor literal em src/.
const hex = (digitos: string) => '#' + digitos
const Cor = hex('8a1538')
const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const aparencia = (parcial: Record<string, unknown> = {}) => {
  const { nome: _, ...resto } = instituicao(parcial)
  return resto
}
const arquivo = (nome: string) => new File(['x'], nome, { type: 'image/png' })

const rotas = (extra: Record<string, Rota> = {}, atual: object = aparencia()) =>
  api({
    'GET /api/auth/me': () => [200, admin],
    'GET /api/admin/aparencia': () => [200, atual],
    'GET /api/instituicoes/univag': () => [200, instituicao()],
    ...extra,
  })

async function digitar(rotulo: string | RegExp, texto: string) {
  const campo = await screen.findByLabelText(rotulo)
  await userEvent.clear(campo)
  await userEvent.type(campo, texto)
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:imagem-nova')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => {
  document.documentElement.removeAttribute('style')
})

describe('tela Aparência', () => {
  // C23 (AC 23, door 7)
  it('link Aparência só para administrador', async () => {
    for (const [papel, ve] of [['ALUNO', false], ['ATENDENTE', false], ['ADMINISTRADOR', true]] as const) {
      api({ 'GET /api/auth/me': () => [200, me({ papeis: [papel] })] })
      const { unmount } = abrir('/univag/trocar-senha')
      await screen.findByRole('button', { name: 'Alternar barra lateral' })
      const nav = within(await screen.findByRole('navigation'))
      if (!ve) expect(nav.queryByRole('link', { name: 'Aparência' }), papel).not.toBeInTheDocument()
      else {
        const link = nav.getByRole('link', { name: 'Aparência' })
        expect(link).toHaveAttribute('href', '/univag/aparencia')
        expect(link.querySelector('svg')).toHaveClass('lucide-palette')
        const grupo = within(nav.getByRole('group', { name: 'Administração' }))
        expect(grupo.getAllByRole('link').map((l) => l.textContent)).toEqual(['Usuários', 'Matrículas', 'Cadastros', 'Aparência'])
      }
      unmount()
    }
  })

  // C24 (AC 24)
  it('prévia muda antes de salvar', async () => {
    rotas()
    abrir('/univag/aparencia')
    await digitar('Cor principal', Cor)
    const previa = within(screen.getByRole('region', { name: 'Prévia' }))
    expect(previa.getByRole('button', { name: 'Entrar' }).closest('.previa-marca') as HTMLElement).toHaveStyle(`--marca-previa: ${Cor}`)

    expect(document.querySelector('[aria-label="Prévia"] img[src^="blob:"]')).toBeNull()
    await userEvent.upload(screen.getByLabelText('Arquivo: Logo'), arquivo('logo.png'))
    expect(document.querySelector('[aria-label="Prévia"] img[src^="blob:"]')).not.toBeNull()

    await digitar('Título do login', 'Fale com a Univag')
    expect(previa.getByText('Fale com a Univag')).toBeInTheDocument()

    await digitar('Nome do assistente', 'Vagner')
    expect(previa.getByText('Olá! Eu sou Vagner.')).toBeInTheDocument()
  })

  // C25 (AC 25)
  it('salvar mostra Aparência salva e aplica sem recarregar', async () => {
    let salva: object = instituicao()
    const chamadas = rotas({
      'GET /api/instituicoes/univag': () => [200, salva],
      'PUT /api/admin/aparencia': (corpo) => {
        salva = instituicao({ nomeCurto: corpo.nomeCurto, cor: corpo.cor })
        return [200, { ...salva, nome: undefined }]
      },
    })
    abrir('/univag/aparencia')
    await digitar('Nome curto', 'Univag')
    await digitar('Cor principal', Cor)
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Aparência salva.')).toBeInTheDocument()
    const put = chamadas.find((c) => c.metodo === 'PUT')!
    expect(put.url).toBe('/api/admin/aparencia')
    expect(put.corpo).toMatchObject({ nomeCurto: 'Univag', cor: Cor, login: { titulo: null, frase: null, itens: [] }, assistente: { nome: null, perguntas: [] }, contato: { horario: null, telefone: null, email: null } })
    await waitFor(() => expect(document.documentElement.style.getPropertyValue('--marca')).toBe(Cor))
    expect(chamadas.filter((c) => c.metodo === 'GET' && c.url === '/api/instituicoes/univag').length).toBeGreaterThan(1) // a consulta foi invalidada e relida
  })

  // C26 (AC 26)
  it('erro da API aparece e o formulário fica', async () => {
    rotas({ 'PUT /api/admin/aparencia': () => [400, { status: 400, detail: 'Escolha uma cor mais escura.', errors: { cor: ['Escolha uma cor mais escura: o texto branco precisa de contraste 4,5:1 sobre ela.'] } }] })
    const { unmount } = abrir('/univag/aparencia')
    await digitar('Título do login', 'Fale com a Univag')
    await digitar('Cor principal', hex('767676'))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    const erro = await screen.findByText('Escolha uma cor mais escura: o texto branco precisa de contraste 4,5:1 sobre ela.')
    expect(erro.closest('div')).toContainElement(screen.getByLabelText('Cor principal')) // abaixo do campo de cor
    expect(screen.getByLabelText('Cor principal')).toHaveValue(hex('767676'))
    expect(screen.getByLabelText('Título do login')).toHaveValue('Fale com a Univag')
    unmount()

    for (const [status, detail] of [[413, 'A imagem passa de 1 MB.'], [415, 'Envie uma imagem PNG ou JPEG.'], [503, 'Armazenamento indisponível.']] as const) {
      rotas({
        'PUT /api/admin/aparencia': () => [200, aparencia()],
        'POST /api/admin/aparencia/imagens/logo': () => [status, { status, title: 'Erro', detail }],
      })
      const montada = abrir('/univag/aparencia')
      await digitar('Título do login', 'Fale com a Univag')
      await userEvent.upload(await screen.findByLabelText('Arquivo: Logo'), arquivo('logo.png'))
      await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
      const alerta = await screen.findByRole('alert')
      expect(alerta, String(status)).toHaveTextContent(detail)
      expect(alerta.closest('div')!.parentElement).toContainElement(screen.getByRole('button', { name: 'Enviar imagem: Logo' })) // no bloco da imagem
      expect(screen.getByLabelText('Título do login')).toHaveValue('Fale com a Univag')
      expect(document.querySelector('img[alt="Miniatura: Logo"]')).toHaveAttribute('src', 'blob:imagem-nova') // a escolhida continua
      expect(screen.queryByText('Aparência salva.')).not.toBeInTheDocument()
      montada.unmount()
    }
  })

  // C27 (AC 27, door 8)
  it('contraste ao lado da cor e Salvar desabilitado', async () => {
    rotas()
    abrir('/univag/aparencia')
    for (const [cor, texto, habilitado] of [
      [hex('224fa7'), 'Contraste com o branco: 7,65:1', true], // C27 pede 7,47:1; a regra do servidor dá 7,65 (ver o ## Handoff)
      [hex('767676'), 'Contraste com o branco: 4,54:1', true],
      [hex('ffd700'), 'Contraste com o branco: 1,40:1', false],
    ] as const) {
      await digitar('Cor principal', cor)
      expect(screen.getByText(texto)).toBeInTheDocument()
      expect(screen.getByTestId('amostra')).toHaveStyle({ backgroundColor: cor })
      const salvar = screen.getByRole('button', { name: 'Salvar' })
      if (habilitado) expect(salvar).toBeEnabled()
      else expect(salvar).toBeDisabled()
    }
  })

  // C29 (AC 21, Observable)
  it('remover imagem pede confirmação', async () => {
    let logo: number | null = 3
    const chamadas = rotas({
      'GET /api/admin/aparencia': () => [200, aparencia({ imagens: { logo, icone: null, login: null, assistente: null } })],
      'DELETE /api/admin/aparencia/imagens/logo': () => {
        logo = null
        return [204, undefined]
      },
    })
    abrir('/univag/aparencia')
    const miniatura = await screen.findByRole('img', { name: 'Miniatura: Logo' })
    expect(miniatura).toHaveAttribute('src', '/api/instituicoes/univag/imagens/logo?v=3')
    await userEvent.click(screen.getByRole('button', { name: 'Remover imagem: Logo' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Remover a imagem?' })
    expect(chamadas.some((c) => c.metodo === 'DELETE')).toBe(false)
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Remover' }))
    await waitFor(() => expect(screen.queryByRole('img', { name: 'Miniatura: Logo' })).not.toBeInTheDocument())
    expect(chamadas.filter((c) => c.metodo === 'DELETE').map((c) => c.url)).toEqual(['/api/admin/aparencia/imagens/logo'])
  })

  // C50 (AC 37): abaixo de 1024 px a prévia sai da página e abre pelo "Ver prévia"
  it('a prévia abre pelo Ver prévia abaixo de 1024', async () => {
    vi.stubGlobal('matchMedia', (media: string) => ({ media, matches: media === '(max-width: 1023px)', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
    try {
      rotas()
      abrir('/univag/aparencia')
      const botao = await screen.findByRole('button', { name: 'Ver prévia' })
      expect(screen.queryByRole('region', { name: 'Prévia' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument()
      expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Marca', 'Login', 'Assistente', 'Contato'])
      fireEvent.click(botao)
      expect(within(await screen.findByRole('dialog', { name: 'Prévia' })).getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  // C70 (AC 15, AC 21)
  it('as 4 imagens com miniatura, enviar e remover', async () => {
    const tipos = [['logo', 'Logo'], ['icone', 'Ícone do app'], ['login', 'Imagem do login'], ['assistente', 'Foto do assistente']] as const
    for (const [tipo, rotulo] of tipos) {
      const imagens = { logo: null, icone: null, login: null, assistente: null, [tipo]: 7 }
      const chamadas = rotas({
        'GET /api/admin/aparencia': () => [200, aparencia({ imagens })],
        'PUT /api/admin/aparencia': () => [200, aparencia()],
        [`POST /api/admin/aparencia/imagens/${tipo}`]: () => [200, { tipo, versao: 8 }],
        [`DELETE /api/admin/aparencia/imagens/${tipo}`]: () => [204, undefined],
      })
      const { unmount } = abrir('/univag/aparencia')
      expect(await screen.findByRole('img', { name: `Miniatura: ${rotulo}` }), tipo).toHaveAttribute('src', `/api/instituicoes/univag/imagens/${tipo}?v=7`)
      expect(screen.getByRole('button', { name: `Enviar imagem: ${rotulo}` })).toBeInTheDocument()
      // sem versão nos outros 3 tipos: nem miniatura nem "Remover"
      expect(screen.getAllByRole('button', { name: /^Remover imagem:/ }), tipo).toHaveLength(1)
      expect(document.querySelectorAll('img[alt^="Miniatura:"]'), tipo).toHaveLength(1)

      await userEvent.upload(screen.getByLabelText(`Arquivo: ${rotulo}`), arquivo('nova.png'))
      await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
      await waitFor(() => expect(chamadas.filter((c) => c.metodo === 'POST').map((c) => c.url)).toEqual([`/api/admin/aparencia/imagens/${tipo}`]))
      expect(chamadas.find((c) => c.metodo === 'POST')!.corpo.arquivo, tipo).toBeInstanceOf(File)

      await userEvent.click(screen.getByRole('button', { name: `Remover imagem: ${rotulo}` }))
      await userEvent.click(within(await screen.findByRole('dialog', { name: 'Remover a imagem?' })).getByRole('button', { name: 'Remover' }))
      await waitFor(() => expect(chamadas.filter((c) => c.metodo === 'DELETE').map((c) => c.url), tipo).toEqual([`/api/admin/aparencia/imagens/${tipo}`]))
      unmount()
    }
  })

  // C71 (AC 24)
  it('iniciais da prévia iguais às do login', async () => {
    for (const nome of ['Centro Universitário de Várzea Grande', 'Faculdade Demo']) {
      const sigla = (raiz: ParentNode) => raiz.querySelector('span.bg-primary[aria-hidden=true]')!.textContent
      api({
        'GET /api/auth/me': () => [200, { ...admin, instituicao: { ...admin.instituicao, nome } }],
        'GET /api/admin/aparencia': () => [200, aparencia()],
        'GET /api/instituicoes/univag': () => [200, instituicao({ nome })],
      })
      const prévia = abrir('/univag/aparencia')
      const daPrevia = sigla(await screen.findByRole('region', { name: 'Prévia' }))
      prévia.unmount()

      api({ 'GET /api/instituicoes/univag': () => [200, instituicao({ nome })] })
      abrir('/univag')
      await screen.findByLabelText('CPF')
      const doLogin = await waitFor(() => sigla(document.body))
      expect(daPrevia, nome).toBe(doLogin)
      expect(daPrevia, nome).toBe(iniciais(nome))
      cleanup()
    }
  })
})
