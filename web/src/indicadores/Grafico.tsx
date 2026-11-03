import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'

// Barras horizontais de um ranking; fica num chunk próprio (AC 33) e escondido da tecnologia assistiva, porque a
// tabela logo abaixo traz os mesmos números (AC 34).
export default function Grafico({ linhas, cor }: { linhas: { categoria: string; total: number }[]; cor: string }) {
  return (
    <div aria-hidden="true" style={{ height: 40 + 28 * linhas.length }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={linhas} margin={{ left: 0, right: 8 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="categoria" width={120} tick={{ fontSize: 12 }} />
          <Bar dataKey="total" fill={cor} radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
