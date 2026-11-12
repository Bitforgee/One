# Integrações guiadas: pesquisa (11/11/2026)

Referência para as decisões de interface do `plan.md`. Fontes abertas em 11/11; nada aqui é cópia de tela de terceiros.

## O que a pesquisa diz, e onde cai no One

| # | Achado | Fonte | Onde cai |
| --- | --- | --- | --- |
| P1 | A tela de integrações tem três trabalhos diferentes (achar, ligar, acompanhar). O que as equipes esquecem é o terceiro: dizer o que está conectado e se está saudável. Falha é estado normal de uma integração, não exceção | saasui.design, "SaaS Integrations Page UX" | Estado visível ao lado de cada integração (S1) |
| P2 | Uma tela de configuração de integração deve ter uma ação principal clara e o estado ("conectado", "saudável") perto dela; requisito junto ao campo, erro junto à origem, e o que a pessoa digitou não se perde se o salvar falhar | figr.design, "Integration Settings" | Estado no cabeçalho do painel; `Novo token` como ação principal do MCP (S1, S3) |
| P3 | Rótulo e dica ficam fora do campo e sempre visíveis; placeholder some, pesa na memória, tem contraste ruim e nem todo leitor de tela lê | Nielsen Norman Group, "Placeholders in Form Fields Are Harmful" | O formulário do Moodle não usa placeholder; o exemplo do nome do token vira dica fora do campo (S2, S3) |
| P4 | O segredo é mostrado uma única vez; a tela precisa dizer isso sem rodeio, mostrar o valor inteiro (sem reticências), botão de copiar que confirma ("Copiado") e não deixar fechar por clique acidental antes de copiar. Quem não copiou apaga o token e cria outro | saasui.design, "SaaS API Keys & Tokens UX Patterns" | Revelação do token no MCP (S3) |
| P5 | Guias de fornecedores de LTI 1.3 para Moodle (Watermark, Zoom, VitalSource) seguem o mesmo roteiro: "copie o campo X do produto, cole no campo Y do Moodle", um campo por passo | support.watermarkinsights.com, support.zoom.us, success.vitalsource.com | Cada endereço do Moodle ao lado do nome do campo onde ele é colado (S2) |
| P6 | Depois de salvar, mostrar o resultado e o próximo passo, sem deixar a pessoa adivinhar se funcionou | figr.design (estados: sucesso, erro, refresh) | Aviso fixo após salvar o Moodle, com o teste a fazer (S2) |

## O que ficou de fora de propósito

- Assistente em várias telas (wizard): são 2 integrações e 5 campos; a pesquisa de wizard (figr.design) pede estado, erro e foco desenhados por passo, e o ganho aqui não paga isso.
- Botão "Testar conexão": o One não consegue provar um lançamento LTI sozinho (quem inicia é o Moodle) e o MCP é só leitura sem teste de ponta a ponta; exigiria API nova.
- Rótulo flutuante: o NN/g ainda recomenda rótulo e dica fora do campo quando há espaço, e há.
