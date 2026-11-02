#!/usr/bin/env bash
# Prova do C7 (AC 8, door 4) no Windows: o mutator_web.sh do refatoracao-solid, com os caminhos da door 4
# (as 6 fatias e os 7 arquivos da raiz; web/src/ui/ fica de fora). Os ajustes de ambiente são os de lá:
# sitecustomize.py (junction e hardlink no lugar de symlink), --test-command "npm test", --max-workers 2 e o
# PYTHONPATH com o site-packages do crapper. Sai 3 se algum mutante sobreviver.
# Uso, na raiz do repositório depois de `npm --prefix web run coverage`: bash .specs/features/interface-nova/mutator_web.sh
set -e
aqui="$(cd "$(dirname "$0")" && pwd)"
windows="$(cd "$aqui/../refatoracao-solid/mutator_windows" && pwd -W 2>/dev/null || pwd)"
export PYTHONUTF8=1 PYTHONIOENCODING=utf-8 PYTHONPATH="$windows;${CRAPPER_SITE:-$APPDATA/uv/tools/crapper/Lib/site-packages}"
cd "$aqui/../../../web"
mutator --use-existing-coverage --mutate-all --max-workers 2 --test-command "npm test" \
  src/acesso src/assistente src/chamados src/conhecimento src/indicadores src/administracao \
  src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts src/Opcoes.tsx
