import { useMutation, useQueryClient } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { BotaoAcao } from '../acao'
import { api } from '../api'
import { Confirmar } from '../Confirmar'
import { formatarData } from '../datas'
import { ErroDe, errosDeCampo } from '../ErroDe'
import { useSessao } from '../sessao'
import { CelulaLargo, Detalhe, Principal, Tabela } from '../Tabela'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { NativeSelect, NativeSelectOption } from '../ui/native-select'
import { TableCell, TableRow } from '../ui/table'
import { Url } from './Moodle'

type Item = { id: number; nome: string; usuario: string; final: string; criadoEm: string; expiraEm: string; ultimoUsoEm: string | null; estado: 'ATIVO' | 'EXPIRADO' | 'REVOGADO' }
export type Dados = { url: string; tokens: Item[] }
type Criado = { id: number; nome: string; token: string; final: string; criadoEm: string; expiraEm: string }

const Validades = [30, 90, 365]
const Colunas = [{ titulo: 'Nome' }, { titulo: 'Dono', largo: true }, { titulo: 'Final', largo: true }, { titulo: 'Criado', largo: true }, { titulo: 'Vence', largo: true }, { titulo: 'Último uso', largo: true }, { titulo: 'Estado' }, { titulo: '' }]
const Vazio = { Icone: KeyRound, frase: 'Nenhum token ainda.' }

const comandoClaude = (url: string, token: string) => `claude mcp add --transport http one ${url} --header "Authorization: Bearer ${token}"`
const jsonDoCliente = (url: string, token: string) => JSON.stringify({ mcpServers: { one: { url, headers: { Authorization: `Bearer ${token}` } } } })

