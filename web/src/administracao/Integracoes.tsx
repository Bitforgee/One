import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { api } from '../api'
import { Button } from '../ui/button'
import { NativeSelect } from '../ui/native-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { AbaIntegracao, type Estado } from './AbaIntegracao'
import { ConteudoMcp, type Dados } from './Mcp'
import { FormularioMoodle, type Plataforma } from './Moodle'

const Abas = ['moodle', 'mcp'] as const
type Aba = (typeof Abas)[number]
const Titulos: Record<Aba, string> = { moodle: 'Moodle', mcp: 'MCP' }

const abaPedida = (valor: string | null): Aba => (Abas.includes(valor as Aba) ? (valor as Aba) : 'moodle')

const Indisponivel: Estado = { texto: 'Indisponível', bom: false }

function estadoDoMoodle(p: Plataforma): Estado {
  if (!p.configurada) return { texto: 'Não configurado', bom: false }
  return p.ativa ? { texto: 'Ativo', bom: true } : { texto: 'Desativado', bom: false }
}

function estadoDoMcp(d: Dados): Estado {
  const ativos = d.tokens.filter((t) => t.estado === 'ATIVO').length
  if (ativos === 0) return { texto: 'Sem tokens ativos', bom: false }
  return { texto: ativos === 1 ? '1 token ativo' : `${ativos} tokens ativos`, bom: true }
}

function useEstados(): Record<Aba, Estado | undefined> {
  const moodle = useQuery({ queryKey: ['moodle-admin'], queryFn: () => api<Plataforma>('/api/admin/moodle') })
  const mcp = useQuery({ queryKey: ['mcp-admin'], queryFn: () => api<Dados>('/api/admin/mcp') })
  return {
    moodle: moodle.error ? Indisponivel : moodle.data && estadoDoMoodle(moodle.data),
    mcp: mcp.error ? Indisponivel : mcp.data && estadoDoMcp(mcp.data),
  }
}

function Navegacao({ estados }: { estados: Record<Aba, Estado | undefined> }) {
  return (
    <TabsList className="hidden h-auto w-56 shrink-0 flex-col items-stretch gap-0.5 self-start bg-transparent p-0 @4xl/main:flex">
      {Abas.map((k) => (
        <div key={k} className="relative">
          <TabsTrigger value={k} aria-describedby={estados[k] ? `estado-${k}` : undefined} className={`w-full flex-none justify-start px-3 data-[state=active]:bg-accent data-[state=active]:shadow-none ${estados[k] ? 'h-14 items-start pt-2' : 'h-9'}`}>
            {Titulos[k]}
          </TabsTrigger>
          {estados[k] && (
            <span id={`estado-${k}`} className="pointer-events-none absolute start-3 bottom-2 text-xs text-muted-foreground">
              {estados[k].texto}
            </span>
          )}
        </div>
      ))}
    </TabsList>
  )
}

function PainelMcp({ estado }: { estado?: Estado }) {
  const [novo, setNovo] = useState(false)
  return (
    <AbaIntegracao<Dados>
      titulo="MCP"
      estado={estado}
      acao={<Button onClick={() => setNovo(true)}>Novo token</Button>}
      introducao="Conecte a IA que você já usa (Claude Code, Cursor) aos chamados, à base de conhecimento e aos indicadores do One. O acesso é só de leitura e segue o seu papel."
      oque="a integração com o MCP"
      chave="mcp-admin"
      url="/api/admin/mcp"
    >
      {(dados) => <ConteudoMcp dados={dados} novo={novo} abrirNovo={() => setNovo(true)} fecharNovo={() => setNovo(false)} />}
    </AbaIntegracao>
  )
}

export function Integracoes() {
  const [params, setParams] = useSearchParams()
  const aba = abaPedida(params.get('aba'))
  const estados = useEstados()
  const escolher = (k: string) => setParams({ aba: k })
  return (
    <Tabs orientation="vertical" value={aba} onValueChange={escolher} className="gap-4 @4xl/main:flex-row @4xl/main:gap-8" data-aba-ativa={params.get('aba') ?? ''}>
      <div className="@4xl/main:hidden">
        <NativeSelect aria-label="Integração" className="w-full min-w-0" value={aba} onChange={(e) => escolher(e.target.value)}>
          {Abas.map((k) => (
            <option key={k} value={k}>
              {estados[k] ? `${Titulos[k]} · ${estados[k].texto}` : Titulos[k]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <Navegacao estados={estados} />
      <TabsContent value="moodle" className="flex min-w-0 max-w-2xl flex-1 flex-col gap-4">
        <AbaIntegracao<Plataforma>
          titulo="Moodle"
          estado={estados.moodle}
          introducao="Alunos que entram pela atividade One no Moodle chegam ao assistente sem digitar CPF nem senha. A equipe continua entrando com CPF e senha."
          oque="a integração com o Moodle"
          chave="moodle-admin"
          url="/api/admin/moodle"
        >
          {(dados) => <FormularioMoodle dados={dados} />}
        </AbaIntegracao>
      </TabsContent>
      <TabsContent value="mcp" className="flex min-w-0 max-w-4xl flex-1 flex-col gap-4">
        <PainelMcp estado={estados.mcp} />
      </TabsContent>
    </Tabs>
  )
}
