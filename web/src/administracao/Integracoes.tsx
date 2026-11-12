import { useSearchParams } from 'react-router'
import { NativeSelect } from '../ui/native-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { AbaIntegracao } from './AbaIntegracao'
import { ConteudoMcp, type Dados } from './Mcp'
import { FormularioMoodle, type Plataforma } from './Moodle'

const Abas = ['moodle', 'mcp'] as const
type Aba = (typeof Abas)[number]
const Titulos: Record<Aba, string> = { moodle: 'Moodle', mcp: 'MCP' }

const abaPedida = (valor: string | null): Aba => (Abas.includes(valor as Aba) ? (valor as Aba) : 'moodle')

function Navegacao() {
  return (
    <TabsList className="hidden h-auto w-56 shrink-0 flex-col items-stretch gap-0.5 self-start bg-transparent p-0 @4xl/main:flex">
      {Abas.map((k) => (
        <TabsTrigger key={k} value={k} className="h-9 flex-none justify-start px-3 data-[state=active]:bg-accent data-[state=active]:shadow-none">
          {Titulos[k]}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}

export function Integracoes() {
  const [params, setParams] = useSearchParams()
  const aba = abaPedida(params.get('aba'))
  const escolher = (k: string) => setParams({ aba: k })
  return (
    <Tabs orientation="vertical" value={aba} onValueChange={escolher} className="gap-4 @4xl/main:flex-row @4xl/main:gap-8" data-aba-ativa={params.get('aba') ?? ''}>
      <div className="@4xl/main:hidden">
        <NativeSelect aria-label="Integração" className="w-full min-w-0" value={aba} onChange={(e) => escolher(e.target.value)}>
          {Abas.map((k) => (
            <option key={k} value={k}>
              {Titulos[k]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <Navegacao />
      <TabsContent value="moodle" className="flex min-w-0 max-w-2xl flex-1 flex-col gap-4">
        <AbaIntegracao<Plataforma>
          titulo="Moodle"
          introducao="Alunos que entram pela atividade One no Moodle chegam ao assistente sem digitar CPF nem senha. A equipe continua entrando com CPF e senha."
          oque="a integração com o Moodle"
          chave="moodle-admin"
          url="/api/admin/moodle"
        >
          {(dados) => <FormularioMoodle dados={dados} />}
        </AbaIntegracao>
      </TabsContent>
      <TabsContent value="mcp" className="flex min-w-0 max-w-4xl flex-1 flex-col gap-4">
        <AbaIntegracao<Dados>
          titulo="MCP"
          introducao="Conecte a IA que você já usa (Claude Code, Cursor) aos chamados, à base de conhecimento e aos indicadores do One. O acesso é só de leitura e segue o seu papel."
          oque="a integração com o MCP"
          chave="mcp-admin"
          url="/api/admin/mcp"
        >
          {(dados) => <ConteudoMcp dados={dados} />}
        </AbaIntegracao>
      </TabsContent>
    </Tabs>
  )
}
