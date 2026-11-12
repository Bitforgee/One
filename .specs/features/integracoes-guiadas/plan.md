# Integrações guiadas

## Problem

Hoje o administrador abre Integrações e não sabe, sem entrar em cada item, se o Moodle está ligado nem se existe algum token do MCP em uso: a coluna lateral só lista os nomes (`integracoes-submenu`). No Moodle, três endereços para copiar aparecem com nomes do One ("URL de login", "URL de redirecionamento") e não com o nome do campo do Moodle onde cada um é colado; ao salvar, o único retorno é um aviso que some (`Moodle salvo.`), então quem configura não sabe se acabou nem o que testar. No MCP, o formulário de novo token fica aberto no meio da página, abaixo da tabela, o token novo aparece num bloco acima do formulário que se fecha com um clique e some para sempre, e o primeiro uso (tabela vazia) só diz "Nenhum token ainda." sem uma ação.

Evidência: pedido do administrador em 11/11 ("poderia ser mais intuitiva e fácil de parametrizar"). Não há métrica de uso. A pesquisa que embasa as decisões está em `pesquisa.md`.

Quando isto estiver pronto, o administrador vê o estado de cada integração antes de abrir, segue o Moodle campo a campo com os nomes do Moodle, sabe quando terminou e o que testar, e cria o token do MCP por uma ação clara que mostra o segredo uma única vez, inteiro e com cópia confirmada.

## Flow

Reusa a página `Integracoes` (coluna e seletor), o `AbaIntegracao`, o componente `Url` com o botão Copiar, o diálogo de Cadastros e as duas leituras que já existem (`GET /api/admin/moodle`, `GET /api/admin/mcp`) com as mesmas chaves de cache.

1. `/{slug}/integracoes` -> `Integracoes` (exists) - lê as duas integrações (`moodle-admin`, `mcp-admin`) e calcula o estado de cada uma
2. `Integracoes` (exists) - mostra o estado sob o nome na coluna e dentro da opção do seletor
3. `AbaIntegracao` (exists) - o cabeçalho do painel mostra o título e o estado
4. `FormularioMoodle` (exists) - mostra cada endereço com o nome do campo do Moodle; ao salvar, guarda o resultado e mostra o aviso fixo com o teste
5. `ConteudoMcp` (exists) - botão `Novo token` e, vazia, a lista com a ação; abre o diálogo de criação e, criado o token, o mesmo diálogo vira a revelação única
6. out: as mesmas gravações de hoje (`PUT /api/admin/moodle`, `POST /api/admin/mcp/tokens`, `DELETE /api/admin/mcp/tokens/{id}`), sem mudança de contrato

## Impact

| Front | What changes |
| --- | --- |
| domain | new term: estado da integração - uma linha de texto derivada de dados que a API já devolve (`configurada`, `ativa`, tokens `ATIVO`), vive em `Integracoes` |
| domain | existing term: `Url` (exportado por `Moodle.tsx`) deixa de ser só uma linha rótulo+valor+Copiar - quem o usa hoje: `Moodle.tsx` (3 endereços) e `Mcp.tsx` (URL do servidor, token, comandos); o botão passa a confirmar `Copiado` nos dois |
| tests | `mcp.test.tsx` (formulário fixo vira diálogo), `integracoes.test.tsx` (leitura das duas integrações na abertura; o teste `item no menu` de `ATENDENTE` segue sem chamar `/api/admin/*`), `e2e/integracoes.spec.ts` (o campo `Nome` passa a existir só dentro do diálogo) |
| stored data | nothing to migrate |

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside

## Landing

None - só `web/`, nenhuma rota, esquema, dependência ou nome persistido novo: tudo se desfaz com um refactor.

## Criteria

### S1: o estado de cada integração à vista (P1)

O administrador vê, sem abrir nada, se o Moodle está ligado e quantos tokens do MCP estão em uso.

**Acceptance Criteria**

