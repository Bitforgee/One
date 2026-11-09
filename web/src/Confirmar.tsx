import type { ReactNode } from 'react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'

export function Confirmar({ aberto, fechar, titulo, botao, voltar = 'Voltar', destrutivo, confirmar, children }: {
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
            {voltar}
          </Button>
          <Button variant={destrutivo ? 'destructive' : 'default'} onClick={confirmar}>
            {botao}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
