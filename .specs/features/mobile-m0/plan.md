# Mobile M0: correções urgentes do celular

Profile: ui. Épico M0 de `.specs/prompt-mobile-first.md`. Aprovado em 08/11 pelo dono do projeto: "pode fazer todas as modificações seguindo o contexto do projeto ... escolha a melhor alternativa". As escolhas abaixo foram tomadas por análise do código e registradas aqui.

## Problem

Na auditoria de 08/11 (390×844 e 360×780, toque emulado), seis telas falham no celular. A pior deixa uma nota interna sair pública para o aluno: a caixa "Nota interna" só recebe o toque nos 16×16 px dela e no rótulo de 14 px (`Marca.tsx`). Outra mostra "Instituição não encontrada." quando o aluno só está sem rede.

Depois disto, toda caixa de marcação tem a linha inteira como área de toque de 44 px, o app sem rede diz que está sem conexão e oferece tentar de novo, e o iPhone respeita a área segura.

## Flow

1. `Marca.tsx` (existe): a linha inteira vira um `<label>` de `min-h-11`; o `input` e o texto ficam dentro dele.
2. `ChamadoDetalhe.tsx` (existe): ao marcar "Nota interna" aparece "Só a equipe vê esta nota." fora do rótulo; no estado RESOLVIDO do aluno, o bloco Confirmar/Rejeitar vem antes do formulário Responder.
3. `Autenticado.tsx` (existe): qualquer `ErroApi` (resposta da API) segue como hoje e manda para o login. Só a falha de rede (sem resposta) mostra o bloco `ErroDe` "Não foi possível carregar sua sessão. Verifique sua conexão." com "Tentar de novo".
4. `Acesso.tsx` Login (existe): qualquer resposta da API continua "Instituição não encontrada."; falha de rede mostra o mesmo bloco de conexão com "Tentar de novo".
5. `ui/dropdown-menu.tsx` (existe): `DropdownMenuItem` ganha `max-md:min-h-11`; `Usuarios.tsx` e `Instituicoes.tsx` põem um `DropdownMenuSeparator` antes de "Desativar".
6. `Acesso.tsx` DefinirSenha (existe): o link de depois da senha vira o botão "Entrar" (`Button asChild` com `Link`, 44 px).
7. `index.html` e `index.css` (existem): `viewport-fit=cover` e `padding-left/right: env(safe-area-inset-*)` no `body`.

## Impact

| Front | What changes |
| --- | --- |
| `Marca` | usada em `ChamadoDetalhe`, `Cadastros` e `Usuarios`; o nome acessível de cada caixa não muda (`getByLabelText` continua valendo) |
| inventário de textos | `acesso/textos.test.tsx` (Criar senha: o link vira o botão "Entrar") e `chamados/textos.test.tsx` (a ordem do bloco do aluno) ganham a mudança; nenhum texto some sem trocar por outro |
| `ErroDe` | passa a ser usado também na sessão e no Login; o texto já existe |
| API, dados, migration | nenhum |
| `celular.spec.ts` | ganha a medida de caixas e de itens de menu (E2E, ver checks) |

## Relations

Sem entidade nova. `Marca` 1—N usos; `ErroDe` 1—N usos.

## Surface

Nenhuma rota nova. Sem API.

## Landing (decisões)

| # | Decisão | Alternativa rejeitada |
| --- | --- | --- |
| L1 | Área de toque da `Marca`: `<label>` envolvendo a linha, `min-h-11`, `input` de `size-5` | Aumentar só o `input` para 44 px: fica feio e o texto continua pequeno para tocar |
| L2 | Aviso da nota: texto "Só a equipe vê esta nota." quando marcada, fora do `<label>` para o nome acessível não mudar | Trocar a cor do formulário inteiro: mexe em AD-027 sem pesquisa |
| L3 | Rede x 401: decide pelo tipo do erro (`ErroApi` sai como hoje; só o que não é resposta da API, a rede caída, fica e mostra o bloco; o 5xx não muda porque `acesso.test.tsx` (QueryClient por montagem) já fixa 500 no `/me` voltando ao Login). Sem o `me`, a casca não existe (precisa dos papéis), então a tela é a de `Centro` e não o cabeçalho com abas | Manter a casca sem sessão: inventaria papéis |
| L4 | `viewport-fit=cover` + recuo lateral no `body`. Sem inset de topo: o app não usa `black-translucent`, então o topo não passa por baixo da barra de estado | Inset de topo no `Topo` de 49 px: não tem efeito hoje e mexe na altura fixa |
| L5 | P6 só reordena quando o aluno pode confirmar; nos outros estados a ordem não muda | Reordenar sempre: muda a tela do aluno em ABERTO sem necessidade |
| L6 | `interactive-widget`, manifest e o resto de M2/M4 ficam fora | Entrar agora: pede aparelho real |

Nenhuma é decisão difícil de desfazer (sem schema, contrato de API ou migration).

## Criteria (EARS)

1. Quando uma caixa de marcação é tocada em qualquer ponto da linha (caixa ou texto), o sistema deve alternar essa caixa, e a linha deve ter pelo menos 44 px de altura.
2. Quando "Nota interna" está marcada, o sistema deve mostrar "Só a equipe vê esta nota.".
3. Quando o aluno abre um chamado RESOLVIDO, o sistema deve mostrar "Confirmar resolução" e "Rejeitar resolução" antes do formulário "Responder (reabre a solicitação)".
4. Quando `/api/auth/me` falha por rede (sem resposta), o sistema deve mostrar "Verifique sua conexão." e "Tentar de novo", e não deve ir para o login; quando a API responde com erro (401), deve ir para o login.
5. Quando a instituição do Login falha por rede, o sistema deve mostrar "Verifique sua conexão." e "Tentar de novo"; quando a API responde com erro (404), deve mostrar "Instituição não encontrada.".
6. Quando "Tentar de novo" é tocado, o sistema deve repetir a leitura.
7. Os itens de qualquer menu de ações devem ter pelo menos 44 px de altura abaixo de 768 px, e "Desativar" deve vir depois de um separador.
8. Quando a senha é criada, o sistema deve mostrar o botão "Entrar", de 44 px, que leva ao login.
9. O `index.html` deve declarar `viewport-fit=cover`, e o `body` deve recuar as laterais pela área segura.

## Out of scope

M1 a M8; manifest, convite de instalação e atualização do app; teclado e `interactive-widget`; fila de envio offline; paginação da fila.

## Assumptions

- O iPhone e o Android reais não foram usados: P3 (recuo lateral) e o comportamento do toque são provados no Chromium e ficam como item de aparelho real no `verification.md`.
- Falha de rede aparece como `TypeError` do `fetch`, não como `ErroApi`. Confirmado em `api.ts`.

## Observable

| Linha | Critério | Check |
| --- | --- | --- |
| celular 360×780 | 1, 7, 8 | C1, C7, C8 |
| celular deitado 844×390 | 1 | C1 (mesmo componente) |
| teclado aberto | fora do M0 | |
| toque | 1, 6, 8 | C1, C6 |

## Sources

`.specs/prompt-mobile-first.md` seções 3 e 4; WCAG 2.2 SC 2.5.8; Apple HIG (44 pt); Android a11y (48 dp); MDN `env()`.
