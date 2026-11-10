# CRAP abaixo de 10 nas funções antigas do web

Profile: standard (refatoração sem tela nova nem mudança visual)
Aprovação: o dono do projeto aprovou em 10/11/2026 seguir este plano sem novas aprovações intermediárias ("Siga o plano crap-abaixo-de-10: crie a feature própria com plan.md/checks.md conforme as regras do projeto, refatore as 8 funções antigas sem mudança de comportamento ... Não pare para pedir aprovação intermediária").

## Problem
Com `crapper` e `dryer` instalados neste computador (commits auditados no C8 de `sessao-erro-transitorio`), o gate do AD-018 sobre `web/src` sai 2: 8 funções antigas passam de CRAP 9.99. Elas vêm de features que fecharam sem o gate (AD-044) e mantêm em FAIL o C8 de `sessao-erro-transitorio`, o C104 de `fluxos-atendimento`, o C38 de `integracao-moodle` e o C7 de `integracoes-admin`.

| Função | Arquivo | CC | Cobertura | CRAP |
|---|---|---|---|---|
| `Corpo` | `web/src/administracao/Canvas.tsx` | 19 | 76,9% | 23,4 |
| `EdicaoDoFluxo` | `web/src/administracao/EdicaoDoFluxo.tsx` | 18 | 95,7% | 18,0 |
| `Formulario` | `web/src/administracao/Aparencia.tsx` | 17 | 92,9% | 17,1 |
| `CampoDeTexto` | `web/src/administracao/Aparencia.tsx` | 12 | 100% | 12,0 |
| `Detalhe` | `web/src/chamados/ChamadoDetalhe.tsx` | 12 | 100% | 12,0 |
| `Campo` | `web/src/acesso/Acesso.tsx` | 11 | 83,3% | 11,6 |
| `aplicar` | `web/src/aparencia.tsx` | 11 | 100% | 11,0 |
| `PainelDaAba` | `web/src/administracao/Cadastros.tsx` | 10 | 100% | 10,0 |

Medido em `3c2f134` com `crapper --use-existing-coverage -s src --threshold 9.99` sobre `npm --prefix web run coverage -- --maxWorkers=4`.

## Flow
1. Em cada um dos 7 arquivos, a lógica de ramos da função é extraída, no mesmo arquivo, para funções ou componentes menores (por exemplo, decisões de texto e de classe em funções puras, blocos condicionais de JSX em subcomponentes, manipuladores de evento do canvas em funções nomeadas). Nada muda de fatia nem de pasta.
2. A saída visível (DOM, textos, atributos, classes, chamadas à API) e a ordem dos efeitos ficam iguais; os testes existentes provam isso sem nenhuma alteração.
3. Onde a cobertura de uma função extraída ficar abaixo do necessário para CRAP < 10, acrescenta-se teste novo na fatia, sem tocar nos testes existentes.

## Impact
- Só `web/src`: os 7 arquivos acima e, se precisar, testes novos nas fatias `acesso`, `administracao` e `chamados` ou em `web/src/aparencia.test.tsx`.
- Nenhuma mudança em `One.Api/`, `One.Api.Tests/`, migrations, rotas, contratos JSON, `web/src/ui/`, `package.json`, `vite.config.ts` ou tokens visuais.
- Termos e textos da interface não mudam.

## Relations
Nenhuma entidade nova; nenhuma cardinalidade muda.

## Surface
Nenhuma rota nova ou alterada. As telas tocadas (editor de fluxo, Aparência, detalhe do chamado, acesso, Cadastros e o tema aplicado por `aparencia.tsx`) mantêm o comportamento.

## Landing
Nenhuma decisão difícil de desfazer: não há schema, migration nem contrato de API. Rejeitado: excluir as 8 funções do gate ou aceitar o risco por AD (o dono pediu eliminar a pendência); subir o limite do `crapper` (AD-018 fixa CRAP < 10).

## Criteria
1. Quando o `crapper` roda sobre `web/src` com a cobertura completa, o sistema deve sair 0 com a maior nota ≤ 9.99, sem `N/A`.
2. Quando a suíte web roda, o sistema deve passar em todos os testes, com toda asserção existente preservada sem alteração.
3. Quando o `dryer` roda nas 6 fatias e na raiz, o sistema não deve achar candidato com nota ≥ 0.8.
4. Quando os E2E das telas tocadas rodam, o sistema deve passar neles como passava antes da refatoração.
5. Quando o diff é inspecionado, ele deve tocar só `web/src` (os 7 arquivos e testes novos) e a documentação desta feature, sem comentários no código.

## Out of scope
Qualquer função que já está abaixo de 10, mudança visual ou de texto, e as specs E2E que usam a API real (`*-real.spec.ts`), que dependem de preparação do ambiente (modelo falso na 8090, instituição `e2e`).

## Assumptions
O `crapper` mede cada função e cada arrow function nomeada separadamente; extrair um ramo para uma função própria tira a complexidade dele da função de origem.

## Observable
`crapper` com exit 0; suíte e cobertura com exit 0; `dryer` sem candidato; E2E das 9 specs das telas tocadas com exit 0.

## Sources
`.specs/features/sessao-erro-transitorio/checks.md` (C8 e ferramentas), AD-018, AD-023, AD-044, AD-049.
