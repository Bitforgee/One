#!/usr/bin/env bash
# Prova do C38 no Windows: o mesmo `mutator --mutate-all` sobre as 6 fatias, com três ajustes de ambiente.
# - sitecustomize.py (nesta pasta): sem Developer Mode o Windows não cria symlink; os workers usam junction e hardlink.
# - --test-command "npm test": o argv ["npm", "test"] do mutator não acha o npm.cmd sem o shell.
# - --max-workers 2: com um worker por núcleo, os findBy do Testing Library estouram o tempo e matam mutantes falsos.
# - o mutator importa o crapper: PYTHONPATH aponta para o site-packages da ferramenta crapper (CRAPPER_SITE).
# Uso, na raiz do repositório depois de `npm --prefix web run coverage`: bash .specs/features/refatoracao-solid/mutator_windows/mutator_web.sh
set -e
aqui="$(cd "$(dirname "$0")" && pwd -W 2>/dev/null || pwd)"
export PYTHONUTF8=1 PYTHONIOENCODING=utf-8 PYTHONPATH="$aqui;${CRAPPER_SITE:-$APPDATA/uv/tools/crapper/Lib/site-packages}"
cd web
mutator --use-existing-coverage --mutate-all --max-workers 2 --test-command "npm test" src/acesso src/assistente src/chamados src/conhecimento src/indicadores src/administracao
