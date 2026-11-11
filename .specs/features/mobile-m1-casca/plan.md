# Mobile M1: casca mobile-first para todos os papéis

Profile: ui. Épico M1 de `.specs/prompt-mobile-first.md`, depois do M0 (`mobile-m0`, commit `4af4c53`). Escrito em 11/11. Aguarda o "aprovado" de um humano; sem `checks.md` e sem código antes disso.

## Problem

No celular, só o aluno tem navegação ao alcance do polegar (barra de abas de 56 px embaixo). O atendente, o líder e o administrador abrem um menu lateral pelo botão ☰ no canto superior esquerdo, a zona mais distante do polegar, e escolhem entre até 12 destinos numa gaveta de 288 px. Quem atende entre uma aula e outra paga o toque extra a cada troca de tela. O detalhe do chamado não tem "voltar" no cabeçalho, então a pessoa depende do botão do sistema. No celular deitado (844×390) a casca vira a de computador: barra lateral de 256 px, 30% da largura, e sobram cerca de 233 px de altura para o conteúdo.

Evidência: auditoria de 08/11 em 390×844, 360×780 e 844×390 (`.specs/prompt-mobile-first.md` seção 3, problemas P9 e P17). Não há medida de uso, porque não há produção.

Depois disto, em qualquer papel a navegação principal fica numa barra embaixo com 3 a 5 destinos, o detalhe do chamado tem "Voltar" no topo, o celular deitado usa a mesma barra, e o que não cabe na barra vive numa tela "Gerir" em lista, como a tela "Conta" que o aluno já tem.

## Flow

Reusa a barra de abas do aluno (`BarraDeAbas`), a lista `Menu` com seus grupos (AD-028) e a tela `Conta`; não cria outro menu nem outra rota para o que já existe.

1. `Autenticado.tsx` `Casca` (exists) - `celular` deixa de ser só `max-width: 767px` e passa a incluir o celular deitado; `abas` deixa de exigir "só ALUNO" (door 1, door 3)
2. `Autenticado.tsx` `BarraDeAbas` (exists) - as abas saem de uma função do `Menu` e dos papéis, em vez da lista fixa do aluno (door 2)
3. `acesso/Conta.tsx` (exists) - a rota `conta` passa a valer para todos os papéis; "Avisos no celular" continua só para o aluno
4. `administracao/Gerir.tsx` (new, door 2) - lista os destinos que ficaram fora da barra, agrupados pelo nome do grupo do `Menu`
5. `Autenticado.tsx` `Topo` (exists) - em `chamados/:numero` mostra "Voltar" à esquerda
6. `chamados/ChamadoDetalhe.tsx` `BarraDoChamado` (exists) - a barra de abas some nessa rota para a equipe, em vez de ficar empilhada (door 4)

## Impact

| Front | What changes |
| --- | --- |
| decisão ativa | AD-029 (gaveta `Sheet` de 288 px abaixo de 768 px) deixa de valer para a equipe e o administrador; a gaveta continua a partir de 768 px e na troca de senha obrigatória (AC 14). AD-028 (grupos) segue valendo como títulos da tela Gerir. AD-052 novo registra isto |
| domain | termo novo: **celular**, `(max-width: 767px), (max-height: 479px) and (pointer: coarse)`; antes "celular" era só a largura. Quem ramifica nele hoje: `Autenticado.tsx` (`useConsulta('(max-width: 767px)')`), `Editor.tsx`, `Tabela.tsx` (`useEstreito`) e `EdicaoDoFluxo.tsx`. Só a casca passa a usar o termo novo; os outros três ficam por largura, e o celular deitado continua com tabela e `Editor` de computador (fora de escopo, M7) |
| testes que codificam a decisão antiga | `e2e/arranjo.spec.ts` "painel no celular" (gaveta `Menu` a 360, 390 e 767 para a equipe), `e2e/casca.spec.ts` ("Tema na gaveta" do atendente a 390), `e2e/ux.spec.ts` ("sem barra de abas ... para a equipe" e `comGaveta`), `src/acesso/acesso.test.tsx` e `src/acesso/textos.test.tsx` (botão "Alternar barra lateral" em largura estreita). Trocam-se pelos casos de AC 1 a 4; nenhuma asserção some sem outra no lugar |
| `celular.spec.ts` | "alvos de toque de 44 px" abre telas de equipe a 390; passa a achar a navegação na barra |
| API, dados, migration | nenhum |

## Relations

None - no stored-data shape change.

## Surface

