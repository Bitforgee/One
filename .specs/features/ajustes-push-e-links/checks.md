# Ajustes: push desligado sem erro e links da resposta sem frase solta - checks

Profile: standard

## Intent

Dois defeitos que o usuário viu no app real em 04/11/2026.

1. **404 no console em toda tela.** Quando o servidor não tem o par de chaves VAPID, o push fica desligado
   (AD-022, `web-push` C3). Mesmo assim, o `AvisosPush.tsx` pede `GET /api/push/chave` em toda tela autenticada, e a
   API responde `404`. O navegador registra todo 4xx como erro, então quem abre o console vê um erro em cada tela, e
   quem monitora erros de front-end recebe ruído.
2. **Frase solta antes do botão do link.** O modelo segue a regra 4 do prompt e escreve "Você também pode acessar
   diretamente: https://portal...". O `separarLinks` (`web/src/LinksDaResposta.tsx`) tira o link do texto e troca os
   dois-pontos por ponto. Sobra "Você também pode acessar diretamente.", solta, acima do botão. Um link no meio da
   frase também some e quebra o texto: o caso de teste atual transforma "Veja (url) e url, ou url!" em "Veja e, ou!".

Depois desta mudança:
- **Push desligado:** a API responde `204` sem corpo a `GET /api/push/chave`. É uma resposta de sucesso, o navegador
  não registra erro e a web não mostra o botão de avisos. `POST` e `DELETE` de subscrição não mudam.
- **Links no fim da resposta** (os que vêm depois do último texto, com espaço ou pontuação entre eles) viram botões
  abaixo do texto, e a frase que os apresenta termina em dois-pontos: "Você também pode acessar diretamente:".
- **Links no meio do texto** ficam na frase como um link curto (domínio e caminho, como o rótulo do botão), que abre
  em nova aba. Esses não viram botão.

Escopo: `api/Chamados/VerChavePush.cs`, `web/src/AvisosPush.tsx`, `web/src/LinksDaResposta.tsx` (e o componente que
desenha o texto do balão do assistente, se for preciso para o link no meio do texto) e os testes. Não muda o prompt nem
a conferência de links do servidor (`Conferencia.LinksConferem`). A única mudança de contrato é o status de
`GET /api/push/chave` com o push desligado, de `404` para `204`, consumido só pelo `web/` deste repositório.

7 checks · 0 one-way doors · 0 perguntas abertas

**Como as provas rodam.** API: `docker compose up -d postgres mailpit minio` e uma execução de `dotnet test` por vez.
Web: `cd web && npx vitest run <arquivo> -t "<nome>"`. Navegador: `npm --prefix web run build`,
`npx vite preview --port 5199` em `web/` e `E2E_URL=http://localhost:5199 npx playwright test e2e/<arquivo> -g "<nome>"`.
O nome em cada `Proof:` é o contrato (L-022). Classes e arquivos novos: `PushRotasTests.Chave_204_sem_par_completo`,
`web/src/links.test.tsx` e o teste novo em `web/e2e/push.spec.ts`.

**Asserções existentes que podem mudar** (lista fechada; cada edição listada no `## Handoff`):
1. `api.Tests/PushRotasTests.cs`: no teste `Sem_par_completo_404_nas_duas_rotas`, só o status de `GET /api/push/chave`
   passa de `404` para `204`; o `POST` continua `404`.
2. Os testes da web que simulam `GET /api/push/chave` com `404` para o push desligado (`assistente/avisos.test.tsx`,
   `acesso/navegacao.test.tsx` e os de `e2e/` que o façam) passam a simular `204`.
3. `web/src/assistente/conversa.test.tsx`: a tabela `separarLinks(%j)` e o teste "link da resposta vira botão que abre
   em nova aba" passam a esperar os dois-pontos e o link no meio do texto.

## Checks

### S1 - Push desligado sem erro no console (P1)

**C1** - Sem o par completo de chaves VAPID, `GET /api/push/chave` com o cookie de um aluno responde `204` sem corpo em cada um dos 3 estados da configuração (as duas vazias, só a pública, só a privada). `POST /api/push/subscricao` continua `404` nos mesmos 3 estados, e com as duas chaves `GET` continua `200` com `chavePublica` (Intent 1)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushRotasTests.Chave_204_sem_par_completo"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushRotasTests.Chave_200_com_a_chave_configurada"`

**C2** - Na web, com `GET /api/push/chave` respondendo `204`: o botão de avisos não aparece na barra nem na gaveta, a linha "Avisos no celular" não aparece na Conta, e nenhum erro é lançado (Intent 1)
Proof: `cd web && npx vitest run src/assistente/avisos.test.tsx -t "push desligado com 204 esconde os avisos"`

**C3** - No Chromium, abrindo o Assistente, a Fila e a Conta com `GET /api/push/chave` respondendo `204`, o console não registra nenhuma mensagem de erro (`page.on('console')` com tipo `error` e `page.on('pageerror')`), e nenhuma requisição responde 4xx (Intent 1)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/push.spec.ts -g "push desligado não deixa erro no console"`

### S2 - Links da resposta sem frase solta (P1)

