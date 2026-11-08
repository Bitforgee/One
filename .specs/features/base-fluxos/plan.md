# base-fluxos (E0 da evolução do One)

## Problem

Hoje, na `main` (`702765c`), três coisas estão erradas na base de fluxos que as próximas features vão estender:

- Para ser líder de turma, o estudante precisa ganhar o papel `ATENDENTE`. Quatro rotas só checam esse papel e não olham o setor: `GET /api/artigos/versoes/{id}` (`VerVersaoArtigo.cs:20`), `GET /api/documentos/versoes/{id}` (`BaixarVersaoDocumento.cs:20`), `GET /api/indicadores` (`ConsultarIndicadores.cs:21`) e o hub de tempo real (`TempoRealHub.cs:28`). Um aluno líder lê, portanto, o texto interno dos artigos e o PDF dos documentos, o que o AD-012 proíbe, e consulta indicadores. Quem paga é a instituição, que responde pelo que o assistente diz e pelo que a equipe guarda.
- Reclassificar um chamado troca só a categoria (`Chamado.Reclassificar`, `Chamado.cs:157`). O chamado continua na versão e na etapa do fluxo da categoria antiga: o botão "Subir" e o prazo seguem uma cadeia que não é a dele. Quem paga é a equipe, que vê "Subir" levar o chamado para um destino que não corresponde mais ao assunto.
- Desativar um setor que está numa etapa de fluxo publicado não avisa ninguém. A etapa passa a ser pulada em silêncio (`ResolverFluxo.Proximo` descarta `SetorInativo`) e o fluxo publicado muda de comportamento sem o gestor saber.

Além disso, a verificação de `fluxos-atendimento` está em FAIL desde a rodada 1 (`a57fac8`): sobram o C104 (`crapper.exe` bloqueado pela política do Windows neste computador, não é defeito do código) e o C106 (o comando do check inclui `anexos.spec.ts` e `plataforma.spec.ts`, que são e2e reais, e dá 502 contra o `vite preview`). Desde então vieram 7 commits, incluindo o AD-042, que substitui os checks C42, C70, C71 e C72.

Evidência: linhas de código acima; `.specs/features/fluxos-atendimento/verification.md`. Nenhuma outra fonte traz número de uso ou de incidente.

Quando isto entrar: o líder não lê mais artigo, documento nem indicador; o chamado reclassificado deixa de seguir a cadeia da categoria antiga; o gestor não desativa por engano um setor de um fluxo publicado; e a feature `fluxos-atendimento` fecha com um relatório que contabiliza todos os checks.

## Flow

Reaproveita o jeito que `Chamado.Encaminhar` já sai do fluxo (`EtapaOrdem` e `EtapaDesde` nulos) e a ligação `AtendenteSetores` + `Setor.CursoId` que já define o papel `LIDER`; nada de motor novo.

1. `PUT /api/admin/setores/{id}` -> `AlterarSetorHandler` (exists) -> `CriarSetor.Validar` (exists) - ao desativar um setor ativo, procura nele uma etapa `SETOR` da versão vigente de algum fluxo; achando, devolve 409 e não grava.
2. `POST /api/chamados/{numero}/reclassificar` -> `ReclassificarChamadoHandler` (exists) -> `Chamado.Reclassificar` (exists) - além da categoria, zera `EtapaOrdem` e `EtapaDesde`; `Agendador` (exists) e `DetalheChamado` (exists) já tratam `EtapaOrdem` nulo como "fora do fluxo".
3. `GET /api/artigos/versoes/{id}`, `GET /api/documentos/versoes/{id}` -> `VerVersaoArtigoHandler`, `BaixarVersaoDocumentoHandler` (exist) -> pergunta "este usuário é só líder?" a `SoLideranca` (new, no door - placement per conventions) e devolve 404 se for.
4. `GET /api/indicadores` -> `ConsultarIndicadoresHandler` (exists) -> mesma pergunta a `SoLideranca`; 403 se for.
5. `TempoRealHub` (exists): não muda; o líder precisa entrar no grupo do próprio setor para ver a fila da turma.

