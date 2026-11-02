// Opções de um select de cadastro: a primeira, vazia, pede a escolha; a lista pode ainda não ter chegado.
export function Opcoes({ vazio, itens }: { vazio: string; itens?: { id: number; nome: string }[] | null }) {
  return (
    <>
      <option value="">{vazio}</option>
      {itens?.map((x) => (
        <option key={x.id} value={x.id}>
          {x.nome}
        </option>
      ))}
    </>
  )
}
