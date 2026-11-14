import { Link, useParams } from 'react-router'
import { useLeituras } from '../../acao'
import { Carregando } from '../../Carregando'
import { ErroDe } from '../../ErroDe'
import type { Categoria, Curso, Fluxo, Setor } from '../comum'
import { semLideranca } from '../comum'
import { EdicaoDoFluxo } from './EdicaoDoFluxo'

type Listas = { setores: Setor[]; categorias: Categoria[]; cursos: Curso[]; fluxos: Fluxo[] }

export function PaginaDoFluxo() {
  const { slug, id } = useParams()
  const { dados, erro, recarregar } = useLeituras<Listas>({
    setores: '/api/admin/setores',
    categorias: '/api/admin/categorias',
    cursos: '/api/admin/cursos',
    fluxos: '/api/admin/fluxos',
  })
  if (erro && !dados) return <ErroDe erro={erro} oque="o fluxo" tentar={() => void recarregar()} />
  if (!dados) return <Carregando />
  const fluxo = /^\d+$/.test(id ?? '') ? dados.fluxos.find((f) => f.id === Number(id)) : undefined
  if (!fluxo)
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="m-0">Fluxo não encontrado.</p>
        <Link to={`/${slug}/cadastros?aba=fluxos`} className="underline">
          Voltar aos fluxos
        </Link>
      </div>
    )
  return <EdicaoDoFluxo key={fluxo.id} fluxo={fluxo} categorias={dados.categorias} cursos={dados.cursos} setores={dados.setores.filter(semLideranca)} recarregar={recarregar} />
}