import type { Roteiro } from '../kit'
import { clicar, digitar } from '../kit'
import { simularApi } from '../../e2e/simulada'

export const roteiro: Roteiro = {
  video: 'amostra.mp4',
  legendas: 'amostra.srt',
  segmentos: [
    {
      id: '00-abertura',
      cartao: { titulo: 'One — atendimento acadêmico com IA', subtitulo: 'Amostra do kit de gravação', nota: 'Dados de demonstração' },
      passos: [{ id: 'abertura', texto: 'Esta é uma amostra curta da apresentação do One.' }],
    },
    {
      id: '01-aluno',
      selo: 'Visão do aluno',
      preparar: async (page) => {
        await simularApi(page, ['ALUNO'])
        await page.goto('/univag/assistente')
        await page.getByLabel('Mensagem').waitFor()
      },
      passos: [
        { id: 'caixa', texto: 'O aluno abre o assistente e escreve a dúvida na caixa de mensagem.', acao: (page) => clicar(page, page.getByLabel('Mensagem')) },
        { id: 'digita', texto: 'Ele pergunta, com as próprias palavras, onde encontra a segunda via do boleto.', acao: (page) => digitar(page, page.getByLabel('Mensagem'), 'Onde encontro a segunda via do boleto?') },
        {
          id: 'resposta',
          texto: 'Ao enviar, o assistente responde com o caminho certo no portal da instituição.',
          acao: async (page) => {
            await page.keyboard.press('Enter')
            await page.getByText('Isso resolveu?').waitFor()
          },
        },
      ],
    },
    {
      id: '99-fim',
      cartao: { titulo: 'Obrigado', subtitulo: 'One — atendimento acadêmico com IA' },
      passos: [{ id: 'fim', texto: 'Fim da amostra.' }],
    },
  ],
}
