# Checks: erro-visivel-acesso

## Intent
Nos formulários de acesso (login, primeiro acesso, definir e trocar senha), campo vazio já ficava com `aria-invalid` mas sem texto. Passa a mostrar "Preencha este campo." abaixo do campo, ligado por `aria-describedby`, sem `role="alert"` (o C60 de `interface-nova` exige que nenhum alert apareça e nenhum POST saia com campo vazio). Sem mudança de API, schema ou contrato.

| # | Afirmação | Prova |
|---|---|---|
| C1 | Enviar o login vazio mostra "Preencha este campo." no CPF e na senha, sem POST e sem `role=alert` | `npm --prefix web test -- --run src/acesso` (teste C60, exit 0) |
| C2 | A suíte web inteira segue verde (578 testes) | `npm --prefix web test -- --run` |
