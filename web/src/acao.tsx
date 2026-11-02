import { useState, type ReactNode } from 'react'
import { Alert, Button, Spinner, type ButtonProps } from 'react-bootstrap'

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
    <Alert variant="danger" className="mt-3">
      {erro}
    </Alert>
  ) : null
  return { pendente, erro, alerta, executar }
}

export function BotaoAcao({ pendente, children, ...props }: ButtonProps & { pendente: boolean; children: ReactNode }) {
  return (
    <Button {...props} disabled={pendente || props.disabled}>
      {pendente && <Spinner as="span" animation="border" size="sm" role="status" aria-label="Carregando" className="me-2" />}
      {children}
    </Button>
  )
}
