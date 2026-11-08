# Vídeo de apresentação do One

Grava o app com o Playwright (cursor visível, legenda, selo do papel), narra cada passo com voz sintetizada e
monta um MP4 com legendas `.srt`. Tudo o que é gerado fica em `saida/` (fora do git).

## Gerar

Na pasta `web`, com o app no ar (por padrão `http://localhost:5179`, o Vite com a API local e a IA de verdade;
outro endereço em `APRESENTACAO_URL`), o docker compose (postgres, minio, mailpit) e os dados de demonstração
em `apresentacao/dados.json` e `apresentacao/dados/` (fora do git):

```
node apresentacao/preparar.ts           # instituição nova e limpa: univag-apresentacao-N -> saida/execucao.json
node apresentacao/gerar.ts principal    # apresentação: saida/apresentacao-one.mp4 + saida/legendas.srt
node apresentacao/gerar.ts amostra      # amostra curta na API simulada: saida/amostra.mp4 + saida/amostra.srt
```

A gravação muda o banco (conversa e chamado da Mariana, artigo novo, importação de matrículas). Para uma tomada
limpa, rode `preparar.ts` antes de cada `gerar.ts principal`: ele cria outra instituição com o mesmo nome e os
mesmos dados, só com o slug seguinte, pelos fluxos reais (CLI `instituicao criar`/`carga` com a dll já compilada,
API de administração, primeiro acesso pelos e-mails do Mailpit, dois chamados antigos já fechados) e espera a
indexação terminar. As cenas leem o slug de `saida/execucao.json`. Com o limite padrão de autenticação
(5 por minuto), rode com `AUTH_INTERVALO=13`; um 429 ou a API fora do ar sempre espera e repete.

Ensaio de um segmento só (na mesma instituição; o que ele muda fica no banco):

```
$env:ROTEIRO='principal'; npx playwright test -c apresentacao/playwright.config.ts -g 21-coordenador
node apresentacao/compor.ts principal 21-coordenador   # MP4 do segmento + um quadro por passo em saida/quadros/
```

`gerar.ts` só encadeia os dois passos, que também rodam separados:

```
$env:ROTEIRO='principal'; npx playwright test -c apresentacao/playwright.config.ts   # grava saida/segmentos/*.webm + *.json
node apresentacao/compor.ts principal                                                # narração, MP4 e SRT
```

Precisa de Node 24 (roda `.ts` direto), `ffmpeg`/`ffprobe` no PATH e, para a voz da OpenAI, a chave em
`dotnet user-secrets` da API (`Llm:ChaveApi`) ou em `../.env` (`LLM_CHAVE_API`). A chave não é impressa nem gravada.

## Como funciona

- **Roteiro** (`cenas/*.ts`): lista ordenada de segmentos. Cada segmento vira um vídeo e roda no próprio contexto do
  navegador (login próprio). Um segmento é um cartão de título (`cartao`) ou uma cena de papel (`selo`, `preparar`, `passos`).
  Roteiro novo: crie `cenas/<nome>.ts` e registre-o em `gravar.spec.ts`.
- **Passo** (`{ id, texto, acao }`): o `texto` é ao mesmo tempo a legenda e a fala. O kit mostra a legenda, marca o instante,
  executa a `acao` e espera a fala acabar (+1,2 s). Se a ação demorar mais que a fala, o passo dura o tempo da ação.
- **Helpers** (`kit.ts`): `clicar`, `digitar`, `apontar`, `mover`, `rolar`, `legendar`, `selo`. Use-os em vez de `locator.click()`
  para o cursor andar até o alvo.
- **Voz** (`tts.ts`): OpenAI `gpt-4o-mini-tts` (voz coral), depois `tts-1` (nova), depois a voz do Windows
  "Microsoft Maria Desktop". O áudio é aparado (silêncio no começo e no fim) e guardado em `saida/audio/<hash do texto>-<motor>.wav`;
  texto igual não é sintetizado de novo. Para trocar de voz, apague `saida/audio`.
- **Sincronia**: o vídeo do Playwright começa um pouco depois da criação da página. Antes do corte, o kit mostra por 0,3 s
  um quadrado magenta no canto; o compositor acha esse quadro no vídeo e corrige a diferença (fica abaixo de um quadro, 0,04 s).
- **Corte**: tudo antes da tela ficar pronta (carregamento, login em `preparar`) é descartado.
- **Montagem** (`compor.ts`): cada fala entra no instante do seu passo (`adelay` + `amix`), cada segmento vira um MP4
  (H.264 yuv420p 30 qps + AAC 48 kHz) e o concat junta todos sem recodificar. Também tira um quadro do fim de cada
  passo para `saida/quadros/`, para conferir legenda e tela sem assistir ao vídeo inteiro.
- **Contorno visual**: a camada injeta uma regra de CSS para os `Alert` do app com texto solto (sem ícone nem
  `AlertDescription`), que no app caem na coluna de 0 px do grid e quebram palavra por palavra. Some quando o app corrigir.

## Onde ficam legenda e selo

A legenda fica no alto, entre o título da página e os botões do cabeçalho: o compositor do assistente é fixo no rodapé e
as respostas novas entram por baixo, então uma faixa embaixo esconderia justamente o que a cena mostra. O selo do papel
fica no rodapé da barra lateral, logo acima do menu do usuário, num espaço vazio em todos os papéis.

Com a barra lateral aberta a legenda tem cerca de 750 px: mantenha cada `texto` em até ~110 caracteres (duas linhas);
o que passar disso é cortado com reticências. Falas longas viram dois passos.
