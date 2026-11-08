# Mobile M0 - checks

Profile: ui
Plan: `.specs/features/mobile-m0/plan.md`

9 checks em 1 slice · 0 one-way doors · 0 perguntas abertas (plano aprovado pelo usuário em 08/11)

**Como as provas rodam.** `cd web && npx vitest run <arquivo> -t "<nome>"`. Um filtro que não seleciona teste sai com 0: conferir a contagem. E2E de medida: `cd web && npx playwright test e2e/celular.spec.ts -g "<nome>"` (config da pasta). Mutação suspensa (AD-025).

## Checks

**C1** - [ ] Tocar no texto de "Nota interna" marca a caixa, e a linha mede 44 px ou mais (AC 1)
Proof: `cd web && npx vitest run src/chamados/resposta.test.tsx -t "toque no texto da marca"`
Proof: `cd web && npx playwright test e2e/celular.spec.ts -g "caixas de marcação"`

**C2** - [ ] Com "Nota interna" marcada aparece "Só a equipe vê esta nota."; desmarcada, não (AC 2)
Proof: `cd web && npx vitest run src/chamados/resposta.test.tsx -t "aviso da nota interna"`

**C3** - [ ] Para o aluno em RESOLVIDO com `acoes: ['confirmar','rejeitar','responder']`, "Confirmar resolução" vem antes de "Responder (reabre a solicitação)" no DOM (AC 3)
Proof: `cd web && npx vitest run src/chamados/resposta.test.tsx -t "confirmar antes de responder"`

**C4** - [ ] `/api/auth/me` com `TypeError` mostra "Verifique sua conexão." e "Tentar de novo" e a URL continua a da tela; com 401 a URL vira `/univag` (AC 4)
Proof: `cd web && npx vitest run src/chamados/sessao.test.tsx -t "sem rede"`
Proof: `cd web && npx vitest run src/chamados/sessao.test.tsx -t "401 vai para o login"`

**C5** - [ ] `/api/instituicoes/univag` com `TypeError` mostra "Verifique sua conexão."; com 404 mostra "Instituição não encontrada." (AC 5)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "Login sem rede"`
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "slug desconhecido"`

**C6** - [ ] "Tentar de novo" repete a leitura: a segunda resposta com sucesso mostra a tela (AC 6)
Proof: `cd web && npx vitest run src/chamados/sessao.test.tsx -t "tentar de novo"`

**C7** - [ ] Em 390 px os itens do menu "Ações de <nome>" medem 44 px ou mais, e "Desativar" vem depois de um separador (AC 7)
Proof: `cd web && npx playwright test e2e/celular.spec.ts -g "itens de menu"`
Proof: `cd web && npx vitest run src/administracao/usuarios.test.tsx -t "separador antes de Desativar"`

**C8** - [ ] Depois de "Salvar senha" existe o botão "Entrar" que leva a `/univag`, de 44 px (AC 8)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "definir senha envia o token"`
Proof: `cd web && npx playwright test e2e/celular.spec.ts -g "botão depois da senha"`

**C9** - [ ] `index.html` contém `viewport-fit=cover` e `index.css` recua as laterais com `env(safe-area-inset-left)` e `-right` (AC 9)
Proof: `cd web && npx vitest run src/test/areasegura.test.ts -t "área segura"`

## Verificação em aparelho real (não prova no Chromium)

Android de entrada e iPhone (modelos a registrar no `verification.md`): tocar a margem da caixa de "Nota interna" e do texto; app instalado sem rede; iPhone deitado, conferir o recuo lateral.