1. WHEN o administrador abre Integrações THEN the system SHALL ler `GET /api/admin/moodle` e `GET /api/admin/mcp` e mostrar sob o nome de cada item da coluna uma linha de estado: Moodle `Não configurado` (`configurada=false`), `Ativo` (`configurada=true` e `ativa=true`) ou `Desativado` (`configurada=true` e `ativa=false`); MCP `Sem tokens ativos` (nenhum token com estado `ATIVO`), `1 token ativo` ou `N tokens ativos`
2. WHILE uma das leituras carrega the system SHALL mostrar o item sem linha de estado, e IF a leitura falha THEN the system SHALL mostrar `Indisponível` nessa linha sem bloquear o outro item nem o painel
3. WHERE a coluna não cabe (abaixo de 896 px de largura útil) the system SHALL mostrar o estado no texto de cada opção do seletor, no formato `Moodle · Ativo`
4. The system SHALL mostrar no cabeçalho de cada painel o mesmo estado, numa etiqueta ao lado do título
5. WHEN o administrador salva o Moodle, cria ou revoga um token THEN the system SHALL atualizar a linha de estado sem recarregar a página

### S2: Moodle campo a campo (P1)

Quem configura sabe onde colar cada endereço, quando terminou e o que testar.

6. The system SHALL mostrar ao lado de cada um dos três endereços do One o nome do campo do Moodle onde ele é colado: `URL de login` -> `Initiate login URL`, `URL de redirecionamento` -> `Redirection URI(s)`, `URL das chaves públicas` -> `Public keyset`
7. The system SHALL manter rótulo e dica de cada um dos cinco campos fora do campo e sempre visíveis, sem o atributo `placeholder` em nenhum campo do formulário do Moodle
8. WHEN o administrador salva o Moodle com a entrada ligada THEN the system SHALL mostrar abaixo do botão um aviso fixo `Moodle salvo e ativo.` seguido de `Para testar, abra a atividade One no Moodle com uma conta de aluno.`
9. WHEN o administrador salva o Moodle com a entrada desligada THEN the system SHALL mostrar o aviso fixo `Moodle salvo, mas a entrada pelo Moodle está desligada.`
10. WHEN o administrador altera qualquer campo depois de salvar THEN the system SHALL retirar o aviso fixo
11. IF o salvar falha THEN the system SHALL manter tudo o que foi digitado e mostrar o erro junto do campo, como hoje

### S3: token do MCP com revelação única (P1)

A ação principal é criar um token; o segredo aparece uma vez, inteiro, e só se fecha de propósito.

12. The system SHALL mostrar no cabeçalho do painel MCP um botão `Novo token` e SHALL retirar da página o formulário fixo de criação
13. WHEN o administrador clica em `Novo token` THEN the system SHALL abrir um diálogo `Novo token` com os campos `Nome` e `Validade` (30, 90 ou 365 dias, padrão 90) e os botões `Criar token` e `Cancelar`, com o exemplo do nome (`Ex.: Cursor no meu notebook`) como dica visível fora do campo
14. WHEN o token é criado THEN the system SHALL trocar o conteúdo do mesmo diálogo para `Copie o token agora`, com o aviso de que ele não será mostrado de novo, o token inteiro visível, o comando do Claude Code e o `mcp.json` do Cursor já com o token real, e um botão `Já copiei` que fecha o diálogo
15. WHEN o administrador copia um valor da revelação THEN the system SHALL trocar o texto do botão que ele clicou para `Copiado` por 2 segundos
16. WHILE a revelação do token está aberta the system SHALL ignorar clique fora e a tecla Esc, e SHALL fechar só pelo botão `Já copiei`
17. IF a criação falha THEN the system SHALL mostrar o erro dentro do diálogo e manter o nome digitado
18. WHEN a lista de tokens está vazia THEN the system SHALL mostrar `Nenhum token ainda.` com o botão `Criar token`, que abre o mesmo diálogo
19. The system SHALL manter a revogação de token como hoje: botão `Revogar` só em token `ATIVO`, confirmação destrutiva, efeito na próxima requisição