## Impact

| Front | What changes |
| --- | --- |
| domain | novo termo: "só liderança" - atendente que tem ao menos um setor e todos os seus setores são liderança de turma (`Setor.CursoId` não nulo). Vive em `One.Api/Dados/Usuarios/` ao lado de `Usuario.Tem`. Quem ramifica nele: as 3 rotas acima |
| domain | termo que muda: "fora do fluxo" passa a incluir o chamado reclassificado. Quem ramifica em `EtapaOrdem == null`: `Agendador.PrazoDaEtapaVencido`, `ResolverFluxo.Seguinte`, `ResolverFluxo.TemEtapaSeguinte`, `DetalheChamado.DoFluxoDoChamado`, `PermissoesChamado` via `acoes` |
| domain | termo que muda: "desativar setor" ganha uma recusa. Quem chama: tela Cadastros > Setores (`PUT /setores/{id}`) |
| stored data | nada a migrar. Setores já inativos que estão em fluxo publicado hoje continuam como estão; a recusa vale só para a próxima desativação |
| fluxos-atendimento | `checks.md`: C42, C70, C71, C72 (AD-042) e o comando do C106 precisam de emenda aprovada; o cabeçalho diz 96 checks e há 106; `verification.md` ganha a rodada 2 |
| STATE.md | o `## Handoff` aponta a branch `feature/fluxos-atendimento`; hoje é a `main` (AD-043) |

## Relations

`None - no stored-data shape change`

## Surface

Só rotas existentes cujo status muda.

| Route | In | Out | Status |
| --- | --- | --- | --- |
| `GET /api/artigos/versoes/{id}` | `id` | `titulo`, `texto`, `links`, `versaoAtivaAtualId` | `200`, `404` (agora também para quem é só líder) |
| `GET /api/documentos/versoes/{id}` | `id` | o PDF | `200`, `404` (agora também para quem é só líder) |
| `GET /api/indicadores` | `de`, `ate`, `setorId` | indicadores | `200`, `400`, `403` (agora também para quem é só líder) |
| `PUT /api/admin/setores/{id}` | `nome`, `triagem`, `ativo` | o setor | `200`, `400`, `404`, `409` (agora também para setor em fluxo publicado) |
| `POST /api/chamados/{numero}/reclassificar` | `categoriaId` | vazio | `200`, `400`, `403`, `404`, `409` (iguais; muda só o estado gravado) |

## Landing

- Nothing in this change is hard to reverse: nenhum esquema, contrato novo nem dependência. As quatro rotas só ganham uma recusa e a reclassificação grava dois campos que já existem.

## Criteria

### S1: o líder de turma não lê o que é só da equipe (P1)

Um aluno com papel `ATENDENTE` apenas em setores de liderança (F1) deixa de ver artigos, documentos e indicadores; a fila da turma dele segue igual.

**Acceptance Criteria**

1. WHEN um usuário só líder pede `GET /api/artigos/versoes/{id}` de uma versão existente THEN the system SHALL responder 404 com o detalhe "Versão de artigo não encontrada."
2. WHEN um usuário só líder pede `GET /api/documentos/versoes/{id}` de uma versão existente THEN the system SHALL responder 404 com o detalhe "Documento não encontrado."
3. WHEN um usuário só líder pede `GET /api/indicadores` com período válido THEN the system SHALL responder 403 com o detalhe "Os indicadores não estão disponíveis para a liderança de turma."
4. WHILE o usuário é administrador, ou é atendente de ao menos um setor que não é liderança, the system SHALL responder às três rotas como hoje (200 nos casos válidos).
5. The system SHALL tratar como só líder apenas o atendente que tem ao menos um setor e cujos setores têm todos `curso_id` não nulo; um atendente sem nenhum setor segue como hoje.
6. WHEN um usuário só líder abre o hub de tempo real THEN the system SHALL colocá-lo no grupo de cada setor dele, como hoje.

