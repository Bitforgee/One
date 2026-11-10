import { useSearchParams } from 'react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { AbaIntegracao } from './AbaIntegracao'
import { ConteudoMcp, type Dados } from './Mcp'
import { FormularioMoodle, type Plataforma } from './Moodle'

const Abas = ['moodle', 'mcp'] as const
type Aba = (typeof Abas)[number]

const abaPedida = (valor: string | null): Aba => (Abas.includes(valor as Aba) ? (valor as Aba) : 'moodle')

export function Integracoes() {
  const [params, setParams] = useSearchParams()
  const aba = abaPedida(params.get('aba'))
  return (
    <Tabs value={aba} onValueChange={(v) => setParams({ aba: v })} className={`flex flex-col gap-6 ${aba === 'mcp' ? 'max-w-4xl' : 'max-w-2xl'}`} data-aba-ativa={params.get('aba') ?? ''}>
      <TabsList>
        <TabsTrigger value="moodle">Moodle</TabsTrigger>
        <TabsTrigger value="mcp">MCP</TabsTrigger>
      </TabsList>
      <TabsContent value="moodle">
        <AbaIntegracao<Plataforma>
          introducao="Alunos que entram pela atividade One no Moodle chegam ao assistente sem digitar CPF nem senha. A equipe continua entrando com CPF e senha."
          oque="a integração com o Moodle"
          chave="moodle-admin"
          url="/api/admin/moodle"
        >
          {(dados) => <FormularioMoodle dados={dados} />}
        </AbaIntegracao>
      </TabsContent>
      <TabsContent value="mcp">
        <AbaIntegracao<Dados>
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