export type Id = { id: number }
export type Setor = Id & { nome: string; triagem: boolean; ativo: boolean }
export type Categoria = Id & { nome: string; ativa: boolean; padrao: boolean }
export type Curso = Id & { nome: string; setorCoordenacaoId: number | null }
export type Regra = Id & { categoriaId: number; destino: 'SETOR' | 'COORDENACAO_CURSO'; setorId: number | null }
export type Pronta = Id & { setorId: number; titulo: string; texto: string }
export type Usuario = Id & { cpf: string; nome: string; email: string; ativo: boolean; deveTrocarSenha: boolean; papeis: string[]; setores: number[] }