**Independent test:** criar um aluno com `ATENDENTE` numa liderança, pedir as três rotas e ver 404, 404 e 403; pedir como atendente de um setor comum e ver 200.

### S2: o chamado reclassificado sai do fluxo (P1)

Reclassificar deixa de manter a cadeia da categoria antiga (F2).

**Acceptance Criteria**

7. WHEN um atendente reclassifica um chamado que está numa etapa de fluxo (`etapa_ordem` não nulo) THEN the system SHALL gravar a nova categoria, deixar `etapa_ordem` e `etapa_desde` nulos, manter `setor_id`, o estado e `versao_fluxo_id`, e gravar um evento `RECLASSIFICACAO`.
8. WHEN um atendente reclassifica um chamado que já está fora de fluxo THEN the system SHALL gravar a nova categoria e o evento `RECLASSIFICACAO` e não mudar mais nenhum campo do fluxo.
9. WHILE o chamado saiu do fluxo por reclassificação, the system SHALL omitir `subir` de `acoes`, devolver `fluxo` nulo no detalhe da equipe e nunca subi-lo pelo `Agendador`, mesmo vencido o prazo da etapa em que estava.
10. IF a categoria nova está inativa ou não existe THEN the system SHALL responder 400 `categoriaId` e não mexer no fluxo do chamado.

**Independent test:** abrir um chamado na liderança com prazo de 48 h, reclassificar, avançar o relógio 49 h, rodar o `Agendador` e ver que o chamado continua no mesmo setor.

### S3: não desativar um setor que um fluxo publicado usa (P2)

O gestor é impedido de mudar o comportamento de um fluxo publicado sem querer (F7).

**Acceptance Criteria**

11. WHEN o administrador envia `PUT /api/admin/setores/{id}` com `ativo: false` para um setor ativo que é o destino de uma etapa `SETOR` da versão vigente de algum fluxo THEN the system SHALL responder 409 com o detalhe "O setor é usado em fluxo publicado (categoria: <nomes das categorias, ordem alfabética, separadas por "; ">). Publique o fluxo sem ele antes de desativar." e deixar o setor ativo.
12. WHEN o setor aparece só em um rascunho, ou só em versão que já não é a vigente THEN the system SHALL desativá-lo (200).
13. WHEN o envio reativa o setor ou só renomeia THEN the system SHALL responder como hoje.

**Independent test:** publicar um fluxo com "Financeiro", tentar desativar o setor e ver 409 com "Boletos"; publicar uma versão sem ele, tentar de novo e ver 200.

### S4: fluxos-atendimento fecha com contas feitas (P1)

**Acceptance Criteria**

14. WHEN `dotnet build One.slnx`, `dotnet test One.Api.Tests`, `npm --prefix web test` e `npm --prefix web run build` rodam no `HEAD` do E0 THEN the system SHALL sair com 0 em todos.
15. WHEN o comando do C106 roda THEN the system SHALL listar só specs que usam `simulada.ts` e sair com 0, e `anexos.spec.ts` e `plataforma.spec.ts` rodam contra a imagem real em comando separado.
16. WHEN o Verificador roda a rodada 2 de `fluxos-atendimento` THEN the system SHALL ter um resultado com evidência para cada check da lista emendada, e o C104 como PASS, ou como FAIL por bloqueio do ambiente com um AD de risco aceito.

**Independent test:** os comandos do check 14 e o relatório da rodada 2 passam em `validate_verification.py`, ou o AD de risco aceito existe.

## Out of scope

