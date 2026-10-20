/* Verificação de erros de console (apenas desenvolvimento).
   Abre rotas-chave em Chrome headless com --enable-logging e inspeciona o
   stderr por mensagens de erro de página (SEVERE). Uso: node tests/console-check.mjs */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = "http://localhost:4178/index.html";
const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => existsSync(p));
if (!CHROME) { console.error("Chrome/Edge não encontrado"); process.exit(3); }

const rotas = [
  `${BASE}#/`,
  `${BASE}#/login`,
  `${BASE}?demo-role=aluno#/aluno`,
  `${BASE}?demo-role=aluno#/aluno/novo`,
  `${BASE}?demo-role=aluno#/aluno/assistente`,
  `${BASE}?demo-role=atendente#/atendente/chamados`,
  `${BASE}?demo-role=admin#/admin/indicadores`,
  `${BASE}?demo-role=admin#/admin/artigos`,
];

function check(url) {
  return new Promise((resolve) => {
    const prof = mkdtempSync(join(tmpdir(), "one-cc-"));
    const child = spawn(CHROME, [
      "--headless", "--disable-gpu", "--no-sandbox",
      "--enable-logging=stderr", "--v=0", "--log-level=0",
      `--user-data-dir=${prof}`,
      "--virtual-time-budget=4000", "--dump-dom", url,
    ], { windowsHide: true });
    let err = "";
    child.stderr.on("data", (d) => { err += d.toString(); });
    child.on("close", () => {
      // Procura erros de JS da página (ignora ruído do próprio Chrome).
      const linhas = err.split("\n").filter((l) =>
        /Uncaught|SyntaxError|is not a function|is not defined|TypeError|ReferenceError/.test(l)
      );
      resolve({ url, erros: linhas });
    });
  });
}

let totalErros = 0;
for (const r of rotas) {
  // eslint-disable-next-line no-await-in-loop
  const { url, erros } = await check(r);
  if (erros.length) { totalErros += erros.length; console.log("ERRO:", url); erros.forEach((e) => console.log("   ", e.trim())); }
  else console.log("OK  ", url);
}
console.log(`\nRESUMO CONSOLE: ${totalErros} erro(s) de JavaScript detectado(s)`);
process.exit(totalErros === 0 ? 0 : 1);
