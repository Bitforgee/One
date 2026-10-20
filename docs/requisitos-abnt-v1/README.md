# Documento de requisitos em ABNT: versão 1 (02/10/2026)

Esta pasta guarda a primeira versão do documento de levantamento e especificação de requisitos do One. Ela foi gerada em 02/10/2026, na estrutura do Apêndice D.5 do manual do PEI e nas normas da ABNT.

| Arquivo | Conteúdo |
| --- | --- |
| [One_Levantamento_e_Requisitos.docx](One_Levantamento_e_Requisitos.docx) | Documento editável |
| [One_Levantamento_e_Requisitos.pdf](One_Levantamento_e_Requisitos.pdf) | O mesmo documento em PDF |
| [conteudo.md](conteudo.md) | Texto-fonte do documento |
| [metadados.json](metadados.json) e [logo_univag.png](logo_univag.png) | Capa e folha de rosto |
| [diagramas/](diagramas/) | Diagramas, com a fonte editável (`.drawio`, `.mmd`) ao lado do PNG |
| [gerar.py](gerar.py) | Gerador do `.docx` e do `.pdf` |
| [test_documento.py](test_documento.py) | 39 testes do documento gerado |

## Situação

Esta versão está superada. Os requisitos, as regras de negócio e os casos de uso foram revistos em 16/10/2026, conforme as orientações do professor em aula. A versão atual está na [Especificação do projeto](../02-especificacao-do-projeto.md). O diagrama de classes e os modelos conceitual e lógico estão na [Arquitetura da solução](../05-arquitetura-da-solucao.md).

A próxima versão do documento ABNT será montada a partir dos capítulos de `docs/`. Os arquivos desta pasta ficam sem alteração, como registro do que foi produzido em 02/10/2026.

## Como gerar de novo

O gerador precisa de:

- Python 3 com as dependências de `requirements.txt` (`pip install -r requirements.txt`);
- Node.js, para o Mermaid CLI (via `npx`), que usa o Microsoft Edge para desenhar os diagramas `.mmd`;
- draw.io Desktop, baixado automaticamente para `.cache/`, para os diagramas `.drawio`;
- Microsoft Word, para atualizar o sumário e exportar o PDF.

Na raiz do repositório:

```bash
python docs/requisitos-abnt-v1/gerar.py
```

Para rodar os testes, dentro desta pasta:

```bash
python -m unittest test_documento
```
