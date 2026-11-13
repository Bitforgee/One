import { useMutation } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useId, useState } from 'react'
import { Link } from 'react-router'
import { useGravacao, useLeituras } from '../acao'
import { api, ErroApi } from '../api'
import { Cabecalho } from '../Cabecalho'
import { Campo, ErroDoCampo, useFocoNoPrimeiroErro } from '../Campo'
import { CampoArquivo } from '../CampoArquivo'
import { Confirmar } from '../Confirmar'
import { Editor, useSujo } from '../Editor'
import { ErroDe, errosDeCampo } from '../ErroDe'
import { dataCurta, plural } from '../formatos'
import { CelulaLargo, Detalhe, MenuAcoes, Principal, Tabela } from '../Tabela'
import { Alert } from '../ui/alert'
import { Badge } from '../ui/badge'
import { DropdownMenuItem, DropdownMenuSeparator } from '../ui/dropdown-menu'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { NativeSelect } from '../ui/native-select'
import { TableCell, TableRow } from '../ui/table'

type Item = { slug: string; nome: string; fuso: string; ativa: boolean; criadaEm: string; administradores: number }
type Contagens = { setores: number; cursos: number; categorias: number; regras: number; artigos: number }

const Fusos = [
  'America/Sao_Paulo', 'America/Noronha', 'America/Belem', 'America/Fortaleza', 'America/Recife', 'America/Araguaina', 'America/Maceio', 'America/Bahia',
  'America/Campo_Grande', 'America/Cuiaba', 'America/Santarem', 'America/Porto_Velho', 'America/Boa_Vista', 'America/Manaus', 'America/Eirunepe', 'America/Rio_Branco',
]

export const enderecoDe = (nome: string) =>
  nome
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

type Ficha = { nome: string; slug: string; slugEditado: boolean; fuso: string; adminNome: string; cpf: string; email: string }
const Nova: Ficha = { nome: '', slug: '', slugEditado: false, fuso: Fusos[0], adminNome: '', cpf: '', email: '' }
const corpo = (f: Ficha) => ({ slug: f.slug, nome: f.nome, fuso: f.fuso, admin: { cpf: f.cpf, nome: f.adminNome, email: f.email } })

function errosDaCriacao(erro: unknown): Record<string, string> {
  return erro instanceof ErroApi && erro.status === 409 ? { slug: erro.message } : errosDeCampo(erro)
}

