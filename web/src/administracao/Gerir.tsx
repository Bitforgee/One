import { ChevronRight } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { destinosDaGerir, Grupos } from '../Autenticado'
import { telaInicial, useSessao } from '../sessao'

const Linha = 'flex h-[52px] w-full items-center gap-3 px-4 text-start text-base hover:bg-accent focus-visible:bg-accent focus-visible:outline-none'

export function Gerir() {
  const { me } = useSessao()
  const { slug } = useParams()
  const itens = destinosDaGerir(me.papeis)
  if (itens.length === 0) return <Navigate to={`/${slug}/${telaInicial(me)}`} replace />
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {Grupos.map((grupo) => ({ grupo, doGrupo: itens.filter((i) => i.grupo === grupo) }))
        .filter(({ doGrupo }) => doGrupo.length > 0)
        .map(({ grupo, doGrupo }) => (
          <section key={grupo} className="flex flex-col gap-2">
            <h2 className="m-0 text-sm font-medium text-muted-foreground">{grupo}</h2>
            <ul className="m-0 flex list-none flex-col divide-y rounded-md border p-0">
              {doGrupo.map(({ caminho, rotulo, Icone }) => (
                <li key={caminho}>
                  <Link to={`/${slug}/${caminho}`} className={Linha}>
                    <Icone aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
                    <span className="flex-1">{rotulo}</span>
                    <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  )
}
