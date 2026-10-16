# Documentação do One

Esta pasta guarda a documentação do Projeto Extensionista Integrador em Markdown. O documento final, nas normas da ABNT, é montado a partir da pasta `documento/`, seguindo a ordem dos nomes dos arquivos.

## Documento final

A ordem e os capítulos seguem a estrutura do projeto final do Manual do PEI (Apêndice D.5).

| Arquivo | Conteúdo |
| --- | --- |
| [00-elementos-pre-textuais.md](documento/00-elementos-pre-textuais.md) | Capa, folha de rosto, resumo e palavras-chave |
| [01-introducao.md](documento/01-introducao.md) | Propósito, escopo, premissas, convenções e estrutura do documento |
| [02-fundamentacao-teorica.md](documento/02-fundamentacao-teorica.md) | Pesquisa sobre PWAs e frameworks |
| [03-visao-geral.md](documento/03-visao-geral.md) | Descrição do produto, usuários, soluções similares, suposições e dependências |
| [04-requisitos.md](documento/04-requisitos.md) | Requisitos funcionais e não funcionais |
| [05-documentacao-das-funcionalidades.md](documento/05-documentacao-das-funcionalidades.md) | Casos de uso, diagrama de classes, modelos conceitual e lógico |
| [06-funcionalidades-desenvolvidas.md](documento/06-funcionalidades-desenvolvidas.md) | Telas da aplicação e suas descrições |
| [07-consideracoes-finais.md](documento/07-consideracoes-finais.md) | Conclusões, lições aprendidas e trabalhos futuros |
| [08-referencias.md](documento/08-referencias.md) | Referências no padrão ABNT |
| [09-apendices-e-anexos.md](documento/09-apendices-e-anexos.md) | Apêndices e anexos |

Regras de escrita:

- Use `#` para capítulos e `##` para seções. Não numere os títulos: a numeração sai na montagem.
- As orientações de cada seção estão em comentários HTML (`<!-- ... -->`), que não aparecem quando o GitHub exibe o arquivo. Escreva o texto abaixo delas.
- O Sumário não tem arquivo próprio: ele é gerado na montagem a partir dos títulos.
- As figuras ficam em `figuras/` e entram no texto com caminho relativo, por exemplo `![Diagrama de casos de uso](../figuras/casos-de-uso.png)`.

## Outras pastas

| Pasta | O que guardar |
| --- | --- |
| `acompanhamento/atas/` | Uma ata por reunião, copiada de `modelo-ata.md` e nomeada `AAAA-MM-DD.md` |
| `acompanhamento/relatorios-semanais/` | Um relatório por semana, copiado de `modelo-relatorio-semanal.md` e nomeado `AAAA-MM-DD.md`, entregue pelo AVA (Apêndice D.4) |
| `apresentacoes/` | Pitch da ideia inicial (roteiro na seção 2.8.1 do manual), PM Canvas, banner e slides da Feira de Projetos (seção 4.3) |
| `figuras/` | Diagramas, com o arquivo-fonte (`.drawio` ou `.mmd`) ao lado do PNG exportado, e capturas de tela |
