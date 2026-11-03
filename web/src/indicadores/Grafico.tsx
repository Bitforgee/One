import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'

// Barras horizontais de um ranking; fica num chunk próprio (AC 33) e escondido da tecnologia assistiva, porque a
// tabela logo abaixo traz os mesmos números (AC 34).
// Rótulo do eixo numa linha só: até 18 caracteres inteiro, senão 17 + "…"; o nome inteiro está na tabela.
export const rotulo = (categoria: string) => (categoria.length > 18 ? `${categoria.slice(0, 17)}…` : categoria)

export default function Grafico({ linhas, cor }: { linhas: { categoria: string; total: number }[]; cor: string }) {
  return (
    <div aria-hidden="true" style={{ height: 40 + 28 * linhas.length }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={linhas} margin={{ left: 0, right: 8 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="categoria"
            width={120}
            // o Text do Recharts quebra o rótulo em linhas pela largura estimada; aqui é uma linha só, já cortada
            tick={({ x, y, payload }) => (
              <text x={x} y={y} dy={4} textAnchor="end" fontSize={12} className="fill-muted-foreground">
                <tspan>{rotulo(String(payload.value))}</tspan>
              </text>
            )}
          />
          <Bar dataKey="total" fill={cor} radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
