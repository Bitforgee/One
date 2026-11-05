# Aviso no celular com a marca da instituição - checks

Profile: standard

## Intent

O aviso que o aluno recebe no celular ou no computador é igual para toda instituição e todo evento:
- o título é "One";
- o texto é "Seu chamado {número} foi atualizado.", com a palavra "chamado", que a revisão de UI/UX tirou da tela do
  aluno (Lei 15.263/2025, linguagem simples);
- não vai ícone, então o sistema mostra o do navegador.

O aluno não sabe de que instituição veio o aviso nem o que aconteceu sem abrir o app. O usuário viu isso em 04/11/2026,
quando testou o push no próprio Chrome, e pediu o aviso com a marca da instituição.

Depois desta mudança, o aviso herda o que a instituição já configurou na tela Aparência (AD-032), sem campo novo:
- **Título:** o `nomeCurto` da instituição, ou o `nome` se não houver nome curto.
- **Ícone:** o ícone do app que o admin enviou (PNG quadrado de 512 px, rota pública versionada da AD-032), ou o ícone
  do One se não houver.
- **Texto:** muda com o estado do chamado no momento do envio, sempre em linguagem simples e sem dado pessoal:
  - `RESOLVIDO`: "Sua solicitação {número} foi resolvida."
  - `AGUARDANDO_ALUNO`: "Sua solicitação {número} aguarda sua resposta."
  - qualquer outro estado: "Sua solicitação {número} tem uma resposta nova."

Escopo:
- `api/Chamados/PushEnviador.cs`: o `PayloadPush`.
- `api/Agendador.cs`: onde o payload é montado no envio.
- `web/src/sw.ts`: o service worker lê o ícone.
- Os testes.

Decisões, por pedido do usuário em 04/11 ("sim, pode fazer com tlc-spec-lean"):
- **Payload com uma chave nova:** a porta 4 da `web-push`, `{"titulo","corpo","url"}`, ganha a chave `"icone"`. Só o
  service worker deste repositório consome o payload, e um service worker antigo ignora a chave nova.
- **Texto pelo estado no envio:** o texto vem do estado do chamado na hora do envio, e não do evento. Assim não há
  coluna nova em `push_saida`. Dois eventos do mesmo chamado em menos de 1 minuto mostram o estado mais recente, e a
  `tag` já faz um aviso substituir o outro.
- **Sem silhueta e sem texto da instituição:** a silhueta da barra do Android (`badge`) fica fora, porque exigiria
  processar imagem no servidor. Textos escritos pela instituição também ficam fora, porque abririam espaço para dado
  pessoal num aviso que aparece até na tela bloqueada.

9 checks · 0 one-way doors novas (a porta 4 da `web-push` só ganha uma chave) · 0 perguntas abertas

**Como as provas rodam.** API: `docker compose up -d postgres mailpit minio` e uma execução de `dotnet test` por vez.
Web: `cd web && npx vitest run <arquivo> -t "<nome>"`. O nome em cada `Proof:` é o contrato (L-022). Os testes novos
ficam em `api.Tests/PushAgendadorTests.cs` e `web/src/sw.test.ts`.

**Asserções existentes que podem mudar** (lista fechada; cada edição listada no `## Handoff`):
1. `PushAgendadorTests.Payload_exato_sem_dado_pessoal`: o payload esperado passa a ter `titulo` igual ao nome da
   instituição, `corpo` pelo estado e a chave `icone`. Os dados excluídos (nome, e-mail, CPF, texto, assunto) continuam
   excluídos.
2. Os testes de `web/src/sw.test.ts` que comparam as opções do `showNotification` ganham o `icon`.
3. `web-push/checks.md` C27 recebe uma nota de que a porta 4 ganhou `icone` aqui.

## Checks

### S1 - Payload com a marca e o texto do estado (P1)

**C1** - Numa instituição com `nomeCurto` "Univag", o payload do aviso de um chamado `EM_ATENDIMENTO` é exatamente o JSON `{"titulo":"Univag","corpo":"Sua solicitação ONE-1 tem uma resposta nova.","url":"/univag/chamados/ONE-1","icone":"/api/instituicoes/univag/imagens/icone?v=2"}`, com o ícone na versão 2 enviado e não removido (Intent)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushAgendadorTests.Payload_com_marca_da_instituicao"`

**C2** - O `corpo` segue o estado do chamado no envio, em 5 casos (table-driven): `ABERTO` e `EM_ATENDIMENTO` → "Sua solicitação {n} tem uma resposta nova."; `AGUARDANDO_ALUNO` → "Sua solicitação {n} aguarda sua resposta."; `RESOLVIDO` → "Sua solicitação {n} foi resolvida."; `FECHADO` → "Sua solicitação {n} tem uma resposta nova." (Intent)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushAgendadorTests.Corpo_pelo_estado_do_chamado"`

