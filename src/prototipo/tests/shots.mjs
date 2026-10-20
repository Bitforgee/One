/* Captura de telas do protótipo (apenas desenvolvimento).
   Gera PNGs das principais telas em tema claro/escuro e tamanhos
   desktop/mobile. Usa Chrome headless e os parâmetros de query ?theme= e
   ?demo-role= (apenas para demonstração/testes).
   Uso: node tests/shots.mjs  (requer static-server em 4178). */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => existsSync(p));
if (!CHROME) { console.error("Chrome/Edge não encontrado"); process.exit(3); }

const OUT = join(process.cwd(), "tests", "screenshots");
mkdirSync(OUT, { recursive: true });
const B = "http://localhost:4178/index.html";

const shots = [
  { name: "landing-claro", url: `${B}?theme=light#/`, size: "1366,900" },
  { name: "landing-escuro", url: `${B}?theme=dark#/`, size: "1366,900" },
  { name: "login-claro", url: `${B}?theme=light#/login`, size: "1366,900" },
  { name: "aluno-claro", url: `${B}?theme=light&demo-role=aluno#/aluno`, size: "1366,950" },
  { name: "atendente-claro", url: `${B}?theme=light&demo-role=atendente#/atendente`, size: "1366,950" },
  { name: "atendente-escuro", url: `${B}?theme=dark&demo-role=atendente#/atendente`, size: "1366,950" },
  { name: "admin-claro", url: `${B}?theme=light&demo-role=admin#/admin`, size: "1366,1000" },
  { name: "admin-escuro", url: `${B}?theme=dark&demo-role=admin#/admin`, size: "1366,1000" },
  { name: "aluno-mobile-claro", url: `${B}?theme=light&demo-role=aluno#/aluno`, size: "390,850" },
  { name: "404-claro", url: `${B}?theme=light#/rota-inexistente`, size: "1100,700" },
  { name: "kb-aluno-claro", url: `${B}?theme=light&demo-role=aluno#/aluno/base`, size: "1366,950" },
  { name: "kb-admin-escuro", url: `${B}?theme=dark&demo-role=admin#/admin/artigos`, size: "1366,950" },
  { name: "assistente-claro", url: `${B}?theme=light&demo-role=aluno&demo-ask=${encodeURIComponent("Como emitir meu boleto?")}#/aluno/assistente`, size: "1366,950" },
  { name: "assistente-escuro", url: `${B}?theme=dark&demo-role=aluno&demo-ask=${encodeURIComponent("Quero falar sobre estágio")}#/aluno/assistente`, size: "1366,950" },
  { name: "assistente-mobile-claro", url: `${B}?theme=light&demo-role=aluno#/aluno/assistente`, size: "390,850" },
  // Fase 4-6
  { name: "novo-atendimento-claro", url: `${B}?theme=light&demo-role=aluno#/aluno/novo`, size: "1366,900" },
  { name: "minhas-solicitacoes-claro", url: `${B}?theme=light&demo-role=aluno#/aluno/solicitacoes`, size: "1366,900" },
  { name: "fila-atendente-claro", url: `${B}?theme=light&demo-role=atendente#/atendente/chamados`, size: "1366,900" },
  { name: "chamado-detalhe-escuro", url: `${B}?theme=dark&demo-role=atendente#/atendente/chamado/ONE-1050`, size: "1366,1000" },
  { name: "indicadores-claro", url: `${B}?theme=light&demo-role=admin#/admin/indicadores`, size: "1366,1050" },
  { name: "indicadores-escuro", url: `${B}?theme=dark&demo-role=admin#/admin/indicadores`, size: "1366,1050" },
  { name: "admin-artigos-claro", url: `${B}?theme=light&demo-role=admin#/admin/artigos`, size: "1366,950" },
  { name: "aluno-chamado-detalhe", url: `${B}?theme=light&demo-role=aluno#/aluno/solicitacoes/ONE-1052`, size: "1366,1000" },
];

function capture({ name, url, size }) {
  return new Promise((resolve) => {
    const file = join(OUT, name + ".png");
    const child = spawn(CHROME, [
      "--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
      `--window-size=${size}`, "--virtual-time-budget=5000",
      `--screenshot=${file}`, url,
    ], { windowsHide: true });
    child.on("close", () => { console.log("shot:", name); resolve(); });
  });
}

for (const s of shots) {
  // eslint-disable-next-line no-await-in-loop
  await capture(s);
}
console.log("Capturas em:", OUT);