function LinhaDoToken({ t, fuso, revogar }: { t: Item; fuso: string; revogar: () => void }) {
  const criado = formatarData(t.criadoEm, fuso).slice(0, 10)
  const vence = formatarData(t.expiraEm, fuso).slice(0, 10)
  const uso = t.ultimoUsoEm ? formatarData(t.ultimoUsoEm, fuso) : 'Nunca'
  return (
    <TableRow>
      <TableCell className={`font-medium ${Principal}`}>
        {t.nome}
        <Detalhe>{`${t.usuario} · …${t.final} · vence ${vence} · último uso: ${uso}`}</Detalhe>
      </TableCell>
      <CelulaLargo>{t.usuario}</CelulaLargo>
      <CelulaLargo>
        <code>…{t.final}</code>
      </CelulaLargo>
      <CelulaLargo>{criado}</CelulaLargo>
      <CelulaLargo>{vence}</CelulaLargo>
      <CelulaLargo>{uso}</CelulaLargo>
      <TableCell data-celula="selo">
        <Badge variant={t.estado === 'ATIVO' ? 'default' : 'secondary'}>{t.estado}</Badge>
      </TableCell>
      <TableCell data-celula="acoes" className="text-end">
        {t.estado === 'ATIVO' && (
          <Button variant="outline" size="sm" aria-label={`Revogar ${t.nome}`} onClick={revogar}>
            Revogar
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}

function TokenCriado({ url, criado, fechar }: { url: string; criado: Criado; fechar: () => void }) {
  return (
    <section aria-label="Token criado" className="flex flex-col gap-3 rounded-md border border-primary p-4">
      <p className="m-0 text-sm font-medium">Copie agora: o token não será mostrado de novo.</p>
      <Url rotulo="Token" valor={criado.token} />
      <Url rotulo="Comando do Claude Code" valor={comandoClaude(url, criado.token)} />
      <Button type="button" variant="outline" className="self-start" onClick={fechar}>
        Fechar
      </Button>
    </section>
  )
}

function NovoToken({ url }: { url: string }) {
  const cliente = useQueryClient()
  const [nome, setNome] = useState('')
  const [dias, setDias] = useState(90)
  const [criado, setCriado] = useState<Criado>()
  const criar = useMutation({
    mutationFn: () => api<Criado>('/api/admin/mcp/tokens', { nome, dias }),
    onSuccess: async (novo) => {
      setCriado(novo)
      setNome('')
      await cliente.invalidateQueries({ queryKey: ['mcp-admin'] })
    },
  })
  const erros = errosDeCampo(criar.error)
  return (
    <section aria-labelledby="mcp-novo" className="flex flex-col gap-3">
      <h2 id="mcp-novo" className="text-base font-semibold">
        Novo token
      </h2>
      {criado && <TokenCriado url={url} criado={criado} fechar={() => setCriado(undefined)} />}
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          criar.mutate()
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="mcp-nome">Nome</Label>
          <Input id="mcp-nome" value={nome} aria-invalid={!!erros.nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Cursor no meu notebook" />
          {erros.nome && <p className="m-0 text-sm text-destructive">{erros.nome}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="mcp-validade">Validade</Label>
          <NativeSelect id="mcp-validade" value={dias} aria-invalid={!!erros.dias} onChange={(e) => setDias(Number(e.target.value))}>
            {Validades.map((v) => (
              <NativeSelectOption key={v} value={v}>
                {v} dias
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {erros.dias && <p className="m-0 text-sm text-destructive">{erros.dias}</p>}
        </div>
        <ErroDe erro={criar.error} campos={['nome', 'dias']} />
        <BotaoAcao type="submit" pendente={criar.isPending} className="self-start">
          Criar token
        </BotaoAcao>
      </form>
    </section>
  )
}

function ComoConectar({ url }: { url: string }) {
  return (
    <section aria-labelledby="mcp-conectar" className="flex flex-col gap-3">
      <h2 id="mcp-conectar" className="text-base font-semibold">
        Como conectar
      </h2>
      <Url rotulo="Claude Code" valor={comandoClaude(url, '<seu-token>')} />
      <Url rotulo="Cursor e outros clientes (mcp.json)" valor={jsonDoCliente(url, '<seu-token>')} />
      <p className="m-0 text-sm text-muted-foreground">Claude.ai e ChatGPT na web ainda não conectam: pedem OAuth.</p>
    </section>
  )
}

export function ConteudoMcp({ dados }: { dados: Dados }) {
  const cliente = useQueryClient()
  const { me } = useSessao()
  const [revogando, setRevogando] = useState<Item>()
  const revogar = useMutation({
    mutationFn: (id: number) => api(`/api/admin/mcp/tokens/${id}`, undefined, 'DELETE'),
    onSuccess: async () => {
      toast.success('Token revogado.')
      await cliente.invalidateQueries({ queryKey: ['mcp-admin'] })
    },
  })
  return (
    <div className="flex flex-col gap-8">
      <Url rotulo="URL do servidor" valor={dados.url} />
      <section aria-labelledby="mcp-tokens" className="flex flex-col gap-3">
        <h2 id="mcp-tokens" className="text-base font-semibold">
          Tokens
        </h2>
        <ErroDe erro={revogar.error} />
        <Tabela colunas={Colunas} itens={dados.tokens} vazio={Vazio}>
          {dados.tokens.map((t) => (
            <LinhaDoToken key={t.id} t={t} fuso={me.instituicao.fuso} revogar={() => setRevogando(t)} />
          ))}
        </Tabela>
      </section>
      <NovoToken url={dados.url} />
      <ComoConectar url={dados.url} />
      <Confirmar
        aberto={!!revogando}
        fechar={() => setRevogando(undefined)}
        titulo={`Revogar o token «${revogando?.nome}»?`}
        botao="Revogar"
        voltar="Cancelar"
        destrutivo
        confirmar={() => {
          revogar.mutate(revogando!.id)
          setRevogando(undefined)
        }}
      >
        Quem usa este token perde o acesso na próxima requisição. Isso não pode ser desfeito.
      </Confirmar>
    </div>
  )
}