**C3** - Sem `nomeCurto`, o `titulo` é o `nome` da instituição. Sem ícone, ou com o ícone removido (AD-032, door 11), o `icone` é `/icons/icon-192.png` (Intent)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushAgendadorTests.Payload_padrao_sem_aparencia"`

**C4** - Nenhum payload contém "chamado", "Chamado" nem "One" como título, e continua sem nome, e-mail, CPF, texto da mensagem nem título do chamado (porta 4 da `web-push`), com os mesmos dados de teste de `Payload_exato_sem_dado_pessoal` (Intent)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushAgendadorTests.Payload_exato_sem_dado_pessoal"`

### S2 - O service worker mostra o ícone (P1)

**C5** - Com a carga `{"titulo":"Univag","corpo":"…","url":"/univag/chamados/ONE-1","icone":"/api/instituicoes/univag/imagens/icone?v=2"}`, o `showNotification` recebe o título "Univag" e as opções `body`, `tag` "ONE-1", `data.url` e `icon` "/api/instituicoes/univag/imagens/icone?v=2" (Intent)
Proof: `cd web && npx vitest run src/sw.test.ts -t "aviso com o ícone da instituição"`

**C6** - O `icon` só é aceito se for uma string que começa com "/" (caminho do próprio app); qualquer outra coisa (`https://outro.site/x.png`, `javascript:x`, número, ausente) faz o aviso usar `/icons/icon-192.png`. A carga sem JSON legível continua com o texto padrão "Sua solicitação foi atualizada." e com o mesmo ícone padrão (Intent; segurança: o aviso não carrega imagem de fora)
Proof: `cd web && npx vitest run src/sw.test.ts -t "ícone só do próprio app"`

### S0 - Invariantes

**C7** - A rota pública do ícone (`GET /api/instituicoes/{slug}/imagens/icone?v={versao}`) responde `200` sem cookie, então o service worker consegue carregá-lo; a versão no payload é a mesma que `GET /api/instituicoes/{slug}` devolve em `imagens.icone` (Intent; AD-032)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushAgendadorTests.Icone_do_payload_e_o_da_rota_publica"`

**C8** - A suíte inteira da API e a suíte Vitest passam em `HEAD`. As únicas edições em asserções existentes são as da lista fechada. `dotnet build api` passa com a barreira CA1502, e `crapper` e `dryer` passam (comandos do `revisao-ux` C60 e C61) (Intent)
Proof: `dotnet test api.Tests`
Proof: `cd web && npx vitest run`
Proof: `dotnet build api`

**C9** - De ponta a ponta, no Chrome do usuário (verificação manual de go-live, registrada no `## Handoff`): com o push ligado no `.env`, o aviso de uma resposta ao chamado de um aluno chega com o título "Univag", o ícone da instituição e o texto "Sua solicitação {n} tem uma resposta nova." (Intent)
Proof: `docker compose exec -T postgres psql -U postgres -d one -t -c "select enviado_em is not null from push_saida order by id desc limit 1"` (o servidor confirma o envio; o que aparece na tela fica como evidência manual no `## Handoff`)

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| estados do chamado no envio (5) | `ABERTO` C2 · `EM_ATENDIMENTO` C1, C2 · `AGUARDANDO_ALUNO` C2 · `RESOLVIDO` C2 · `FECHADO` C2 | - |
| origem do título (2) | `nomeCurto` C1 · `nome` C3 | - |
| origem do ícone (3) | ícone enviado C1, C7 · sem ícone C3 · ícone removido C3 | - |
| entradas de `icon` no service worker (5) | caminho do app C5 · URL de fora C6 · `javascript:` C6 · número C6 · ausente C6 | - |
| chaves do payload (4) | `titulo` C1 · `corpo` C1, C2 · `url` C1 · `icone` C1, C5 | - |

## Swept

- validation: C6 (o service worker só aceita ícone do próprio app)
- failure modes: C6 (carga ilegível volta ao padrão); existing - as falhas de envio continuam no agendador (`web-push`, testes de falha do envio)
- idempotency: existing - a `tag` por chamado faz um aviso substituir o anterior (`web-push`)
- authorization: C7 (o ícone é público por desenho, AD-032); C4 (nenhum dado pessoal no payload)
- concurrency: n/a - o texto vem do estado no envio, por decisão registrada no Intent
- data lifecycle: n/a - nada novo é guardado
- dependency failure: n/a - o ícone vem do próprio app; se a imagem falhar, o navegador mostra o aviso sem ela
- state transitions: C2 (texto por estado)
- observability: n/a - o envio já é registrado pelo agendador (`web-push`, log do agendador)

## Handoff

Tamanho: `PushEnviador.cs`, `Agendador.cs`, `sw.ts`, `PushAgendadorTests.cs` e `sw.test.ts` somam ~45 KB (~11k), mais ~5k
novos. Um construtor só, sem pergunta.

- Mecanismo: um construtor