None - nothing consumed outside. A rota web `/:slug/gerir` é decisão do Landing (door 2); não há rota de API nova.

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. O que é "celular" | um só predicado em `web/src/ui/use-mobile.ts`: `(max-width: 767px), (max-height: 479px) and (pointer: coarse)`, lido por `Casca`. Largura continua 768 (AD-029); a altura 479 vem da classe "compact" de altura do Android; `pointer: coarse` impede que uma janela baixa de computador vire celular | Quebrar em 600 dp como o Material 3: mexe nos testes de 768 em todo o `web/` e só muda o tablet de 7" em pé. Só altura: uma janela de navegador baixa e com mouse viraria celular |
| 2. A tela "Gerir" | rota `/:slug/gerir`, rótulo "Gerir", lista de links agrupada por `Menu.grupo`. É a 4ª ou 5ª aba quando o papel tem destino fora do grupo "Atendimento" | "Mais": a Apple HIG desaconselha a aba-gaveta sem assunto. "Administração": o líder e o operador também têm itens ali (Conhecimento, Plataforma) e o atendente com excesso de abas leva Indicadores para lá |
| 3. Barra por função do `Menu` | `abas = destinos do grupo "Atendimento" do papel (na ordem do Menu) + "Gerir" se sobrar destino + "Conta"`, no máximo 5; passando de 5, o último "Atendimento" vai para "Gerir" até caber | Tabela papel→abas escrita à mão: a lista nova de papel (E1 do outro plano) viraria edição em dois lugares. Barra com 6 ou mais itens: passa do limite de 5 do Material e da HIG |
| 4. Sem barra de abas no detalhe da equipe | em `chamados/:numero`, para quem tem `ATENDENTE` ou `ADMINISTRADOR`, a barra de abas não existe; o aluno (só `ALUNO`) mantém a barra | Empilhar a barra de abas e a `BarraDoChamado` (56 + 61 px de 780): a HIG desaconselha barra de abas e barra de ações juntas |

- Nada mais nesta mudança é difícil de desfazer: sem schema, sem contrato de API, sem dependência nova

## Criteria

### S1: navegação principal embaixo em qualquer papel (P1)

A equipe e o administrador trocam de tela com o polegar, como o aluno.

**Acceptance Criteria**

1. WHILE the viewport is celular and the user is not forced to change the password, the system SHALL show a bottom navigation named "Navegação" and SHALL NOT render the sidebar, its `Sheet` or the "Alternar barra lateral" button
2. The bar SHALL list the user's destinations of the "Atendimento" group in `Menu` order, then "Gerir" when any destination exists outside that group, then "Conta"; for ALUNO only: Assistente, Solicitações, Conta; for ATENDENTE only: Fila, Indicadores, Conta; for ADMINISTRADOR only: Indicadores, Gerir, Conta; for ATENDENTE and ADMINISTRADOR: Fila, Indicadores, Gerir, Conta; for OPERADOR only: Gerir, Conta
3. IF the list would pass 5 destinations THEN the system SHALL move the last "Atendimento" destinations into "Gerir" until it has 5 (ALUNO, ATENDENTE and ADMINISTRADOR: Assistente, Solicitações, Fila, Gerir, Conta)
4. WHEN the route is a destination of the bar, or one that "Gerir" lists, the system SHALL mark that tab with `aria-current="page"`, and `chamados/:numero` SHALL mark Solicitações for the student (emenda de 11/11 ao escrever os checks: o trecho "e Fila para a equipe" saiu, porque o AC 13 tira a barra dessa rota para a equipe e não haveria aba para marcar)
5. The system SHALL give every tab at least 44 px of width and 56 px of height plus `env(safe-area-inset-bottom)` in portrait
6. WHEN the viewport changes from celular to 768 px or wider (or back) THEN the system SHALL change the shell and keep the route and the open ticket

### S2: Gerir e Conta (P1)

O que não cabe na barra fica a um toque, em lista.

7. WHEN the user opens `/:slug/gerir` THEN the system SHALL list every destination the user has outside the bar, under the `Menu` group names, each row a link at least 52 px high
8. IF the user has no destination for "Gerir" THEN the system SHALL redirect `/:slug/gerir` to the user's `telaInicial`
9. WHEN any role opens `/:slug/conta` THEN the system SHALL show name, role label, Tema, Contato (when the institution has one), Trocar senha and Sair, and SHALL show "Avisos no celular" only to a user with the `ALUNO` role
10. WHILE the viewport is 768 px or wider the system SHALL keep the sidebar as it is and SHALL NOT show the bar

### S3: detalhe do chamado no celular (P2)

Voltar no topo e uma barra só embaixo.

11. WHILE the viewport is celular, on `chamados/:numero` the header SHALL show a "Voltar" button of at least 44×44 px before the title
12. WHEN "Voltar" is tapped THEN the system SHALL return to the previous screen of the app; WHEN the ticket was opened directly (no previous screen) THEN it SHALL go to `fila` for a user with `ATENDENTE` and to `solicitacoes` for the others
13. WHILE the viewport is celular, on `chamados/:numero` the system SHALL NOT render the bottom navigation for a user with `ATENDENTE` or `ADMINISTRADOR`, and `BarraDoChamado` SHALL sit on the bottom edge of the viewport

