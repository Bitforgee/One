import { useState, type ComponentProps, type ReactNode } from 'react'
import { Alert as BsAlert, Button as BsButton, Spinner as BsSpinner, type ButtonProps as BsButtonProps } from 'react-bootstrap'
import { Button } from './ui/button'
import { Spinner } from './ui/spinner'

// Botão de uma ação da tela: pendente mostra o Spinner e desabilita.
export function BotaoAcao({ pendente, children, ...props }: ComponentProps<typeof Button> & { pendente: boolean }) {
  return (
    <Button {...props} disabled={pendente || props.disabled}>
      {pendente && <Spinner />}
      {children}
    </Button>
  )
}

// Legado: sai com a última tela em react-bootstrap (S8).

// Estado de uma ação da tela: pendente (Spinner e botão desabilitado) e erro (detail num Alert).
export function useAcao() {
  const [pendente, setPendente] = useState(false)
  const [erro, setErro] = useState<string>()
  async function executar(fn: () => Promise<void>) {
    setPendente(true)
    setErro(undefined)
    try {
      await fn()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir a requisição.')
    } finally {
      setPendente(false)
    }
  }
  const alerta = erro ? (
    <BsAlert variant="danger" className="mt-3">
      {erro}
    </BsAlert>
  ) : null
  return { pendente, erro, alerta, executar }
}

export function BotaoBs({ pendente, children, ...props }: BsButtonProps & { pendente: boolean; children: ReactNode }) {
  return (
    <BsButton {...props} disabled={pendente || props.disabled}>
      {pendente && <BsSpinner as="span" animation="border" size="sm" role="status" aria-label="Carregando" className="me-2" />}
      {children}
    </BsButton>
  )
}
