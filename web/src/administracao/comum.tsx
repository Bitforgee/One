export type Id = { id: number }
export type Setor = Id & { nome: string; triagem: boolean; ativo: boolean }
export type Categoria = Id & { nome: string; ativa: boolean; padrao: boolean }
export type Curso = Id & { nome: string; setorCoordenacaoId: number | null }
export type Destino = 'SETOR' | 'COORDENACAO_CURSO' | 'LIDERANCA_SEMESTRE'
export type Etapa = { destino: Destino; setorId: number | null; prazoHoras: number | null; x: number | null; y: number | null }
export type VersaoDoFluxo = { numero: number; etapas: Etapa[] }
export type Fluxo = Id & { categoriaId: number; cursoId: number | null; semestre: number | null; vigente: VersaoDoFluxo | null; rascunho: VersaoDoFluxo | null }

// Os rótulos fixos (fluxos-atendimento ## Checks): o tipo de destino na lista, no simulador e no Detalhe.
export const Destinos: [Destino, string][] = [
  ['SETOR', 'Setor fixo'],
  ['COORDENACAO_CURSO', 'Coordenação do curso'],
  ['LIDERANCA_SEMESTRE', 'Liderança do semestre'],
]
export const SemestresDe1a12 = Array.from({ length: 12 }, (_, i) => i + 1)

// `Setor {nome}`, `Coordenação do curso` ou `Liderança do semestre`, com ` ({N} h)` quando a etapa tem prazo.
export function rotuloDaEtapa(e: Etapa, setores: Setor[]) {
  const base = e.destino === 'SETOR' ? `Setor ${setores.find((s) => s.id === e.setorId)?.nome ?? '—'}` : Destinos.find(([d]) => d === e.destino)![1]
  return e.prazoHoras ? `${base} (${e.prazoHoras} h)` : base
}

export const cadeiaDoFluxo = (v: VersaoDoFluxo | null, setores: Setor[]) => (v ? v.etapas.map((e) => rotuloDaEtapa(e, setores)).join(' → ') : 'sem versão publicada')

// `Todos os cursos`, `{curso}` ou `{curso}, {N}º semestre`.
export function abrangenciaDoFluxo(f: Pick<Fluxo, 'cursoId' | 'semestre'>, cursos: Curso[]) {
  if (f.cursoId === null) return 'Todos os cursos'
  const curso = cursos.find((c) => c.id === f.cursoId)?.nome ?? '—'
  return f.semestre === null ? curso : `${curso}, ${f.semestre}º semestre`
}export type Pronta = Id & { setorId: number; titulo: string; texto: string }
export type Usuario = Id & { cpf: string; nome: string; email: string; ativo: boolean; deveTrocarSenha: boolean; papeis: string[]; setores: number[] }

// 12345678909 -> 123.456.789-09; o que não tem 11 dígitos fica como veio.
export const cpfFormatado = (cpf: string) => (/^\d{11}$/.test(cpf) ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : cpf)
