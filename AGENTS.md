# AGENTS.md
<!-- Lido por Claude Code, opencode, Codex e outros agentes em TODA conversa. Mantenha curto (< 200 linhas).
     Não crie CLAUDE.md; se uma ferramenta exigir, deixe nele só a linha @AGENTS.md. -->

## Projeto
One: helpdesk acadêmico multi-instituição. O aluno conversa com um assistente de IA que responde só com
fontes publicadas da instituição (RAG) e pode falar com um atendente a qualquer momento; a equipe atende
os chamados (protocolo ONE-n), mantém a base de conhecimento e acompanha os indicadores. Univag é a primeira instituição.

- Backend: .NET 10 / ASP.NET Core minimal APIs / EF Core 10 + Npgsql / PostgreSQL 18 + pgvector, pasta `One.Api/`
- Web: React 19 + Vite 8 + TypeScript, PWA (`vite-plugin-pwa`), Tailwind v4 + shadcn/ui, pasta `web/`
- Infra local: `docker-compose.yml` (postgres, mailpit, minio, api). Solução: `One.slnx`
- Requisitos `RF-NN`/`RNF-NN`/`UC-NN`: repositório de requisitos One, `docs/requisitos/conteudo.md` (AD-003)
- Decisões do projeto: `.specs/STATE.md` (`AD-NNN`). Uma decisão ativa vale mais do que o código antigo.

## Comandos (rode e mostre a saída; não presuma que funciona)

| O quê | Comando |
|---|---|
| Subir dependências | `docker compose up -d postgres mailpit minio` (os testes da API usam 5432, 9000 e 1025) |
| Build .NET | `dotnet build One.slnx` (complexidade ciclomática > 10 quebra o build: CA1502, AD-018) |
| Testes .NET | `dotnet test One.Api.Tests` (cada classe cria o próprio banco `one_teste_*` no Postgres do compose) |
| Rodar API | `dotnet run --project One.Api` → http://localhost:5226 (aplica as migrations na subida) |
| Web: instalar | `npm --prefix web ci` |
| Web: dev | `npm --prefix web run dev` (proxy de `/api` e do hub para a 5226) |
| Web: tipos + build | `npm --prefix web run build` (gera `One.Api/wwwroot`) |
| Web: testes | `npm --prefix web test` (Vitest + Testing Library) |
| Web: cobertura | `npm --prefix web run coverage` |
| E2E | `docker compose up -d --build` e depois `npm --prefix web run e2e` (Playwright contra :8080, 1 worker) |
| Nova migration | `dotnet ef migrations add <Nome> --project One.Api --output-dir Dados/Migracoes` (`dotnet tool restore` antes) |

- Gates do `web/` (AD-018): `crapper` abaixo de CRAP 10 e `dryer` sem candidato a 0.8, rodados dentro de `web/`.
  `mutator` está suspenso (AD-025): não rode; check de mutação fica aberto como "suspenso por decisão do usuário".
- Scripts Python das skills: `python3`; no Windows, `python`.

## Como trabalhar aqui: Spec-Driven Development (SDD)
Todo trabalho que muda comportamento segue SDD: primeiro a especificação aprovada por um humano, depois as
obrigações com prova, depois o código, e no fim uma verificação feita por quem não escreveu o código.
Os princípios valem com qualquer agente ou ferramenta. Não há skill obrigatória.

```
PLAN (plan.md, humano aprova) → CHECKS (checks.md, obrigações com prova) → BUILD → VERIFY (verificador independente)
```