| Excluded | Why |
| --- | --- |
| Perfil "Líder de turma" próprio e tirar o `ATENDENTE` do líder | É o E4/E5; o E0 só fecha as quatro rotas que vazam |
| Reavaliar o fluxo da nova categoria ao reclassificar | Decidido: sair do fluxo (igual ao encaminhamento manual); reavaliar exige escolher a "etapa equivalente" e fica para o E1 |
| Aviso de "saúde do fluxo" na lista de fluxos e para setores já inativos | A recusa do critério 11 é a menor correção; o aviso volta no E1 |
| Fluxo padrão da instituição (F3), calendário de atendimento e prazo em horas úteis (F5), aviso ao mudar de etapa (F6), mandato do líder (F4), perfis e escopo (F8) | São E1, E4, E5, E6 e E7 |
| `cadastros-fluxo-visual` | Plano próprio, ainda sem "aprovado"; entra depois do E0 |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| F2: o que fazer ao reclassificar no meio do fluxo | Sair do fluxo, setor atual mantido | Recomendação aceita pelo usuário em 08/11 ("siga o que for recomendado") | y |
| C106 | Corrigir o comando para os specs simulados e rodar os dois reais em separado; emenda de check | Recomendação aceita pelo usuário em 08/11 | y |
| C104 (`crapper`) | Rodar em outro computador; se não der, AD de risco aceito pelo dono | Recomendação aceita pelo usuário em 08/11; a política do Windows bloqueia o `crapper.exe` aqui | y |
| Só o E0 antes do congelamento de 17/11; `cadastros-fluxo-visual` depois | Como escrito | Assumido na mensagem anterior e não contestado | n |
| Hub de tempo real fica fora do E0 | O líder precisa do grupo do próprio setor para ver a fila da turma; o hub não entrega dado de artigo, documento nem indicador | O prompt-evolucao listou `TempoRealHub.cs:28` como evidência de F1, mas lido o código ele não vaza | n |
| Indicadores negados ao líder | 403 para quem é só líder | Hoje o líder veria os números do setor dele; o E4 define a "sem indicadores gerais" e o AD-012 pede o menor acesso | n |
| Texto das recusas 3 e 11 | Os escritos nos critérios | Mesmo tom das recusas vizinhas em `Problemas.Erro` | n |
| Testes que provam a falha antes da correção | Escritos primeiro e vistos falhar em F1, F2 e F7 | `AGENTS.md` e prompt-evolucao-one | y |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| API `GET /api/artigos/versoes/{id}`, `GET /api/documentos/versoes/{id}` | error shape and codes | AC 1, AC 2 (ProblemDetails, mesmo 404 de "não existe") |
| API `GET /api/indicadores` | error shape and codes | AC 3 |
| API `PUT /api/admin/setores/{id}` | error shape and codes | AC 11 (ProblemDetails 409 com `detail`) |
| API `POST /api/chamados/{numero}/reclassificar` | error shape and codes | AC 10, existing - 400 `categoriaId` |
| all four routes | who may call | AC 1 a AC 5 e AC 11 (administrador) |
| all four routes | versioning, rate limits | n/a - rotas já existentes sem versão nem limite de uso; a mudança é só de autorização e de estado |
| screen Cadastros > Setores | error state | AC 11; existing - a tela já mostra o `detail` de uma recusa 409, a confirmar no build |
| screen Cadastros > Setores | destructive action confirms | existing - desativar já passa pelo mesmo formulário; a recusa vem do servidor |
| screen Chamado (equipe) | empty state | AC 9 - sem o botão "Subir" e sem a linha "Etapa n de m" |
| screen Indicadores, Artigos, Documentos | unauthorised state | AC 1 a AC 3; o líder não chega aos links porque o menu já esconde grupos sem permissão, a confirmar no build |

## Sources

- `.specs/prompt-evolucao-one.md` seções 3 e 6 (F1, F2, F7, F9, E0) - define o escopo do E0 e as respostas do usuário em 08/11.
- `.specs/features/fluxos-atendimento/verification.md` (rodada 1) e `AD-012`, `AD-041`, `AD-042`, `AD-043` - o que está aberto e as regras que o E0 não pode quebrar.
