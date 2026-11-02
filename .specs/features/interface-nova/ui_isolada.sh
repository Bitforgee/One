#!/usr/bin/env bash
# C15 (AC 14, door 3): um arquivo de web/src/ui/ que importa uma fatia ou um módulo da raiz reprova o "estrutura em fatias".
# Planta web/src/ui/plantado.ts com cada forma de import; o teste tem de falhar apontando o arquivo plantado,
# e sem o arquivo tem de passar. Sai 0 só se os 5 resultados forem esses. Uso, na raiz do repositório:
#   bash .specs/features/interface-nova/ui_isolada.sh
set -u
cd "$(dirname "$0")/../../../web"
plantado=src/ui/plantado.ts
trap 'rm -f "$plantado"' EXIT
estrutura() { npx vitest run src/test/estrutura.test.ts -t "estrutura em fatias" 2>&1; }
falhas=0
for origem in ../api @/api ../chamados/Chamados @/chamados/Chamados; do
  printf "import { x } from '%s'\nexport const y = x\n" "$origem" > "$plantado"
  if saida=$(estrutura); then
    echo "FALHA: o teste passou com o import de '$origem'"; falhas=$((falhas + 1))
  elif grep -q "ui/plantado.ts" <<<"$saida"; then
    echo "ok: o teste reprova o import de '$origem'"
  else
    echo "FALHA: o teste falhou com '$origem', mas não por causa do arquivo plantado"; falhas=$((falhas + 1))
  fi
done
rm -f "$plantado"
if estrutura >/dev/null; then echo "ok: sem o arquivo plantado o teste passa"; else echo "FALHA: sem o arquivo plantado o teste falha"; falhas=$((falhas + 1)); fi
exit $falhas
