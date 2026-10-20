# Programação de funcionalidades

Este capítulo mostra o que já funciona no projeto. Hoje há duas partes: o protótipo visual, que simula o fluxo completo no navegador, e o back-end, que ainda tem só a estrutura inicial da API. Os requisitos citados usam a numeração nova do capítulo de especificação do projeto.

## Funcionalidades do protótipo

O Quadro 7.1 lista as funcionalidades do protótipo visual e os requisitos funcionais que cada uma cobre. Todas rodam só no navegador, com dados fictícios. Nenhuma delas tem back-end.

Quadro 7.1 — Funcionalidades do protótipo visual

| Funcionalidade | Perfil | RFs cobertos (novos IDs) | Situação |
| --- | --- | --- | --- |
| Login demonstrativo: o usuário escolhe um perfil, sem senha | Aluno, Atendente, Administrador | Nenhum (a autenticação é o RNF-15) | Simulado no protótipo (sem back-end) |
| Assistente acadêmico em chat: responde só com artigos publicados, mostra o artigo usado, pergunta "Isso resolveu?" com Sim e Não, avisa quando não há artigo e oferece abrir solicitação | Aluno | RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07 | Simulado no protótipo (sem back-end) |
| Consulta à base de conhecimento: busca por palavra-chave, filtro por categoria e leitura do artigo | Aluno, Atendente | RF-24, RF-25 | Simulado no protótipo (sem back-end) |
| Gestão da base de conhecimento: criar, editar, publicar e arquivar artigos nas situações rascunho, publicado e arquivado, com nova versão ao editar um artigo publicado | Administrador | RF-24, RF-25, RF-26 | Simulado no protótipo (sem back-end) |
| Criação de solicitação: a partir da conversa ou do "Novo atendimento", com confirmação, contexto da conversa e protocolo `ONE-n` sequencial | Aluno | RF-08, RF-09, RF-10 | Simulado no protótipo (sem back-end) |
| Classificação e roteamento: setor definido pela categoria ou pela coordenação do curso, com setor de triagem quando não há regra | Aluno (automático na criação) | RF-11, RF-12 | Simulado no protótipo (sem back-end) |
| Minhas solicitações: lista com busca e filtros; detalhe com histórico, resposta do aluno, confirmação ou rejeição da resolução e cancelamento | Aluno | RF-10, RF-15, RF-18 | Simulado no protótipo (sem back-end) |
| Fila do setor e visões por estado: em atendimento, aguardando aluno e resolvidos | Atendente | RF-11, RF-15 | Simulado no protótipo (sem back-end) |
| Atendimento: assumir, resposta pública, nota interna invisível ao aluno e aguardar aluno; mensagens enviadas não podem ser editadas | Atendente | RF-15, RF-18, RF-19 | Simulado no protótipo (sem back-end) |
| Encaminhamento para um setor diferente, com motivo obrigatório | Atendente | RF-20 | Simulado no protótipo (sem back-end) |
| Resolução com texto e confirmação pelo aluno; o chamado fechado não aceita mudanças | Atendente, Aluno | RF-15, RF-16 | Simulado no protótipo (sem back-end) |
| Histórico do chamado em linha do tempo, só com acréscimos | Aluno, Atendente, Administrador | RF-23 | Simulado no protótipo (sem back-end) |
| Indicadores com gráficos SVG próprios, de barras e de rosca | Administrador | RF-27 (parcial) | Simulado no protótipo (sem back-end) |
| Lista de todos os chamados | Administrador | Nenhum (a visibilidade por perfil é o RNF-13) | Simulado no protótipo (sem back-end) |
| Consulta de usuários, cursos, setores, categorias e regras de encaminhamento, só para leitura | Administrador | Nenhum (RF-28, RF-29 e RF-30 ainda não cobertos) | Simulado no protótipo (sem back-end) |
| Tema claro e tema escuro salvos no navegador, e layout responsivo do computador ao celular | Aluno, Atendente, Administrador | Nenhum (compatibilidade é o RNF-02) | Simulado no protótipo (sem back-end) |

Fonte: elaborado pelos autores (2026), com base no README e no relatório de homologação do protótipo.

Algumas regras aparecem só em parte no protótipo, porque dependem de back-end:

- RF-05: o desfecho "abandonada" depende de uma janela de inatividade. O protótipo não tem esse controle por tempo.
- RF-13: os dados de demonstração têm um setor de triagem marcado. Como os cadastros são só para leitura, a recusa de configuração sem triagem não é exercitada.
- RF-14: a reclassificação existe no código de serviço do protótipo, mas não tem botão na interface.
- RF-22: o envio de e-mail ao aluno não foi feito. O protótipo apenas sinaliza esse ponto.
- RF-27: o painel calcula só uma parte dos indicadores, com definições simplificadas. Faltam, por exemplo, as taxas de autoatendimento e de abandono e os tempos de primeira resposta e de resolução.
- RF-17 e RF-21: o README e o relatório de homologação do protótipo não citam a troca de responsável entre atendentes nem os anexos. A cobertura desses requisitos é [a preencher pelo grupo].

O assistente não usa inteligência artificial. Ele compara palavras-chave da pergunta com os artigos publicados. O login não é autenticação real, e as permissões são verificadas só no navegador.

O protótipo tem verificações automáticas próprias. Segundo o README e o relatório de homologação, a suíte de unidade e integração tem 67 testes, o teste de navegação tem 20 cenários e o teste ponta a ponta no navegador tem 20 verificações, todos aprovados. Esses números foram copiados dos relatórios e não foram executados de novo para este documento.

## Back-end

O back-end fica em `backend/` no repositório `Bitforgee/One`. É uma ASP.NET Core Web API em .NET 10, no projeto `backend/One.Api`.

Hoje a API tem só a estrutura inicial:

- `GET /health` responde `Healthy`, para verificar se a API está no ar.
- Em ambiente de desenvolvimento, o documento OpenAPI fica em `/openapi/v1.json`. Em produção, esse endereço não existe.
- O endpoint de exemplo do modelo do .NET (`/weatherforecast`) foi removido.

O projeto `backend/One.Api.Tests` tem 4 testes de integração, escritos com xUnit e `WebApplicationFactory`:

1. `GET /health` responde 200 com o texto `Healthy`.
2. O documento OpenAPI é servido em desenvolvimento.
3. O documento OpenAPI não é servido em produção.
4. O endpoint de exemplo `/weatherforecast` responde 404.

Os 4 testes passaram com `dotnet test backend/One.slnx` em 16/10/2026.

Ainda não há endpoints de negócio, banco de dados nem autenticação. A pasta `frontend/` também ainda não tem código: o grupo vai escolher entre TypeScript e JavaScript antes de criar o projeto React.

O próximo passo planejado é a primeira fatia vertical, descrita na Fase 3 do roadmap do projeto. A ideia é ter o fluxo completo de ponta a ponta, e não módulos pela metade. A ordem prevista dos módulos é:

1. Identidade e acesso.
2. Base de conhecimento, com versões e publicação.
3. Assistente que só responde com a base, com Sim e Não.
4. Conversa que vira chamado com o contexto.
5. Roteamento por categoria, setor ou coordenação do curso, com triagem.
6. Ciclo de vida e atendimento: estados, encaminhamento, notas e e-mail.
7. Histórico auditável.
8. Indicadores, em um painel mínimo.

O roadmap marca a demonstração das funcionalidades implementadas para 27, 28 e 30/10/2026.

## Instruções de acesso

O protótipo publicado pode ser aberto em qualquer navegador, no computador ou no celular, sem instalar nada: <https://bitforgee.github.io/prototipo-v1-one/>. A página abre na seleção de perfis. Basta escolher Aluno, Atendente ou Administrador.

Para rodar o protótipo no próprio computador, clone o repositório `prototipo-v1-one` e suba um servidor estático na pasta `prototipo-visual/`. É preciso ter Node ou Python instalado:

```powershell
cd prototipo-visual
node tests/static-server.mjs 4178      # ou: py -m http.server 4178
```

Depois, abra `http://localhost:4178` e escolha um perfil. Para voltar aos dados iniciais, use o menu do usuário e a opção **Restaurar dados demonstrativos**. O parâmetro `?theme=dark` ou `?theme=light` força o tema.

Com o servidor ativo, os testes do protótipo rodam a partir de `prototipo-visual/`:

```powershell
node tests/run-headless.mjs    # unidade e integração
node tests/smoke-app.mjs       # navegação
node tests/console-check.mjs   # erros de JavaScript
node tests/a11y-check.mjs      # acessibilidade estrutural
node tests/e2e.mjs             # ponta a ponta no navegador
```

Para rodar a API, é preciso ter o SDK do .NET 10. A partir da raiz do repositório `One`:

```bash
dotnet run --project backend/One.Api
```

A API sobe em `http://localhost:5221`. O endereço `http://localhost:5221/health` deve responder `Healthy`.

Para rodar os testes da API:

```bash
dotnet test backend/One.slnx
```

## Repositórios

- Projeto One (documentação, back-end e front-end): <https://github.com/Bitforgee/One>
- Protótipo visual e documentos de origem: <https://github.com/Bitforgee/prototipo-v1-one>
