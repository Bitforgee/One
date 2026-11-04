import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'

// Barras horizontais de um ranking; fica num chunk próprio (AC 33) e escondido da tecnologia assistiva, porque a
// tabela logo abaixo traz os mesmos números (AC 34).
// Rótulo do eixo em até 2 linhas, sem reticências (AC 5): até 24 caracteres numa linha; senão parte no espaço mais perto do meio.
// shortcut: sem limite para rótulos acima de 48 caracteres, quando houver, cortar no cadastro da categoria.
export const linhasDoRotulo = (categoria: string) => {
  if (categoria.length <= 24) return [categoria]
  const meio = categoria.length / 2
  const espacos = [...categoria].flatMap((c, i) => (c === ' ' ? [i] : []))
  const corte = espacos.length ? espacos.reduce((a, b) => (Math.abs(b - meio) < Math.abs(a - meio) ? b : a)) : meio
  return [categoria.slice(0, corte).trim(), categoria.slice(corte).trim()]
}

export default function Grafico({ linhas, cor }: { linhas: { categoria: string; total: number }[]; cor: string }) {
  return (
    <div aria-hidden="true" style={{ height: 40 + 36 * linhas.length }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={linhas} margin={{ left: 0, right: 8 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="categoria"
            width={136}
            // o Text do Recharts quebra o rótulo pela largura estimada; aqui as linhas vêm de linhasDoRotulo
            tick={({ x, y, payload }) => {
              const partes = linhasDoRotulo(String(payload.value))
              return (
                <text x={x} y={y} textAnchor="end" fontSize={12} className="fill-muted-foreground">
                  {partes.map((parte, i) => (
                    <tspan key={i} x={x} dy={i ? 14 : 4 - 6 * (partes.length - 1)}>
                      {parte}
                    </tspan>
                  ))}
                </text>
              )
            }}
          />
          <Bar dataKey="total" fill={cor} radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
