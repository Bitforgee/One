/* Driver de teste headless (apenas desenvolvimento).
   Sobe Chrome headless no runner.html, lê window.__ONE_TEST_RESULT__ via
   captura do DOM e imprime um resumo + código de saída.
   Uso: node tests/run-headless.mjs  (requer o static-server rodando em 4178)
   Sem dependências externas. */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const URL = "http://localhost:4178/tests/runner.html";
const CHROME_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chrome) { console.error("Nenhum Chrome/Edge encontrado."); process.exit(3); }

const args = [
  "--headless", "--disable-gpu", "--no-sandbox",
  "--virtual-time-budget=8000", "--dump-dom", URL,
];

const child = spawn(chrome, args, { windowsHide: true });
let dom = "";
child.stdout.on("data", (d) => { dom += d.toString(); });
child.on("close", () => {
  // Extrai o texto da div de resultados.
  const m = dom.match(/TODOS OS TESTES PASSARAM[^<]*|FALHAS DETECTADAS[^<]*/);
  const okCount = (dom.match(/>✔</g) || []).length;
  const failCount = (dom.match(/>✘</g) || []).length;
  if (m) {
    console.log("RESUMO:", m[0].trim());
  } else {
    console.log(`RESUMO (derivado): ${okCount} ok, ${failCount} falhas`);
  }
  console.log(`CONTAGEM: passaram=${okCount} falharam=${failCount}`);
  process.exit(failCount === 0 && okCount > 0 ? 0 : 1);
});
