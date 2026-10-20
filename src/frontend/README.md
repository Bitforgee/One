# Front-end do One

O front-end é uma SPA/PWA em React, criada com Vite e vite-plugin-pwa (RNF-01 do documento de requisitos).

> **Decisão pendente:** o grupo ainda vai escolher entre TypeScript e JavaScript. Até lá, esta pasta tem só este arquivo.

## Como criar o projeto depois da decisão

Pré-requisito: Node.js 20.19 ou 22.12 em diante.

Rode a partir da raiz do repositório. O `--overwrite` troca este README pelo do template.

TypeScript:

```bash
npm create vite@latest src/frontend -- --template react-ts --overwrite
```

JavaScript:

```bash
npm create vite@latest src/frontend -- --template react --overwrite
```

Depois, dentro de `src/frontend/`:

```bash
npm install
npm install -D vite-plugin-pwa
```

A configuração do plugin está no guia oficial: <https://vite-pwa-org.netlify.app/guide/>.
