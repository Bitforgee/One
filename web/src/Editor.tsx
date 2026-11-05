import type { FormEvent, ReactNode } from 'react'
import { BotaoAcao } from './acao'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle } from './ui/sheet'
import { useConsulta } from './ui/use-mobile'
import { XIcon } from 'lucide-react'

type Props = { titulo: string; aberto: boolean; fechar: () => void; salvar: () => void; pendente: boolean; alerta: ReactNode; botao?: string; desabilitado?: boolean; children: ReactNode }

// Os dois botões do rodapé: "Cancelar" e a ação que envia o formulário.
function Botoes({ fechar, pendente, botao, desabilitado, cheios }: Pick<Props, 'fechar' | 'pendente' | 'desabilitado'> & { botao: string; cheios?: boolean }) {
  const c = cheios ? 'flex-1' : undefined
  return (
    <>
      <Button type="button" variant="outline" className={c} onClick={fechar}>
        Cancelar
      </Button>
      <BotaoAcao type="submit" className={c} pendente={pendente} disabled={desabilitado}>
        {botao}
      </BotaoAcao>
    </>
  )
}

// Diálogo de edição: o formulário, o Alert de erro da gravação e o botão com Spinner.
// Abaixo de 768 px é uma tela inteira (Sheet de baixo): cabeçalho com o título e o X de 44 px, corpo que rola e rodapé fixo (AC 29).
export function Editor({ titulo, aberto, fechar, salvar, pendente, alerta, botao = 'Salvar', desabilitado, children }: Props) {
  const celular = useConsulta('(max-width: 767px)')
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    salvar()
  }
  const aoMudar = (a: boolean) => !a && fechar()
  if (celular)
    return (
      <Sheet open={aberto} onOpenChange={aoMudar}>
        <SheetContent side="bottom" showCloseButton={false} aria-describedby={undefined} className="inset-y-0 h-dvh gap-0 rounded-none data-[state=open]:duration-200 data-[state=closed]:duration-150">
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={enviar}>
            <SheetHeader className="shrink-0 flex-row items-center justify-between gap-2 border-b py-1 pl-4 pr-1">
              <SheetTitle className="text-base">{titulo}</SheetTitle>
              <SheetClose className="flex size-11 shrink-0 items-center justify-center rounded-sm focus:ring-2 focus:ring-ring focus:outline-hidden">
                <XIcon className="size-4" aria-hidden="true" />
                <span className="sr-only">Fechar</span>
              </SheetClose>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
              {children}
              {alerta}
            </div>
            <SheetFooter className="mt-0 shrink-0 flex-row border-t pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <Botoes fechar={fechar} pendente={pendente} botao={botao} desabilitado={desabilitado} cheios />
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    )
  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent aria-describedby={undefined} className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <form className="contents" onSubmit={enviar}>
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
          </DialogHeader>
          {children}
          {alerta}
          <DialogFooter>
            <Botoes fechar={fechar} pendente={pendente} botao={botao} desabilitado={desabilitado} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
