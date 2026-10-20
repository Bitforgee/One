# Registro de testes de software

Este capítulo registra os resultados dos testes descritos no plano de testes de software. Os números do Quadro 9.1 são os informados no relatório de homologação e no README do protótipo. Os números do back-end vêm da execução de 16/10/2026. Em 20/10/2026, depois da reorganização do repositório, todas as suítes foram executadas de novo (Quadro 9.4).

## Resultados do protótipo

Segundo o relatório de homologação, a regressão final foi executada a partir da pasta `prototipo-visual/`, com o servidor estático ativo na porta 4178. O Quadro 9.1 mostra os resultados.

Quadro 9.1 — Resultados das suítes do protótipo

| Suíte | Comando | Resultado informado | Código de saída |
| --- | --- | --- | --- |
| Unitários e integração | `node tests/run-headless.mjs` | 67 ok, 0 falhas | 0 |
| Smoke de navegação | `node tests/smoke-app.mjs` | 20/20 cenários ok | 0 |
| Erros de console | `node tests/console-check.mjs` | 0 erros JS (8 rotas) | 0 |
| Acessibilidade estrutural | `node tests/a11y-check.mjs` | 0 avisos estruturais (7 telas) | 0 |
| Ponta a ponta por CDP | `node tests/e2e.mjs` | 20/20 verificações reais ok | 0 |
| Regressão do defeito D1 | `node tests/reclassificar-closed.mjs` | 4/4 ok | 0 |

Fonte: elaborado pelos autores (2026), com base no relatório de homologação do protótipo.

O README do protótipo traz os mesmos números: 67 testes unitários e de integração, 20 cenários de smoke, 0 erros de JavaScript nas rotas-chave, 0 avisos de acessibilidade estrutural e 20 verificações ponta a ponta.

Segundo os relatórios de reformulação visual e de responsividade, as cinco suítes principais foram executadas de novo depois de cada uma dessas mudanças. Os resultados ficaram iguais aos do Quadro 9.1, sem regressão.

Segundo o relatório de responsividade, a largura da página também foi medida pelo CDP em 10 larguras de tela, 5 páginas, 2 temas e 2 estados da barra lateral. Foram 200 medições e 0 falhas: nenhuma página teve rolagem horizontal.

## Resultados do back-end

Os testes de integração do back-end foram executados em 16/10/2026, quando o projeto ficava na pasta `backend/` do repositório `One`. O Quadro 9.2 mostra os resultados.

Quadro 9.2 — Resultados dos testes do back-end

| Caso de teste | Teste | Resultado |
| --- | --- | --- |
| CT-01 — Verificação de saúde | `Health_returns_200_with_body_Healthy` | Aprovado |
| CT-02 — OpenAPI em desenvolvimento | `OpenApi_document_is_served_in_Development` | Aprovado |
| CT-03 — OpenAPI fora de desenvolvimento | `OpenApi_document_is_not_served_in_Production` | Aprovado |
| CT-04 — Endpoint de exemplo removido | `Template_sample_endpoint_is_removed` | Aprovado |

Fonte: elaborado pelos autores (2026).

Total: 4 testes, 4 aprovados, 0 com falha.

## Defeito encontrado

A homologação do protótipo encontrou um defeito comprovado, descrito no Quadro 9.3.

Quadro 9.3 — Defeito encontrado na homologação

| Item | Descrição |
| --- | --- |
| Identificação | D1 |
| Regra violada | Um chamado fechado é final e não aceita alterações. |
| Onde | Função `reclassificar` de `js/services/ticket-service.js`. |
| Como foi provado | Em um chamado fechado, todas as ações foram bloqueadas, exceto a reclassificação, que mudou a categoria e acrescentou um evento ao histórico. |
| Severidade | Menor. Nenhum botão ou menu da interface chama essa função, então o usuário final não chegava ao defeito. |
| Correção | Uma linha: a mesma verificação de chamado fechado que as outras ações já faziam. |
| Verificação | A regressão `tests/reclassificar-closed.mjs` passou 4/4, e as cinco suítes continuaram sem falhas. |

Fonte: elaborado pelos autores (2026), com base no relatório de homologação do protótipo.

## Reexecução após a reorganização

Em 20/10/2026, a documentação, o back-end e o protótipo foram reunidos em um só repositório. Para confirmar que nada quebrou, as suítes foram executadas de novo a partir das novas pastas. As do protótipo rodaram em `src/prototipo/`, com o servidor estático ativo na porta 4178. Os testes do back-end rodaram com `dotnet test src/backend/One.slnx`. O Quadro 9.4 mostra os resultados.

Quadro 9.4 — Reexecução dos testes em 20/10/2026

| Suíte | Comando | Resultado | Código de saída |
| --- | --- | --- | --- |
| Unitários e integração (protótipo) | `node tests/run-headless.mjs` | 67 ok, 0 falhas | 0 |
| Smoke de navegação (protótipo) | `node tests/smoke-app.mjs` | 20/20 cenários ok | 0 |
| Erros de console (protótipo) | `node tests/console-check.mjs` | 0 erros de JavaScript | 0 |
| Acessibilidade estrutural (protótipo) | `node tests/a11y-check.mjs` | 0 avisos estruturais | 0 |
| Ponta a ponta por CDP (protótipo) | `node tests/e2e.mjs` | 20/20 verificações ok | 0 |
| Regressão do defeito D1 (protótipo) | `node tests/reclassificar-closed.mjs` | 4/4 ok | 0 |
| Integração (back-end) | `dotnet test src/backend/One.slnx` | 4 aprovados, 0 com falha | 0 |

Fonte: elaborado pelos autores (2026).

Os resultados são os mesmos dos Quadros 9.1 e 9.2.

## Relatório de testes de software

**Pontos fortes.** Segundo o relatório de homologação, a jornada principal e as regras de negócio estão, em sua maior parte, cobertas por teste automático ou por interação real no navegador. Na jornada, o aluno pergunta ao assistente, abre o chamado, o atendente responde e resolve, o aluno confirma e o administrador vê os indicadores. O único defeito comprovado era inalcançável pela interface e foi corrigido sem regressão. O veredito do relatório é que o protótipo está adequado para demonstração e apresentação acadêmica.

**Fragilidades e pendências.** O relatório de homologação lista estes pontos:

- **Indicadores (P1).** Só parte dos indicadores está implementada, com definições simplificadas. As métricas implementadas conferem com o cálculo à mão, mas o critério de aceite AC9 não é atendido por completo.
- **Responsividade (P2).** Não foi reexecutada na homologação. Depois, o relatório de responsividade registrou as 200 medições sem rolagem horizontal.
- **Acessibilidade (P3).** Só a acessibilidade estrutural foi verificada. A conformidade completa com a WCAG 2.2 AA exige teste manual com tecnologia assistiva, que não foi feito.
- **E-mail.** O envio de e-mail ao aluno não foi implementado, porque o protótipo não tem back-end.
- **Ambiente.** Execuções sobrepostas da suíte ponta a ponta podem travar a sessão do Chrome. Ela deve rodar sozinha.

O protótipo também tem limitações intencionais: não há back-end, autenticação real nem IA, e os cadastros administrativos são só de leitura, exceto os artigos.

**Back-end.** A API ainda tem só a estrutura inicial, e os quatro testes cobrem essa estrutura: verificação de saúde, documento OpenAPI e remoção do endpoint de exemplo. As funcionalidades do produto ainda não foram implementadas na API.

Registro de evidência em vídeo de cada caso de teste: [a preencher pelo grupo].

Ações do grupo para corrigir as fragilidades: [a preencher pelo grupo].
