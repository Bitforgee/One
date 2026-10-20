# Univag One (BitForge)

`Curso Superior de Tecnologia em Análise e Desenvolvimento de Sistemas, UNIVAG - Centro Universitário`

`Projeto Extensionista Integrador IV: Desenvolvimento de PWAs com Frameworks Avançados`

`2º semestre de 2026`

O One é uma central de atendimento acadêmico. O aluno faz a pergunta com as próprias palavras, o assistente responde com os artigos da base de conhecimento da instituição e, se isso não resolver, a conversa vira uma solicitação registrada, com protocolo, encaminhada ao setor certo.

O cliente é a coordenação dos cursos de tecnologia do UNIVAG, em Várzea Grande (MT). Hoje os alunos falam com a coordenação pelo WhatsApp, pelo e-mail e pelo AVA, e nada fica registrado. Em 7 dias, a coordenação recebeu cerca de 256 mensagens de alunos: 171 pelo WhatsApp, 70 por e-mail e 15 pelo AVA. Metade eram demandas de fato, e as mais citadas (boleto do semestre e atestado de escolaridade) o próprio aluno já resolve no Portal do Aluno, sem saber onde (ver [Documentação de contexto](docs/01-documentacao-de-contexto.md)).

O fluxo que o One registra é: **perguntar → tentar resolver → registrar → direcionar → atender → resolver → medir**. Sempre que o assistente não resolve (o aluno responde Não ou não há artigo sobre o assunto), o One oferece abrir uma solicitação para uma pessoa da instituição. O assistente só responde com base em artigos publicados.

![Assistente do One respondendo com um artigo da base de conhecimento](docs/figuras/telas/assistente-claro.png)

## Situação do projeto

| Artefato | O que existe em 20/10/2026 |
| --- | --- |
| Documentação | Capítulos 00 a 13 em [`docs/`](docs/README.md): contexto, requisitos (RF, RNF e regras de negócio), 22 casos de uso especificados, arquitetura, diagramas, interface e testes. A [versão 1 do documento ABNT](docs/requisitos-abnt-v1/README.md), de 02/10/2026, fica arquivada. |
| Protótipo | Protótipo visual navegável, com dados simulados, publicado em <https://bitforgee.github.io/prototipo-v1-one/>. Código em [`src/prototipo/`](src/prototipo/README.md); 67 testes unitários e de integração, 20 cenários de navegação e 20 verificações ponta a ponta passando. |
| Back-end | API REST em ASP.NET Core (.NET 10) em [`src/backend/`](src/backend/), com a estrutura inicial (`GET /health`) e 4 testes de integração passando. Ainda sem endpoints de negócio. |
| Front-end | SPA/PWA em React com Vite, ainda sem código: o grupo vai escolher entre TypeScript e JavaScript ([`src/frontend/`](src/frontend/README.md)). |

O que ainda será construído no MVP, como uma fatia vertical de ponta a ponta: identidade e acesso, base de conhecimento, assistente, conversa que vira chamado, roteamento, atendimento, histórico auditável e indicadores. A ordem e os prazos estão na [Programação de funcionalidades](docs/07-programacao-de-funcionalidades.md).

## Integrantes

* Alfredo Pinto de Souza Neto
* David El Hage de Oliveira
* Gustavo Henrique Rondon Melo
* Marco Antônio Rodrigues Menezes
* João Henrique Queiroz Mitsuyuki

## Orientador

* Prof. Esp. Walderson Ryutti Shimokawa

## Instruções de Instalação, Execução e Acesso

**Acesso rápido (protótipo)**

* URL: <https://bitforgee.github.io/prototipo-v1-one/>
* Ambiente: GitHub Pages, com dados demonstrativos guardados no próprio navegador
* Acesso: não há senha; na tela inicial, escolha o perfil Aluno, Atendente ou Administrador

**Execução local**

Com o SDK do .NET 10 e o Node.js instalados, a partir da raiz do repositório:

```bash
dotnet test src/backend/One.slnx                  # testes da API
dotnet run --project src/backend/One.Api          # API em http://localhost:5221
node src/prototipo/tests/static-server.mjs 4178   # protótipo em http://localhost:4178
```

Todas as instruções, incluindo as suítes de teste do protótipo, estão em [`src/README.md`](src/README.md).

# Documentação

1. [Glossário](docs/00-glossario.md)
2. [Documentação de contexto](docs/01-documentacao-de-contexto.md)
3. [Especificação do projeto](docs/02-especificacao-do-projeto.md)
4. [Metodologia](docs/03-metodologia.md)
5. [Projeto de interface](docs/04-projeto-de-interface.md)
6. [Arquitetura da solução](docs/05-arquitetura-da-solucao.md)
7. [Template padrão da aplicação](docs/06-template-padrao-da-aplicacao.md)
8. [Programação de funcionalidades](docs/07-programacao-de-funcionalidades.md)
9. [Plano de testes de software](docs/08-plano-de-testes-de-software.md)
10. [Registro de testes de software](docs/09-registro-de-testes-de-software.md)
11. [Plano de testes de usabilidade](docs/10-plano-de-testes-de-usabilidade.md)
12. [Registro de testes de usabilidade](docs/11-registro-de-testes-de-usabilidade.md)
13. [Apresentação do projeto](docs/12-apresentacao-do-projeto.md)
14. [Referências](docs/13-referencias.md)

Material de apoio:

* [Índice da documentação](docs/README.md), com a correspondência entre os capítulos e o documento final do PEI (Apêndice D.5)
* [Feedback do cliente](docs/acompanhamento/feedback-cliente.md) e [relatórios periódicos](docs/relatorios-periodicos/rp3.md)
* [Pesquisas](docs/pesquisas/): visão do produto, pesquisa de mercado, roteiro da entrevista e roadmap
* [Documento de requisitos em ABNT, versão 1](docs/requisitos-abnt-v1/README.md) (02/10/2026)

# Código

* [Código Fonte](src/README.md)

# Apresentação

* [Apresentações](presentation/README.md)
* [Apresentação do Projeto](docs/12-apresentacao-do-projeto.md)
