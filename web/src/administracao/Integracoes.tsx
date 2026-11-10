import { useSearchParams } from 'react-router'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { AbaMoodle } from './Moodle'

const Abas = ['moodle', 'mcp'] as const
type Aba = (typeof Abas)[number]

const abaPedida = (valor: string | null): Aba => (Abas.includes(valor as Aba) ? (valor as Aba) : 'moodle')

export function Integracoes() {
  const [params, setParams] = useSearchParams()
  const aba = abaPedida(params.get('aba'))
  return (
    <Tabs value={aba} onValueChange={(v) => setParams({ aba: v })} className="flex max-w-2xl flex-col gap-6" data-aba-ativa={params.get('aba') ?? ''}>
      <TabsList>
        <TabsTrigger value="moodle">Moodle</TabsTrigger>
        <TabsTrigger value="mcp" className="gap-2">
          MCP
          <Badge variant="secondary">Em breve</Badge>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="moodle">
        <AbaMoodle />
      </TabsContent>
      <TabsContent value="mcp">
        <p className="m-0 text-muted-foreground">A integração com o MCP do One chega em uma próxima versão.</p>
      </TabsContent>
    </Tabs>
  )
}
