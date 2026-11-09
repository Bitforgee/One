import type { Imagens } from '../aparencia'

export type Tipo = keyof Imagens
export type Campo = { chave: string; rotulo: string; area?: boolean; dica?: string; limite?: number }
export type IdAba = 'marca' | 'app' | 'login' | 'assistente' | 'contato'
export type Aba = { id: IdAba; titulo: string; campos: Campo[]; imagens: Tipo[]; nota?: string }

export const Rotulos: Record<Tipo, [string, string, string?]> = {
  logo: ['Logo', 'PNG ou JPEG, até 1 MB.'],
  icone: ['Ícone do app', 'PNG quadrado de pelo menos 512 px, até 1 MB.', 'PNG quadrado, sem transparência, com o desenho a pelo menos 10% das bordas. O Android recorta as pontas.'],
  login: ['Imagem do login', 'PNG ou JPEG, até 3 MB.'],
  assistente: ['Foto do assistente', 'PNG ou JPEG, até 1 MB.'],
}

export const LimiteDoNomeDoApp = 12

// As abas na ordem da tela; `chave` é o caminho do campo no JSON da API, que é também o nome do erro 400 (door 10 de aparencia-instituicao).
export const Abas: Aba[] = [
  { id: 'marca', titulo: 'Marca', campos: [{ chave: 'cor', rotulo: 'Cor principal' }], imagens: ['logo'] },
  {
    id: 'app',
    titulo: 'App instalado',
    campos: [{ chave: 'nomeCurto', rotulo: 'Nome do app', dica: 'Aparece embaixo do ícone no celular e na barra de tarefas. Até 12 letras.', limite: LimiteDoNomeDoApp }],
    imagens: ['icone'],
    nota: 'Quem já instalou o app pode levar um tempo para ver o nome e o ícone novos.',
  },
  {
    id: 'login',
    titulo: 'Login',
    campos: [
      { chave: 'login.titulo', rotulo: 'Título do login' },
      { chave: 'login.frase', rotulo: 'Frase do login' },
      { chave: 'login.itens', rotulo: 'Itens do login (um por linha, até 3)', area: true },
    ],
    imagens: ['login'],
  },
  {
    id: 'assistente',
    titulo: 'Assistente',
    campos: [
      { chave: 'assistente.nome', rotulo: 'Nome do assistente' },
      { chave: 'assistente.boasVindas', rotulo: 'Boas-vindas do assistente', area: true },
      { chave: 'assistente.perguntas', rotulo: 'Perguntas sugeridas (uma por linha, até 4)', area: true },
    ],
    imagens: ['assistente'],
  },
  {
    id: 'contato',
    titulo: 'Contato',
    campos: [
      { chave: 'contato.horario', rotulo: 'Horário de atendimento' },
      { chave: 'contato.telefone', rotulo: 'Telefone' },
      { chave: 'contato.email', rotulo: 'E-mail de atendimento' },
    ],
    imagens: [],
  },
]
export const Campos = Abas.flatMap((a) => a.campos)
export const EhLista = (chave: string) => chave === 'login.itens' || chave === 'assistente.perguntas'

// ?aba= desconhecido ou ausente abre a Marca (AC 4).
export const abaPedida = (pedida: string | null): IdAba => Abas.find((a) => a.id === pedida)?.id ?? 'marca'

// As abas que têm um campo ou uma imagem recusada pela API, na ordem das abas (AC 8).
export function abasComErro(campos: Record<string, string>, imagens: Partial<Record<Tipo, string>>): IdAba[] {
  return Abas.filter((a) => a.campos.some((c) => campos[c.chave]) || a.imagens.some((t) => imagens[t])).map((a) => a.id)
}
