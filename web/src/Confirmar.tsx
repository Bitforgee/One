import type { ReactNode } from 'react'
import type { Blocker } from 'react-router'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'

export function Confirmar({ aberto, fechar, titulo, botao, voltar, destrutivo, confirmar, children }: {
  aberto: boolean; fechar: () => void; titulo: string; botao: string; voltar?: string; destrutivo?: boolean; confirmar: () => void; children: ReactNode
}) {
  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && fechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{children}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={fechar}>
            {voltar ?? (destrutivo ? 'Voltar' : 'Cancelar')}
          </Button>
          <Button variant={destrutivo ? 'destructive' : 'default'} onClick={confirmar}>
            {botao}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ConfirmarSaida({ bloqueio, titulo, botao, children }: { bloqueio: Blocker; titulo: string; botao: string; children: ReactNode }) {
  return (
    <Confirmar aberto={bloqueio.state === 'blocked'} fechar={() => bloqueio.reset?.()} titulo={titulo} botao={botao} voltar="Continuar editando" destrutivo confirmar={() => bloqueio.proceed?.()}>
      {children}
    </Confirmar>
  )
}
