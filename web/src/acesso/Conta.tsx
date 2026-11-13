import { ChevronRight, KeyRound, LogOut, Palette, Phone, Bell } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { DialogoDeContato, temContato, useAparencia } from '../aparencia'
import { useAvisos } from '../AvisosPush'
import { OpcoesDeTema, papelDe } from '../Autenticado'
import { useSair, useSessao } from '../sessao'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { useTheme } from '../ui/theme-provider'

const NomesDeTema = { light: 'Claro', dark: 'Escuro', black: 'Preto', system: 'Sistema' }
const Linha = 'flex h-[52px] w-full items-center gap-3 px-4 text-start text-base hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'

function Conteudo({ Icone, rotulo, valor }: { Icone: ComponentType<{ className?: string; 'aria-hidden'?: 'true' }>; rotulo: string; valor?: ReactNode }) {
  return (
    <>
      <Icone aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
      <span className="flex-1">{rotulo}</span>
      {valor ? <span className="text-muted-foreground">{valor}</span> : <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />}
    </>
  )
}

export function Conta() {
  const { me } = useSessao()
  const { slug } = useParams()
  const { theme } = useTheme()
  const avisos = useAvisos()
  const sair = useSair()
  const contato = useAparencia(slug, me.instituicao.nome).contato
  const [temaAberto, setTemaAberto] = useState(false)
  const [contatoAberto, setContatoAberto] = useState(false)
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <p className="m-0 text-base font-medium">{me.nome}</p>
        <p translate="no" className="m-0 text-sm text-muted-foreground">{me.cpfMascarado}</p>
        <p className="m-0 text-sm text-muted-foreground">{papelDe(me.papeis)}</p>
      </div>
      <ul className="m-0 flex list-none flex-col divide-y rounded-md border p-0">
        <li>
          <Popover open={temaAberto} onOpenChange={setTemaAberto}>
            <PopoverTrigger asChild>
              <button type="button" className={Linha}>
                <Conteudo Icone={Palette} rotulo="Tema" valor={NomesDeTema[theme]} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="flex w-40 flex-col p-1">
              <OpcoesDeTema aoEscolher={() => setTemaAberto(false)} />
            </PopoverContent>
          </Popover>
        </li>
        {avisos.disponivel && me.papeis.includes('ALUNO') && (
          <li>
            <button type="button" className={Linha} disabled={avisos.ocupado} onClick={avisos.alternar}>
              <Conteudo Icone={Bell} rotulo="Avisos no celular" valor={avisos.inscrito ? 'Ativados' : 'Desativados'} />
            </button>
          </li>
        )}
        {temContato(contato) && (
          <li>
            <button type="button" className={Linha} onClick={() => setContatoAberto(true)}>
              <Conteudo Icone={Phone} rotulo="Contato do atendimento" />
            </button>
          </li>
        )}
        <li>
          <Link to={`/${slug}/trocar-senha`} className={Linha}>
            <Conteudo Icone={KeyRound} rotulo="Trocar senha" />
          </Link>
        </li>
        <li>
          <button type="button" className={`${Linha} text-destructive`} onClick={sair}>
            <LogOut aria-hidden="true" className="size-5 shrink-0" />
            <span className="flex-1">Sair</span>
          </button>
        </li>
      </ul>
      <DialogoDeContato contato={contato} aberto={contatoAberto} aoMudar={setContatoAberto} />
    </div>
  )
}
