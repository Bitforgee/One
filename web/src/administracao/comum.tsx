import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Button, Form, Modal, Spinner, Stack } from 'react-bootstrap'
import { BotaoAcao, useAcao } from '../acao'
import { api } from '../api'

export type Id = { id: number }
export type Setor = Id & { nome: string; triagem: boolean; ativo: boolean }
export type Categoria = Id & { nome: string; ativa: boolean; padrao: boolean }
export type Curso = Id & { nome: string; setorCoordenacaoId: number | null }
export type Regra = Id & { categoriaId: number; destino: 'SETOR' | 'COORDENACAO_CURSO'; setorId: number | null }
export type Pronta = Id & { setorId: number; titulo: string; texto: string }
export type Usuario = Id & { cpf: string; nome: string; email: string; ativo: boolean; deveTrocarSenha: boolean; papeis: string[]; setores: number[] }

// Lê as listas que a tela usa e recarrega depois de cada gravação.
export function useListas<T extends Record<string, unknown[]>>(urls: Record<keyof T, string>) {
  const [dados, setDados] = useState<T>()
  const carga = useAcao()
  const carregar = useCallback(
    () =>
      carga.executar(async () => {
        const entradas = await Promise.all(Object.entries(urls).map(async ([k, url]) => [k, await api(url as string)] as const))
        setDados(Object.fromEntries(entradas) as T)
      }),
    // as urls são constantes de cada tela
    [],
  )
  useEffect(() => void carregar(), [carregar])
  return { dados, carregar, carga }
}

// Modal de edição com o Alert de erro da gravação e o botão com Spinner.
export function Editor({ titulo, aberto, fechar, salvar, pendente, alerta, children }: {
  titulo: string; aberto: boolean; fechar: () => void; salvar: () => void; pendente: boolean; alerta: ReactNode; children: ReactNode
}) {
  return (
    <Modal show={aberto} onHide={fechar}>
      <Form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          salvar()
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>{titulo}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {children}
          {alerta}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={fechar}>
            Cancelar
          </Button>
          <BotaoAcao type="submit" pendente={pendente}>
            Salvar
          </BotaoAcao>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

export function Vazio({ itens }: { itens?: unknown[] }) {
  if (!itens) return <Spinner animation="border" role="status" aria-label="Carregando" />
  return itens.length === 0 ? <p className="text-body-secondary">Nenhum item cadastrado.</p> : null
}

export function Cabecalho({ titulo, novo }: { titulo: string; novo: () => void }) {
  return (
    <Stack direction="horizontal" className="mb-3 flex-wrap gap-2">
      <h1 className="h4 me-auto mb-0">{titulo}</h1>
      <Button onClick={novo}>
        <i className="bi bi-plus-lg me-1" aria-hidden="true" />
        Novo
      </Button>
    </Stack>
  )
}