## Out of scope

| Excluded | Why |
| --- | --- |
| botão `Testar conexão` | exige rota nova; o One não inicia o lançamento LTI e o MCP é só leitura sem teste de ponta a ponta |
| assistente em várias telas (wizard) | são 2 integrações e 5 campos; o custo de desenhar estado e foco por passo não se paga (`pesquisa.md`) |
| escopos por token, token sem validade, renovação | muda a API e a regra de segurança do `mcp-one` (AD-049) |
| OAuth para Claude.ai e ChatGPT na web | já dito na tela; feature própria |
| barra de salvar fixa e rótulo flutuante | a pesquisa recomenda rótulo fora do campo; a barra de baixo conflita com a barra de navegação do celular (AD-050) |
| nova integração | esta feature só melhora as duas existentes |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| nomes dos campos do Moodle | `Initiate login URL`, `Redirection URI(s)`, `Public keyset`, como na documentação em inglês dos fornecedores de LTI | o menu do Moodle da Univag pode estar traduzido; o texto em inglês é o que os guias dão | n |
| o que a revelação ignora | clique fora e Esc | a pesquisa descreve o fechamento acidental antes de copiar como a falha grave dessa tela | n |
| onde fica o estado | na coluna, no seletor e no cabeçalho do painel | a pessoa que usa o seletor no celular também precisa ver | n |
| leitura das duas integrações na abertura | as duas rodam ao abrir a página, com as mesmas chaves de cache dos painéis | evita pedido duplicado e deixa o estado atualizar sozinho (critério 5) | n |
| diálogo do `Novo token` | o mesmo de Cadastros (tela cheia no celular, janela no computador) | o administrador já conhece; o construtor decide o componente | n |
| `Copiado` | volta ao texto `Copiar` após 2 segundos | tempo curto o bastante para a ação seguinte | n |

**Open questions:**

| # | Kind | Question | Until answered |
| --- | --- | --- | --- |
| 1 | open | Como o Moodle da Univag mostra os nomes dos três campos em português? | o critério 6 usa os nomes em inglês dos guias; trocar é só texto |

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen Integrações | empty state | AC 18 (tokens) e AC 1 (`Não configurado`, `Sem tokens ativos`) |
| screen Integrações | loading state | AC 2 |
| screen Integrações | error state | AC 2 e AC 11 e AC 17 |
| screen Integrações | unauthorised state | existing - só `ADMINISTRADOR` vê o item e a rota (provado em `integracoes-admin`) |
| screen Integrações | density and ordering | AC 1 e AC 12 (estado sob o nome; ação principal no cabeçalho) |
| screen Integrações | destructive action confirms | AC 19 |
| diálogo Novo token | empty, loading, error | AC 13, AC 17 |
| diálogo Novo token | unauthorised | n/a - só abre dentro da tela que já exige o papel |
| diálogo Novo token | destructive action confirms | n/a - criar não destrói; o fechamento acidental da revelação é o AC 16 |
| celular 360×780 | critério | o seletor mostra `Moodle · Ativo`; o diálogo ocupa a tela; sem rolagem horizontal (AC 3, AC 13) |
| celular deitado 844×390 | critério | mesma regra; o botão `Já copiei` alcança-se rolando o diálogo (AC 14) |
| teclado aberto | critério | o campo `Nome` do diálogo fica dentro da janela com o teclado (AC 13) |
| toque | critério | `Novo token`, `Copiar`, `Já copiei` e o seletor medem 44 px ou mais (AC 12, AC 14, AC 3) |
| API | versioning, rate limits, error shape | n/a - nenhuma rota nova nem alterada |

## Sources

- `.specs/features/integracoes-guiadas/pesquisa.md` - achados P1 a P6 com as fontes
- `.specs/STATE.md` AD-046 (diálogo e página de Cadastros), AD-048 (Moodle), AD-049 (MCP), AD-050 (celular)
