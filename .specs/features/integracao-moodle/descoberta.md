# Descoberta: como o Portal do Aluno liga ao AVA da Univag

Feita em 10/11/2026, com uma conta de aluno de teste do próprio dono do projeto, somente leitura e nas chamadas que o navegador do aluno já faz. Nenhum valor pessoal está neste arquivo: CPF, matrícula, e-mail, chaves e links com hash ficaram de fora. Ao fim, saí do Portal e do AVA e apaguei os registros do navegador.

## Fatos observados

| # | Fato | Como vi |
| --- | --- | --- |
| 1 | O Portal do Aluno (ASP.NET, `portalaluno.univag.edu.br`) entra por **matrícula e senha**, sem captcha. O login chama `POST /api/autenticar-login/` | tela de login e rede |
| 2 | O botão "Portal AVA" não é um link fixo: o Portal monta no servidor uma URL `https://avaunivag.univagead.com.br/auth/userkey/login.php?key=<chave>` e a abre numa nova aba. Se o Portal não tem a URL, mostra "Não há cadastro do Aluno(a) no Ambiente AVA" | script da página |
| 3 | `/auth/userkey/login.php` é do plugin de terceiros **User key authentication** (`auth_userkey`) do Moodle: o sistema de fora pede uma chave de uso único por um web service e leva o usuário para essa URL. O Moodle não pede senha | nome do caminho; o plugin é conhecido, mas não li o código instalado |
| 4 | O AVA é Moodle **4.5 ou mais novo** (o `lib/upgrade.txt` foi trocado por `UPGRADING.md` na 4.5) com o tema **Moove**, em português | `lib/upgrade.txt` e `M.cfg` |
| 5 | Os web services estão ligados: `/webservice/rest/server.php` responde "token inválido" e `/login/token.php` pede `username`. Ou seja, o protocolo REST existe e exige token | respostas HTTP |
| 6 | O **`username` do aluno no Moodle é o CPF**: 11 dígitos, com os dois dígitos verificadores corretos. Não é a matrícula | chamada ajax `core_user_get_users_by_field` do próprio aluno, só verificação do formato |
| 7 | O `idnumber` do aluno está vazio e o aluno consegue editar `idnumber`, e-mail, telefone e instituição na própria página de perfil. O e-mail é pessoal (provedor público), não institucional | `/user/edit.php` |
| 8 | A estrutura de cursos: cada **disciplina** é um curso do Moodle, nomeada `<Disciplina> - <ano>/<período> - <código da turma>` (por exemplo, `... - 2026/2 - ITAD262NA`), dentro de uma **categoria por curso de graduação**. O `shortname` leva ids numéricos do sistema acadêmico separados por hífen. Há também um curso por graduação chamado "Coordenação - <curso>" (`99-<id do curso>`) em que o aluno está inscrito | `core_course_get_enrolled_courses_by_timeline_classification` |
| 9 | A mesma conta ainda está inscrita em disciplinas de 2025/1 e 2025/2 de outro curso (Engenharia de Software), então "cursos inscritos" não é o curso atual da matrícula | idem |
| 10 | O Portal já tem um precedente de integração por link assinado: o botão "Protocolo" abre `protocolo.univag.edu.br/View/Page/Login.aspx` com `matricula`, `dt` (carimbo de tempo) e `alunoHash`. Não analisei como o hash é calculado | links da página |
| 11 | `core_webservice_get_site_info` pelo ajax do aluno responde `servicenotavailable` | chamada ajax |
| 12 | O Moodle também aceita **login direto com CPF e uma senha própria do Moodle**, diferente da senha do Portal (que entra por matrícula). A conta que vi tem `auth` de 6 letras, compatível com `manual`, mas não confirmei o valor | informado pelo dono do projeto em 10/11; não testei o login direto |

## O que isto responde no plano `integracao-moodle`

- **Pergunta 1 (username):** resolvida. É o CPF. O AC 9 e 10 ficam como estão.
- **Pergunta 2 (o que foi modificado):** só em parte. O núcleo é o Moodle 4.5+, que traz o LTI 1.3 de fábrica. A modificação visível é o plugin `auth_userkey` e o tema Moove, ambos de terceiros e sem relação com o LTI. Não vi o que o administrador do site habilitou, então não sei se a Ferramenta externa está liberada nem quem a registra.
- **Falta:** se o LTI 1.3 está ativo, quem administra o site, e quem mantém o Portal (os "Sistemas Univag").

## O que muda no desenho

0. **O aluno já tem um login pronto no Moodle (CPF e senha do AVA) e o Portal é outro (matrícula e outra senha).** O One seria o terceiro cadastro de senha. Isso reforça o atalho pelo Moodle: quem abre a atividade "One" já está autenticado lá, então o `prompt=none` do LTI não pede nova senha, e o login do One por CPF e senha segue só como acesso direto do PWA. O plano não muda.

1. **`idnumber` e e-mail são editáveis pelo aluno.** Confirma a porta 2 do plano: achar o usuário por e-mail ou `idnumber` a cada clique permitiria que um aluno entrasse na conta de outro. O `username` (CPF) não é editável pelo aluno e o vínculo guarda o `sub` do Moodle.
2. **Há uma segunda via possível, que o plano não tinha:** o Portal do Aluno já abre sistemas externos por botão (Protocolo). Um botão "One" no Portal, com o mesmo padrão de link assinado, tiraria o aluno do Portal direto no assistente, sem depender do Moodle. Custo: o time do Portal (Sistemas Univag) precisa criar o botão e combinar a assinatura. Ela tem como base a matrícula, e o One identifica por CPF (AD-009), então o One teria de achar o aluno pela matrícula (já está no CSV).
3. **Para a feature seguinte (`moodle-matriculas`):** o Moodle sabe o curso (categoria) e a turma (nome do curso) de cada aluno, mas o "semestre 1 a 12" que os fluxos usam (AD-041) não aparece direto. Sai da turma e do ano de ingresso, e precisa ser conferido com a secretaria antes de planejar.

## O que não verifiquei

- A versão exata do Moodle (só sei que é 4.5 ou mais nova).
- Se há ferramentas externas (LTI) cadastradas, e se o administrador permite novas.
- O que o `auth_userkey` aceita como chave de busca do usuário (`username`, `email` ou `idnumber`) e quem guarda o token do web service. Isso está no Portal.
- O cálculo do `alunoHash` do Protocolo. Não tentei descobrir.
- Qualquer coisa que exija papel acima de aluno.