function Formulario({ ficha, mudar, erros }: { ficha: Ficha; mudar: (parcial: Partial<Ficha>) => void; erros: Record<string, string> }) {
  const grupo = useId()
  const texto = (chave: 'adminNome' | 'cpf' | 'email') => (e: { target: { value: string } }) => mudar({ [chave]: e.target.value })
  return (
    <>
      <Campo id="nome" rotulo="Nome" autoComplete="off" value={ficha.nome} erro={erros.nome} onChange={(e) => mudar({ nome: e.target.value, ...(ficha.slugEditado ? {} : { slug: enderecoDe(e.target.value) }) })} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="endereco">Endereço</Label>
        <div className="flex items-center gap-1">
          <span aria-hidden="true">/</span>
          <Input id="endereco" name="endereco" autoComplete="off" spellCheck={false} value={ficha.slug} aria-invalid={!!erros.slug} aria-describedby={erros.slug ? 'endereco-erro' : undefined} onChange={(e) => mudar({ slug: e.target.value, slugEditado: true })} />
        </div>
        <ErroDoCampo id="endereco" erro={erros.slug} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="fuso">Fuso horário</Label>
        <NativeSelect id="fuso" className="w-full" value={ficha.fuso} onChange={(e) => mudar({ fuso: e.target.value })}>
          {Fusos.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </NativeSelect>
        <ErroDoCampo id="fuso" erro={erros.fuso} />
      </div>
      <fieldset aria-labelledby={grupo} className="flex flex-col gap-3">
        <legend id={grupo} className="mb-2 text-sm font-medium">
          Primeiro administrador
        </legend>
        <Campo id="admin-nome" rotulo="Nome" autoComplete="off" value={ficha.adminNome} erro={erros['admin.nome']} onChange={texto('adminNome')} />
        <Campo id="admin-cpf" rotulo="CPF" inputMode="numeric" autoComplete="off" spellCheck={false} placeholder="Ex.: 000.000.000-00…" value={ficha.cpf} erro={erros['admin.cpf']} onChange={texto('cpf')} />
        <Campo id="admin-email" rotulo="E-mail" type="email" autoComplete="off" spellCheck={false} value={ficha.email} erro={erros['admin.email']} onChange={texto('email')} />
      </fieldset>
    </>
  )
}

const errosDoArquivo = (erro: unknown): string[] => (erro instanceof ErroApi ? (erro.corpo?.errors?.arquivo ?? []) : [])

function ResultadoDaCarga({ r, erro }: { r?: Contagens; erro: Error | null }) {
  const erros = errosDoArquivo(erro)
  if (r)
    return (
      <Alert>
        Importados: {plural(r.setores, 'setor', 'setores')}, {plural(r.cursos, 'curso', 'cursos')}, {plural(r.categorias, 'categoria', 'categorias')}, {plural(r.regras, 'regra', 'regras')}, {plural(r.artigos, 'artigo', 'artigos')}.
      </Alert>
    )
  if (erros.length > 0)
    return (
      <Tabela colunas={[{ titulo: 'Erro' }]} itens={erros}>
        {erros.map((e, i) => (
          <TableRow key={i}>
            <TableCell className={Principal}>{e}</TableCell>
          </TableRow>
        ))}
      </Tabela>
    )
  return <ErroDe erro={erro} />
}

function ImportarCarga({ alvo, fechar }: { alvo: Item; fechar: () => void }) {
  const [arquivo, setArquivo] = useState<File>()
  const importacao = useMutation({ mutationFn: (f: FormData) => api<Contagens>(`/api/plataforma/instituicoes/${alvo.slug}/carga`, f) })

  function importar() {
    const f = new FormData()
    f.set('arquivo', arquivo!)
    importacao.mutate(f)
  }

  return (
    <Editor
      titulo={`Importar carga: ${alvo.nome}`}
      aberto
      sujo={!!arquivo}
      fechar={fechar}
      salvar={importar}
      botao="Importar"
      pendente={importacao.isPending}
      desabilitado={!arquivo}
      alerta={<ResultadoDaCarga r={importacao.data} erro={importacao.error} />}
    >
      <CampoArquivo id="carga" rotulo="Arquivo de carga (JSON)" accept=".json,application/json" multiple={false} arquivos={arquivo ? [arquivo] : []} setArquivos={([a]) => setArquivo(a)} />
    </Editor>
  )
}

const Colunas = [{ titulo: 'Nome' }, { titulo: 'Situação' }, { titulo: 'Administradores', largo: true }, { titulo: 'Criada em', largo: true }, { titulo: '' }]

function Linha({ i, importar, desativar, agir, pendente }: { i: Item; importar: () => void; desativar: () => void; agir: (aviso: string | ((r: unknown) => string), url: string) => void; pendente: boolean }) {
  const criada = dataCurta(i.criadaEm, i.fuso)
  return (
    <TableRow>
      <TableCell className={`font-medium ${Principal}`}>
        {i.nome}
        <div translate="no" className="text-xs font-normal text-muted-foreground">/{i.slug}</div>
        <Detalhe>
          {plural(i.administradores, 'administrador', 'administradores')} · criada em {criada}
        </Detalhe>
      </TableCell>
      <TableCell data-celula="selo">{i.ativa ? <Badge className="bg-accent text-foreground">Ativa</Badge> : <Badge variant="secondary">Desativada</Badge>}</TableCell>
      <CelulaLargo>{i.administradores}</CelulaLargo>
      <CelulaLargo>{criada}</CelulaLargo>
      <TableCell data-celula="acoes" className="text-end">
        <MenuAcoes nome={i.nome} pendente={pendente}>
          <DropdownMenuItem onSelect={importar}>Importar carga</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => agir((r) => `Enviamos o link para ${(r as { enviados: number }).enviados} administrador(es).`, `${i.slug}/reenviar-acesso`)}>Reenviar acesso do admin</DropdownMenuItem>
          {i.ativa ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={desativar}>
                Desativar
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onSelect={() => agir('Instituição reativada.', `${i.slug}/reativar`)}>Reativar</DropdownMenuItem>
          )}
        </MenuAcoes>
      </TableCell>
    </TableRow>
  )
}

