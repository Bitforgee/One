import { CorValida } from '../aparencia'

const Prontas: [string, string][] = [
  ['Azul One', '224fa7'],
  ['Verde', '166534'],
  ['Vinho', '8a1538'],
  ['Roxo', '6b21a8'],
  ['Laranja', 'b45309'],
  ['Grafite', '374151'],
  ['Petróleo', '0f766e'],
  ['Marrom', '78350f'],
]
const comHash = (digitos: string) => '#' + digitos

export function CoresProntas({ cor, escolher }: { cor: string; escolher: (cor: string) => void }) {
  const atual = cor.toLowerCase()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="radiogroup" aria-label="Cores prontas" className="flex flex-wrap gap-2">
        {Prontas.map(([nome, digitos]) => {
          const valor = comHash(digitos)
          const marcada = atual === valor
          return (
            <button
              key={nome}
              type="button"
              role="radio"
              aria-checked={marcada}
              aria-label={nome}
              title={nome}
              onClick={() => escolher(valor)}
              style={{ backgroundColor: valor }}
              data-amostra className="size-11 shrink-0 rounded-md border-2 border-transparent outline-offset-2 focus-visible:outline-2 aria-checked:border-foreground aria-checked:ring-2 aria-checked:ring-background md:size-8"
            />
          )
        })}
      </div>
      <input
        type="color"
        aria-label="Escolher cor"
        value={CorValida.test(cor) ? cor.toLowerCase() : comHash('000000')}
        onChange={(e) => escolher(e.target.value)}
        className="size-11 shrink-0 cursor-pointer rounded-sm border bg-transparent p-0.5 md:size-8"
      />
    </div>
  )
}