1. **Antes de tudo**: leia `.specs/STATE.md` (decisões ativas e `## Handoff`) e a seção Confirmed de `.specs/LESSONS.md`.
2. **Plan** (`.specs/features/<slug>/plan.md`): o problema; critérios de aceite em EARS ("Quando <gatilho>, o
   sistema deve <resposta>"); o caminho da mudança (Flow); o que ela afeta em dados e termos (Impact); entidades
   e cardinalidade (Relations); rotas com entrada, saída e status (Surface); e as decisões difíceis de desfazer
   (schema, contrato de API, migration), cada uma com o formato literal e a alternativa rejeitada (Landing).
   Nenhum código antes do "aprovado" de um humano.
3. **Checks** (`checks.md`): cada check é uma afirmação observável com valor concreto + a prova (o teste ou
   comando cujo exit code decide), ligado a um critério. Todo status de rota e toda decisão do Landing tem check.
   Depois de aprovados, checks não mudam; check errado é parar e perguntar.
4. **Build**: testes escritos a partir dos checks, nunca lendo a implementação. Passos pequenos, build e
   testes a cada passo, commits coerentes. Decisão nova difícil de desfazer: adicione ao plano antes do código.
5. **Verify** (`verification.md`): depois do último commit, um agente novo, sem o contexto de quem construiu,
   roda a prova de cada check em `<base>..HEAD`, injeta ao menos uma falha à mão por área testada para ver se
   algum teste a pega, e escreve PASS/FAIL por check com a saída do comando. Feito = todos os checks com PASS.

- **Modelos por fase** (decisão do usuário, nov/2026): planejar (Plan e Checks) com o **Opus 5.5**; construir
  (Build) com o **Sonnet 5.5**. Troque o modelo ao mudar de fase. O Verify roda em agente novo, sem o contexto de quem construiu.
- Mudança de até ~3 arquivos e sem decisão difícil de desfazer: só `checks.md` com um parágrafo `## Intent`, sem `plan.md`.
- Fica fora do SDD só o que não muda comportamento: typo, docs, formatação, versão de dependência sem efeito.
- Nunca enfraqueça uma asserção, apague ou pule um teste para a suíte passar.
- Na dúvida entre os caminhos, pergunte antes de codar.
- Fechar com risco aceito (sem PASS) exige um AD no `STATE.md` com a decisão do dono do projeto (ex.: AD-036).
- Use as features já fechadas em `.specs/features/` como modelo de formato (ex.: `historico-frases/`).

### Se você usa a skill `tlc-spec-lean` (opcional)
O formato do `.specs/` vem dela (Tech Leads Club), e ela lê esta configuração:

profile: standard
budget: 150k

- Use `ui` em feature com tela, `standard` no resto. Os validadores da skill (`validate_*.py`) devem sair com 0.
- `LESSONS.md` e `lessons.json` são gerados pelo `lessons.py` da skill: sem a skill, não edite esses dois
  arquivos; escreva a lição no `verification.md` e quem tiver a skill registra.

## Arquitetura da API (AD-017, AD-019, AD-024)
- Fatias verticais por assunto: `One.Api/<Fatia>/`, namespace `One.Api.<Fatia>` (`Acesso`, `Administracao`,
  `Assistente`, `Chamados`, `Conhecimento`, `Indicadores`, `Instituicoes`). Compartilhado só em `One.Api/Dados/` e `One.Api/*.cs`.
- Um arquivo por caso de uso: `record` de request com `static Mapear(RouteGroupBuilder)` da própria rota,
  `Entrada`/resposta nomeadas no mesmo arquivo e o `...Handler` (`IRequestHandler`, pacote `Mediator` 3.x, não MediatR).
  Modelo: `One.Api/Chamados/ResolverChamado.cs`. Sem objeto anônimo na resposta, sem DTO compartilhado entre fatias.
- Domínio rico em `One.Api/Dados/<Agregado>/`, uma entidade por arquivo: transições de estado são métodos com setter
  privado; o domínio não referencia ASP.NET Core, Mediator nem handlers. Handler só orquestra dados e efeitos.
- Sem camadas Domain/Application/Infrastructure, sem repositório sobre o EF Core, sem `Common`/`Utils`;
  compartilhe só no terceiro uso.
- Multi-instituição (AD-008): toda tabela tem `instituicao_id` não nulo e query filter global. `IgnoreQueryFilters`
  só em `Instituicoes/InstituicaoComando.cs` e `Agendador.cs`. Tabelas e colunas em snake_case; datas `timestamptz`.
- Erros como ProblemDetails. Relógio sempre por `TimeProvider`, nunca `DateTime.Now`.
- Essas regras são testadas em `One.Api.Tests/ArquiteturaTests.cs`: mudou a regra, mude o AD primeiro.

## Web (AD-017, AD-020, AD-023)
- Fatias em `web/src/<fatia>/` (`acesso`, `administracao`, `assistente`, `chamados`, `conhecimento`,
  `indicadores`), com o teste de cada tela dentro da fatia. Pastas sem tela: `ui/` e `ilustracoes/`.
  Regra testada em `web/src/test/estrutura.test.ts`.
- `web/src/ui/` é código copiado do shadcn/ui (`new-york`); só ele importa `radix-ui`, `cva`, `clsx`, `tailwind-merge`.
  Ícones Lucide; dados com TanStack Query; formulários com React Hook Form + Zod; rotas com `react-router`; avisos com Sonner.
- Cores, fonte e tema vêm dos tokens de `web/src/index.css` e dos ADs de visual (AD-027 em diante). Não invente
  valor visual: decisão de UI nova precisa de referência pesquisada registrada no plano.
- Textos da interface em português do Brasil. Fora de `ui/`, import relativo (`../ui/button`); o alias `@/` fica só no código do shadcn.

## Testes
- API: xUnit v3 com `WebApplicationFactory` (`One.Api.Tests/Infra/OneFactory.cs`): Postgres, MinIO e Mailpit reais do
  compose; relógio (`FakeTimeProvider`), LLM e push falsos. Teste de integração bate na rota HTTP;
  regra de domínio tem teste unitário na entidade. Nomes em português: `Assumir_de_outro_troca_e_registra`.
- Web: Vitest + jsdom + Testing Library (`web/src/test/setup.ts`). E2E em `web/e2e/`; `*-real.spec.ts` usa a API de verdade.
- Nunca chame a API real de IA nem envie e-mail real em teste.

## Colaboração (duas pessoas, cada uma com seu agente; AD-043)
- Uma feature = uma pasta `.specs/features/<slug>/`. Commits direto na `main`, sem branch por feature e sem PR (AD-043, supersede o AD-039 nesse ponto); `git pull` antes de começar.
- A feature leva `plan.md`, `checks.md` e `verification.md` na própria pasta; o Verify independente é a única revisão.
- Novo `AD-NNN`: pegue o próximo número depois de atualizar a `main`; se colidir no merge, renumere o seu.
- Conflito no `OneDbModelSnapshot.cs`: `git pull --rebase`, apague a sua migration e gere de novo. Nunca edite o snapshot à mão.
- Antes de começar uma feature, confira no `## Handoff` do `STATE.md` se ninguém está nela.

## Convenções
- C#: nullable habilitado, async até o fim (sem `.Result`/`.Wait()`), `sealed record` para mensagens e DTOs.
- Código, identificadores e testes em português; comentário só para o porquê que o código não mostra.
- Commits (Conventional Commits, em inglês, como o histórico): `<tipo>(<escopo>): <resumo>`. Tipos: feat, fix,
  refactor, test, docs, chore. Ex.: `fix(chamados): name the real author in the ticket history`.

## Fontes de verdade (consulte antes de chutar uma API)
- .NET / ASP.NET Core / EF Core → MCP `microsoft-learn`
- Pacotes NuGet e npm (React, Vite, Tailwind, shadcn, TanStack, Mediator) → MCP `context7`
- Navegador real (telas, e2e, screenshots) → MCP `playwright`

## Limites
- Nunca leia, imprima ou commite segredos: `.env` (chave da IA), user secrets, tokens.
- CPF, nome e matrícula reais nunca vão para testes, logs, commits ou PRs: use dados fictícios (LGPD).
- Schema e dados mudam só por migration no código, revisada em PR, nunca direto no banco.
- Commit local é livre depois do plano aprovado. `git push`, merge na `main`, deploy e qualquer dado de produção
  só com "ok" explícito de um humano.
- Não altere: `One.Api/Dados/Migracoes/` já aplicadas, `One.Api/wwwroot/` (gerado), `bin/`, `obj/`, `.metrics/`.
