# Seletores trocados

AC 2 e C2: cada linha de asserção de `<base>` (b2e7e79) removida ou alterada nos testes do `web/`, com a linha que
a substitui e a afirmação, que não muda salvo onde o plano registra a decisão do usuário (door 3, door 9).
Conferido por `seletores_conferem.py <base>`.

| Arquivo | Antes | Depois | Afirmação |
| --- | --- | --- | --- |
| `web/src/test/estrutura.test.ts` | `expect(pastas).toEqual(Fatias)` | `expect(pastas).toEqual([...Fatias, 'ui'])` | as pastas de `web/src` são exatamente as listadas; a lista ganha `ui` (door 3, AD-023, escolha do usuário em 02/11) |
