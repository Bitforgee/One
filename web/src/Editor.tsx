import { useState, type FormEvent, type ReactNode } from 'react'
import { BotaoAcao } from './acao'
import { Confirmar } from './Confirmar'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle } from './ui/sheet'
import { useConsulta } from './ui/use-mobile'
import { XIcon } from 'lucide-react'

type Props = { titulo: string; aberto: boolean; fechar: () => void; salvar: () => void; pendente: boolean; alerta: ReactNode; botao?: string; desabilitado?: boolean; largo?: boolean; acoes?: ReactNode; bloqueado?: boolean; semCancelar?: boolean; sujo?: boolean; children: ReactNode }

export function useSujo<T>(valor: T | undefined, chave: (v: T) => string = (v) => JSON.stringify(v)) {
  const [inicial, setInicial] = useState<string>()
  const atual = valor === undefined ? undefined : chave(valor)
  if (atual === undefined ? inicial !== undefined : inicial === undefined) setInicial(atual)
  return atual !== undefined && inicial !== undefined && atual !== inicial
}

function DescartarAlteracoes({ aberto, continuar, descartar }: { aberto: boolean; continuar: () => void; descartar: () => void }) {
  return (
    <Confirmar aberto={aberto} fechar={continuar} titulo="Descartar alterações?" botao="Descartar" voltar="Continuar editando" destrutivo confirmar={descartar}>
      O que você digitou e ainda não salvou será perdido.
    </Confirmar>
  )
}

function Botoes({ fechar, pendente, botao, desabilitado, cheios, acoes, semCancelar }: Pick<Props, 'fechar' | 'pendente' | 'desabilitado' | 'acoes' | 'semCancelar'> & { botao: string; cheios?: boolean }) {
  const c = cheios ? 'flex-1' : undefined
  return (
    <>
      {acoes}
      {!semCancelar && (
        <Button type="button" variant="outline" className={c} onClick={fechar}>
          Cancelar
        </Button>
      )}
      <BotaoAcao type="submit" className={c} pendente={pendente} disabled={desabilitado}>
        {botao}
      </BotaoAcao>
    </>
  )
}

export function Editor({ sujo, ...props }: Props) {
  const [descartando, setDescartando] = useState(false)
  const pedirFechar = () => (sujo ? setDescartando(true) : props.fechar())
  return (
    <>
      <Painel {...props} fechar={pedirFechar} />
      <DescartarAlteracoes aberto={descartando && props.aberto} continuar={() => setDescartando(false)} descartar={() => { setDescartando(false); props.fechar() }} />
    </>
  )
}

function Painel({ titulo, aberto, fechar, salvar, pendente, alerta, botao = 'Salvar', desabilitado, largo, acoes, bloqueado, semCancelar, children }: Omit<Props, 'sujo'>) {
  const celular = useConsulta('(max-width: 767px)')
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    salvar()
  }
  const aoMudar = (a: boolean) => !a && !bloqueado && fechar()
  if (celular)
    return (
      <Sheet open={aberto} onOpenChange={aoMudar}>
        <SheetContent side="bottom" showCloseButton={false} aria-describedby={undefined} className="inset-y-0 h-dvh gap-0 rounded-none data-[state=open]:duration-200 data-[state=closed]:duration-150">
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={enviar}>
            <SheetHeader className="shrink-0 flex-row items-center justify-between gap-2 border-b py-1 pt-[calc(0.25rem+env(safe-area-inset-top))] pl-4 pr-1">
              <SheetTitle className="text-base">{titulo}</SheetTitle>
              <SheetClose hidden={bloqueado} className="flex size-11 shrink-0 items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden">
                <XIcon className="size-4" aria-hidden="true" />
                <span className="sr-only">Fechar</span>
              </SheetClose>
            </SheetHeader>
            <div data-slot="editor-corpo" className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
              {children}
              {alerta}
            </div>
            <SheetFooter className="mt-0 shrink-0 flex-row flex-wrap border-t pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <Botoes fechar={fechar} pendente={pendente} botao={botao} desabilitado={desabilitado} acoes={acoes} semCancelar={semCancelar} cheios />
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    )
  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent aria-describedby={undefined} showCloseButton={!bloqueado} className={`max-h-[calc(100dvh-2rem)] overflow-y-auto ${largo ? 'sm:max-w-5xl' : ''}`}>
        <form className="contents" onSubmit={enviar}>
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
          </DialogHeader>
          {children}
          {alerta}
          <DialogFooter className="flex-wrap">
            <Botoes fechar={fechar} pendente={pendente} botao={botao} desabilitado={desabilitado} acoes={acoes} semCancelar={semCancelar} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
