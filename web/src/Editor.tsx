import type { ReactNode } from 'react'
import { BotaoAcao } from './acao'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'

// Diálogo de edição: o formulário, o Alert de erro da gravação e o botão com Spinner.
export function Editor({ titulo, aberto, fechar, salvar, pendente, alerta, botao = 'Salvar', desabilitado, children }: {
  titulo: string; aberto: boolean; fechar: () => void; salvar: () => void; pendente: boolean; alerta: ReactNode; botao?: string; desabilitado?: boolean; children: ReactNode
}) {
  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && fechar()}>
      <DialogContent aria-describedby={undefined} className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <form
          className="contents"
          onSubmit={(e) => {
            e.preventDefault()
            salvar()
          }}
        >
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
          </DialogHeader>
          {children}
          {alerta}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={fechar}>
              Cancelar
            </Button>
            <BotaoAcao type="submit" pendente={pendente} disabled={desabilitado}>
              {botao}
            </BotaoAcao>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