### S4: casca na troca de senha e no celular deitado (P2)

14. WHILE the viewport is celular and `deveTrocarSenha` is true for a user with a role other than ALUNO alone, the system SHALL keep the drawer with the "Alternar barra lateral" button (so "Sair" stays reachable) and SHALL NOT show the bar
15. WHILE the viewport is 844×390 with a coarse pointer, the system SHALL show the bar (48 px high, icon and label side by side) and no 256 px sidebar, and the content SHALL use the whole width minus the safe areas
16. IF `/:slug/gerir` or `/:slug/conta` is opened on a viewport that is not celular THEN the system SHALL show the same list (a bookmark keeps working)

## Out of scope

| Excluded | Why |
| --- | --- |
| Botão flutuante e "Novo" na zona do polegar | M3 do plano-mestre; pede decisão por tela |
| Teclado, composer, `interactive-widget` | M2 |
| Rail de ícones de 600 a 1200 px e o ponto de quebra de 600 dp | Landing door 1: o tablet em pé continua com a gaveta |
| Swipe, filtros em Sheet, paginação da fila | M3 |
| Manifest, convite de instalação, atalhos (`shortcuts`) | M4; o `shortcuts` copiará a rota `gerir` de door 2 |
| Canvas do editor de fluxos em toque, tabelas e `Editor` no celular deitado | M7 |
| Aviso de "Melhor numa tela maior" nas telas de administração | M8 |
| Regra "mobile-first" no `AGENTS.md` (Observable de celular em todo plano) | Mudança de processo, fica para o dono aprovar (Assumptions) |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| O administrador usa a barra de baixo no celular (pergunta 3 do plano-mestre) | Sim, com "Gerir" como 3ª aba | Três perfis, uma só casca; o admin só trabalha de verdade no computador, e o urgente (desativar, reenviar) cabe em Gerir | n |
| Entrar antes do congelamento de 17/11 | Construir em 12 a 15/11, Verify em 16/11; se a banca de 20/11 pedir só o que já existe, adiar | O M0 já cobre o vazamento da nota interna; o M1 troca a navegação da equipe a 6 dias do congelamento | n |
| Nome da aba "Gerir" | "Gerir" | Uma palavra, um verbo, cobre Conhecimento, Administração e Plataforma | n |
| "Meus" como aba da Fila | Não entra: a Fila hoje não tem filtro "meus" | A aba aponta para rota que existe; o filtro é do M3 | n |
| Aparelho real | Chromium com toque emulado prova largura, altura e `env()` zerado; o iPhone com recuo de verdade vai para a lista de aparelho real do `verification.md` | Mesma limitação do M0 | n |
| Primeiro acesso com senha temporária da equipe no celular | Mantém a gaveta (AC 14) | A tela de troca não tem "Sair"; tirar a gaveta prenderia o atendente | n |

**Open questions:** none - all resolved or logged above (as duas primeiras linhas esperam a confirmação do dono).

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen barra de navegação | empty state | n/a - a barra sempre tem "Conta" |
| screen barra de navegação | loading state | existing - `Autenticado` mostra o spinner até o `me` chegar (sem papéis não há barra) |
| screen barra de navegação | error state | existing - M0: falha de rede mostra "Verifique sua conexão." com "Tentar de novo" |
| screen barra de navegação | unauthorised | AC 8 e `rotaPermitida` existente |
| screen Gerir | empty state | AC 8 |
| screen Gerir | loading, error | existing - vem da casca; a lista é estática e não faz chamada |
| screen Gerir | destructive action confirms | n/a - só navega |
| screen Conta | states | existing - só muda o papel que a abre (AC 9) |
| header Voltar | error state | AC 12 (sem tela anterior) |
| all new web routes (`gerir`) | versioning, rate limits | n/a - rota de tela, sem API |
| celular 360×780 | arranjo | AC 1 a 5, 7, 11, 13 |
| celular deitado 844×390 | arranjo | AC 15 |
| teclado aberto | barra e campo | n/a - M2; a barra é `fixed` embaixo como a do aluno hoje, atrás do teclado |
| toque | alvo | AC 5, 7 e 11 (44 px) |

## Sources

- `.specs/prompt-mobile-first.md` seções 3 a 6 (P9, P17, M1) - o problema medido e o recorte do épico
- Material 3 *Navigation bar* e *Navigation rail* (m3.material.io; barra em largura < 600 dp, rail acima) e *Build adaptive navigation* (developer.android.com): barra para o celular, 3 a 5 destinos
- Apple HIG *Tab bars*: 3 a 5 destinos, não esconder abas, rótulo curto; barra de abas e barra de ações juntas poluem a tela (fórum developer.apple.com/forums/thread/790916, que cita a HIG)
- Zendesk, Freshdesk e Intercom (planos-mestre, seção 4): o app do agente tem fila e inbox como destino principal, ações no polegar