function useCriacao(recarregar: () => Promise<unknown>) {
  const [nova, setNova] = useState<Ficha>()
  const [criada, setCriada] = useState<Ficha>()
  const mutacao = useMutation({
    mutationFn: (f: Ficha) => api('/api/plataforma/instituicoes', corpo(f)),
    onSuccess: async (_, f) => {
      setNova(undefined)
      setCriada(f)
      await recarregar()
    },
  })
  const campos = errosDaCriacao(mutacao.error)
  const geral = Object.keys(campos).length === 0 ? mutacao.error : null
  const abrir = () => {
    mutacao.reset()
    setNova({ ...Nova })
  }
  return { nova, setNova, criada, mutacao, campos, geral, abrir }
}

const AvisoDeCriacao = ({ criada }: { criada: Ficha }) => (
  <Alert>
    <div>
      Instituição {criada.nome} criada. Enviamos o link de primeiro acesso para {criada.email}. <Link to={`/${criada.slug}`} translate="no">/{criada.slug}</Link>
    </div>
  </Alert>
)

export function Instituicoes() {
  const { dados, erro, recarregar } = useLeituras<{ lista: Item[] }>({ lista: '/api/plataforma/instituicoes' })
  const criacao = useCriacao(recarregar)
  const sujo = useSujo(criacao.nova)
  useFocoNoPrimeiroErro(criacao.mutacao.error)
  const [carga, setCarga] = useState<Item>()
  const [desativar, setDesativar] = useState<Item>()
  const acao = useGravacao(recarregar)

  const agir = (aviso: string | ((r: unknown) => string), url: string) => acao.mutate({ chamar: () => api(`/api/plataforma/instituicoes/${url}`, {}), aviso })
  const confirmarDesativar = () => {
    const i = desativar!
    setDesativar(undefined)
    agir(`Instituição ${i.nome} desativada.`, `${i.slug}/desativar`)
  }

  return (
    <div className="flex flex-col gap-2">
      <Cabecalho botao="Nova instituição" Icone={Plus} aoClicar={criacao.abrir} />
      <ErroDe erro={erro} oque="as instituições" tentar={recarregar} />
      <ErroDe erro={acao.error} />
      {criacao.criada && <AvisoDeCriacao criada={criacao.criada} />}
      <Tabela colunas={Colunas} itens={dados?.lista} erro={erro}>
        {dados?.lista.map((i) => (
          <Linha key={i.slug} i={i} importar={() => setCarga(i)} desativar={() => setDesativar(i)} agir={agir} pendente={acao.isPending} />
        ))}
      </Tabela>

      <Editor
        sujo={sujo}
        titulo="Nova instituição"
        aberto={!!criacao.nova}
        fechar={() => criacao.setNova(undefined)}
        salvar={() => criacao.mutacao.mutate(criacao.nova!)}
        botao="Criar"
        pendente={criacao.mutacao.isPending}
        alerta={<ErroDe erro={criacao.geral} />}
      >
        {criacao.nova && <Formulario ficha={criacao.nova} mudar={(p) => criacao.setNova((f) => f && { ...f, ...p })} erros={criacao.campos} />}
      </Editor>

      {carga && <ImportarCarga key={carga.slug} alvo={carga} fechar={() => setCarga(undefined)} />}

      <Confirmar aberto={!!desativar} fechar={() => setDesativar(undefined)} titulo="Desativar instituição" botao="Desativar" destrutivo confirmar={confirmarDesativar}>
        Desativar {desativar?.nome}? Ninguém dessa instituição consegue entrar até você reativar.
      </Confirmar>
    </div>
  )
}
