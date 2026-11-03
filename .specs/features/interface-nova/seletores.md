# Seletores trocados

AC 2 e C2: cada linha de asserção de `<base>` (b2e7e79) removida ou alterada nos testes do `web/`, com a linha que
a substitui e a afirmação, que não muda salvo onde o plano registra a decisão do usuário (door 3, door 9).
Conferido por `seletores_conferem.py <base>`.

| Arquivo | Antes | Depois | Afirmação |
| --- | --- | --- | --- |
| `web/src/test/estrutura.test.ts` | `expect(pastas).toEqual(Fatias)` | `expect(pastas).toEqual([...Fatias, 'ui'])` | as pastas de `web/src` são exatamente as listadas; a lista ganha `ui` (door 3, AD-023, escolha do usuário em 02/11) |
| `web/src/assistente/assistente.test.tsx` | `expect(falar()).toHaveClass('btn-outline-primary')` | `expect(falar()).toHaveClass('bg-background')` e `expect(falar()).not.toHaveClass('bg-primary')` | "Falar com atendente" na variante secundária (contorno) antes do destaque; `bg-background` sem `bg-primary` é a variante `outline` do `Button` do shadcn (C31) |
| `web/src/assistente/assistente.test.tsx` | `expect(falar()).toHaveClass('btn-primary')` | `expect(falar()).toHaveClass('bg-primary')` | "Falar com atendente" na variante principal depois do `sem_base`; `bg-primary` é a variante `default` do `Button` do shadcn (C31) |
| `web/src/assistente/assistente.test.tsx` | `expect(falar()).toHaveClass('btn-primary')` | `expect(falar()).toHaveClass('bg-primary')` | "Falar com atendente" na variante principal depois do "Não" (C31) |
| `web/src/assistente/conversa.test.tsx` | `expect(screen.getByText('preciso do boleto').closest('.card')).toHaveClass('ms-auto')` | `expect(screen.getByText('preciso do boleto').closest('.is-user, .is-assistant')).toHaveClass('ms-auto')` | o balão do aluno fica à direita; o balão deixou de ser o `Card` do Bootstrap e passou a ser o `Message` do AI Elements, que leva `is-user` ou `is-assistant` (C28) |
| `web/src/assistente/conversa.test.tsx` | `expect(screen.getByText('É do semestre atual?').closest('.card')).toHaveClass('me-auto')` | `expect(screen.getByText('É do semestre atual?').closest('.is-user, .is-assistant')).toHaveClass('me-auto')` | o balão do assistente fica à esquerda; mesmo seletor de balão da linha acima (C28) |
| `web/src/chamados/chamado.test.tsx` | `expect(screen.getByRole('status', { name: 'Carregando' })).toHaveClass('spinner-border')` | `expect(screen.getByRole('status', { name: 'Carregando' })).toHaveClass('animate-spin')` | o detalhe carregando mostra o Spinner; `animate-spin` é o `Spinner` do shadcn no lugar do `spinner-border` do Bootstrap (C43) |
| `web/src/chamados/chamado.test.tsx` | `expect(screen.getByRole('alert')).toHaveClass('alert', 'alert-danger')` | `expect(screen.getByRole('alert')).toHaveClass('text-destructive')` | o erro do detalhe é um alerta de perigo; `text-destructive` é a variante `destructive` do `Alert` do shadcn (estados comuns de ## Screens) |
| `web/src/chamados/chamado.test.tsx` | `expect(within(doc).getByRole('img', { name: 'Documento' })).toHaveClass('bi-file-earmark-pdf')` | `expect(within(doc).getByRole('img', { name: 'Documento' })).toHaveClass('lucide-file-text')` | a fonte de documento traz o ícone de documento; o ícone passa do Bootstrap Icons ao Lucide `FileText` (C40, AC 30) |
| `web/src/chamados/chamado.test.tsx` | `expect(within(art).getByRole('img', { name: 'Artigo' })).toHaveClass('bi-journal-text')` | `expect(within(art).getByRole('img', { name: 'Artigo' })).toHaveClass('lucide-book-text')` | a fonte de artigo traz o ícone de artigo, diferente do de documento; Lucide `BookText` (C40, AC 30) |
| `web/src/chamados/resposta.test.tsx` | `expect(screen.getByText('Obrigada!').closest('.card')).toHaveClass('ms-auto', 'bg-primary-subtle')` | `expect(screen.getByText('Obrigada!').closest('.is-user, .is-assistant')).toHaveClass('ms-auto', 'bg-primary-subtle')` | a mensagem pública do aluno fica à direita em `bg-primary-subtle`; o balão deixou de ser o `Card` do Bootstrap e passou a ser o `Message` do AI Elements (C39) |
| `web/src/chamados/resposta.test.tsx` | `expect((await screen.findByText('quantas horas?')).closest('.card')).toHaveClass('ms-auto')` | `expect((await screen.findByText('quantas horas?')).closest('.is-user, .is-assistant')).toHaveClass('ms-auto')` | na transcrição, o aluno fica à direita; mesmo seletor de balão (C39) |
| `web/src/chamados/listas.test.tsx` | `expect(screen.getByRole('status', { name: 'Carregando' })).toHaveClass('spinner-border')` | `expect(screen.getByRole('status', { name: 'Carregando' })).toHaveClass('animate-spin')` | a lista carregando mostra o Spinner; `Spinner` do shadcn (C57, C58) |

Linhas auxiliares trocadas pelo mesmo motivo, sem asserção própria (o C2 não as conta): em
`web/src/assistente/conversa.test.tsx`, `(await screen.findByText('Olá!')).closest('.card')` e
`screen.getByText('Oi.').closest('.card')` passam a `.closest('.is-user, .is-assistant')`; as asserções que as usam
(`toHaveClass('me-auto')`, `toHaveClass('ms-auto')`, o autor dentro do balão) não mudam.

Na S3, pelo mesmo motivo: em `web/src/chamados/chamado.test.tsx`, `.closest('.card')` (as respostas antiga, nova e
a do estágio) passa a `.closest('.is-user, .is-assistant')` e `.closest('div.border-top')` (o bloco da fonte) passa a
`.closest('div.border-t')`, a classe do Tailwind para a mesma borda superior; em `web/src/chamados/resposta.test.tsx`,
`.closest('.card')` (a mensagem pública, a nota interna e a resposta do assistente) passa a
`.closest('.is-user, .is-assistant')`. As asserções que usam esses elementos não mudam.
