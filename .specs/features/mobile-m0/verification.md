# Mobile M0 - verification

Status: **autoverificação do construtor, não independente.** Falta o Verify (agente novo, sem este contexto) rodar a prova de cada check em `<base>..HEAD` e injetar uma falha por área. Nada foi commitado ainda.

## O que o construtor rodou (08/11)

| Prova | Resultado |
| --- | --- |
| `cd web && npx vitest run` | 62 arquivos, todos verdes (antes da correção: 10 testes novos vermelhos, como previsto) |
| `cd web && npm run build` (tsc + vite) | sai com 0 |
| `docker compose up -d --build api` e `npx playwright test` em todos os `*.spec.ts` sem `real` | 239 passed, incluindo os 3 novos de `celular.spec.ts` |

## Pendências para o Verify

- Rodar `*-real.spec.ts`: `e2e/fluxos-real.spec.ts` linha 183 já está quebrado no HEAD `e4cd3e9` (um `` `n `` literal no lugar de quebra de linha), antes desta feature. Não foi tocado aqui.
- Gates `crapper` (CRAP < 10) e `dryer` dentro de `web/` não foram rodados (AD-044 aceita o gap do crapper neste computador).
- Aparelho real (Android de entrada e iPhone, modelos a registrar): tocar a margem da caixa e do texto de "Nota interna"; app instalado sem rede; iPhone deitado, recuo lateral. Não provado.

## Desvios do plano aprovado

- O 5xx no `/api/auth/me` continua indo ao Login, porque `acesso.test.tsx` ("QueryClient por montagem") já fixa esse comportamento. Só a falha de rede mostra o bloco de conexão. Plano ajustado (AC 4, AC 5, L3).
- Sem sessão não há casca (precisa dos papéis), então a tela offline é o bloco centrado, sem cabeçalho nem abas (L3).
- `sessao.test.tsx` ficou em `web/src/chamados/`, porque `estrutura.test.ts` liga cada teste à fatia da primeira rota.