**C4** - `separarLinks` devolve, em 6 casos (table-driven):
- "Você também pode acessar diretamente: https://portal.univag.edu.br/financeiro/boletos" → texto "Você também pode acessar diretamente:", botões `["https://portal.univag.edu.br/financeiro/boletos"]`;
- "Gere a segunda via no portal: https://portal.edu.br/boletos." → "Gere a segunda via no portal:", botões `["https://portal.edu.br/boletos"]`;
- "Fica em Financeiro > Boletos: https://a.edu.br/b" → "Fica em Financeiro > Boletos:", botões `["https://a.edu.br/b"]`;
- "Acesse o portal https://a.edu.br/x" (sem dois-pontos) → "Acesse o portal:", botões `["https://a.edu.br/x"]`;
- "Veja os dois: https://a.edu.br e https://b.edu.br" → "Veja os dois:", botões `["https://a.edu.br", "https://b.edu.br"]` (os dois links finais, com só "e" entre eles);
- "Sem link aqui." → igual, sem botões.

(Intent 2)

Proof: `cd web && npx vitest run src/links.test.tsx -t "links finais viram botões e a frase termina em dois-pontos"`

**C5** - Um link no meio do texto fica na frase. A resposta "Veja https://a.edu.br/boletos para emitir a segunda via. Depois, confira o valor." mostra o texto inteiro com "a.edu.br/boletos" no lugar da URL, como `a[href="https://a.edu.br/boletos"]` com `target="_blank"` e `rel="noreferrer"`, sem `https://` visível, e nenhum botão de link abaixo do texto. Uma resposta com um link no meio e outro no fim mostra o do meio na frase e o do fim como botão (Intent 2)
Proof: `cd web && npx vitest run src/links.test.tsx -t "link no meio do texto fica na frase como link curto"`

**C6** - O chat do aluno e a conversa vista pela equipe no detalhe do chamado mostram os links da mesma forma: com a resposta "Você também pode acessar diretamente: https://portal.univag.edu.br/financeiro/boletos", os dois balões terminam em "acessar diretamente:" e têm 1 botão `a[href]` com o rótulo `portal.univag.edu.br/financeiro/boletos` (Intent 2; `revisao-ux` C68)
Proof: `cd web && npx vitest run src/links.test.tsx -t "chat e conversa da equipe mostram os links igual"`

### S0 - Invariantes

**C7** - A suíte da API, a suíte Vitest, `npm --prefix web run build` e a suíte de arranjo (`arranjo`, `celular`, `aparencia`, `instituicoes`, `push`, `ux`) passam em `HEAD`. As únicas edições em asserções existentes são as da lista fechada. `crapper` sai 0 no limite 9.99 e `dryer` não acha candidato (comandos do `revisao-ux` C60 e C61) (Intent)
Proof: `dotnet test api.Tests`
Proof: `cd web && npx vitest run`
Proof: `npm --prefix web run build`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/arranjo.spec.ts e2e/celular.spec.ts e2e/aparencia.spec.ts e2e/instituicoes.spec.ts e2e/push.spec.ts e2e/ux.spec.ts`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| `GET /api/push/chave` statuses (3) | 200 C1 · 204 C1 · 401 C7 (suíte inteira, `PushRotasTests.Sem_cookie_401_nas_tres_rotas` sem mudança) | - |
| estados da configuração (4) | as duas vazias C1 · só a pública C1 · só a privada C1 · as duas preenchidas C1 | - |
| lugares dos avisos (3) | botão da barra C2 · gaveta C2 · linha da Conta C2 | - |
| telas sem erro no console (3) | Assistente C3 · Fila C3 · Conta C3 | - |
| formas de link (6) | final com dois-pontos C4 · final com ponto depois C4 · final depois de ">" C4 · final sem dois-pontos C4 · dois finais C4 · sem link C4 | - |
| posição do link (3) | só no fim C4 · só no meio C5 · no meio e no fim C5 | - |
| onde a resposta aparece (2) | chat do aluno C6 · conversa da equipe C6 | - |

## Swept

- validation: n/a - não há entrada nova; `separarLinks` lê o texto já conferido pelo servidor (`Conferencia.LinksConferem`)
- failure modes: C2 (204 não lança erro na web)
- idempotency: n/a - leituras e formatação de texto
- authorization: existing - `GET /api/push/chave` continua exigindo sessão (`Sem_cookie_401_nas_tres_rotas`)
- concurrency: n/a - nada é gravado
- data lifecycle: n/a - nada é gravado
- dependency failure: n/a - sem dependência nova
- state transitions: n/a - sem estado
- observability: C3 (o console fica sem erro quando o push está desligado)

## Handoff

Tamanho: `VerChavePush.cs`, `AvisosPush.tsx`, `LinksDaResposta.tsx`, `Balao.tsx`, `PushRotasTests.cs`,
`avisos.test.tsx`, `navegacao.test.tsx`, `conversa.test.tsx` e `push.spec.ts`: cerca de 60 KB (~15k), mais ~6k novos. Um
construtor só, sem pergunta.

- Mecanismo: um construtor
