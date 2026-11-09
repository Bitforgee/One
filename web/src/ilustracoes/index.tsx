const Colunas = ['cpf', 'nome', 'email', 'matricula', 'curso', 'semestre', 'situacao']
const Larguras = [44, 52, 60, 88, 60, 84, 84]

export function Planilha({ className }: { className?: string }) {
  const bordas = Larguras.map((_, i) => Larguras.slice(0, i).reduce((a, b) => a + b, 0))
  return (
    <svg data-ilustracao="planilha" aria-hidden="true" viewBox="0 0 473 66" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <rect x="1" y="1" width="471" height="32" fill="var(--primary-subtle)" stroke="none" />
      <path d="M1 1h471v64H1zM1 33h471" />
      {bordas.slice(1).map((x) => (
        <path key={x} d={`M${x} 1v64`} />
      ))}
      {Colunas.map((nome, i) => (
        <text key={nome} x={bordas[i] + 6} y={22} fontSize={14} fontWeight={600} fill="currentColor" stroke="none">
          {nome}
        </text>
      ))}
    </svg>
  )
}
