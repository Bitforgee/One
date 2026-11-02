#!/usr/bin/env bash
# C8: uma mensagem plantada em api/ sem handler faz o `dotnet build` falhar com MSG0005; a mesma mensagem
# com handler compila sem MSG0005. O arquivo plantado sai no fim.
set -u
raiz=$(cd "$(dirname "$0")/../../.." && pwd)
plantado="$raiz/api/MensagemPlantada.cs"
trap 'rm -f "$plantado"; dotnet build "$raiz/api" -v q >/dev/null 2>&1' EXIT

plantar() {
  {
    echo "using Mediator;"
    echo "namespace One.Api;"
    echo "public sealed record MensagemPlantada : Mediator.IRequest<IResult>;"
    if [ "$1" = "com-handler" ]; then
      echo "public sealed class MensagemPlantadaHandler : IRequestHandler<MensagemPlantada, IResult>"
      echo "{"
      echo "    public ValueTask<IResult> Handle(MensagemPlantada m, CancellationToken ct) => ValueTask.FromResult(Results.Ok());"
      echo "}"
    fi
  } > "$plantado"
}

plantar sem-handler
saida=$(dotnet build "$raiz/api" --no-incremental 2>&1); codigo=$?
if [ "$codigo" -eq 0 ] || ! grep -q "error MSG0005" <<< "$saida"; then
  echo "FALHA: mensagem sem handler não quebrou o build com MSG0005 (código $codigo)"
  exit 1
fi

plantar com-handler
saida=$(dotnet build "$raiz/api" --no-incremental 2>&1); codigo=$?
if [ "$codigo" -ne 0 ] || grep -q "MSG0005" <<< "$saida"; then
  echo "FALHA: mensagem com handler não compilou limpo (código $codigo)"
  grep -E "error|MSG0005" <<< "$saida" | head -5
  exit 1
fi
echo "ok: sem handler quebra com MSG0005, com handler compila sem MSG0005"
