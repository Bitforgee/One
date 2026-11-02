#!/usr/bin/env bash
# C5: um método plantado em api/ com complexidade ciclomática 11 faz o `dotnet build` falhar com CA1502
# nomeando o método; o mesmo método com complexidade 10 compila sem CA1502. O arquivo plantado sai no fim.
set -u
raiz=$(cd "$(dirname "$0")/../../.." && pwd)
plantado="$raiz/api/BarreiraPlantada.cs"
trap 'rm -f "$plantado"; dotnet build "$raiz/api" -v q >/dev/null 2>&1' EXIT

# n ifs em sequência dão complexidade n + 1
plantar() {
  {
    echo "namespace One.Api;"
    echo "public static class BarreiraPlantada"
    echo "{"
    echo "    public static int MetodoPlantado(int x)"
    echo "    {"
    echo "        var r = 0;"
    for i in $(seq 1 "$1"); do echo "        if (x == $i) r += $i;"; done
    echo "        return r;"
    echo "    }"
    echo "}"
  } > "$plantado"
}

plantar 10
saida=$(dotnet build "$raiz/api" --no-incremental 2>&1); codigo=$?
if [ "$codigo" -eq 0 ] || ! grep -q "error CA1502: 'MetodoPlantado'" <<< "$saida"; then
  echo "FALHA: complexidade 11 não quebrou o build com CA1502 em MetodoPlantado (código $codigo)"
  exit 1
fi

plantar 9
saida=$(dotnet build "$raiz/api" --no-incremental 2>&1); codigo=$?
if [ "$codigo" -ne 0 ] || grep -q "CA1502" <<< "$saida"; then
  echo "FALHA: complexidade 10 não compilou limpo (código $codigo)"
  grep "CA1502" <<< "$saida" | head -5
  exit 1
fi
echo "ok: 11 quebra com CA1502 em MetodoPlantado, 10 compila sem CA1502"
