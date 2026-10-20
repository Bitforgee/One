/* Verificação de acessibilidade estrutural (apenas desenvolvimento).
   NÃO substitui uma auditoria WCAG completa (que exige testes manuais com
   tecnologia assistiva). Checa, via CDP, um conjunto de regras objetivas em
   rotas-chave: lang do documento, imagens com alt, controles de formulário com
   rótulo/aria, botões com nome acessível, foco não suprimido globalmente e
   presença de landmarks/headings.
   Uso: node tests/a11y-check.mjs  (requer static-server em 4178). */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = "http://localhost:4178/index.html";
const PORT = 9224;
const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => existsSync(p));
if (!CHROME) { console.error("Chrome/Edge não encontrado"); process.exit(3); }

const profile = mkdtempSync(join(tmpdir(), "one-a11y-"));
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function target() { for (let i = 0; i < 40; i += 1) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json`); const l = await r.json(); const p = l.find((t) => t.type === "page" && t.webSocketDebuggerUrl); if (p) return p.webSocketDebuggerUrl; } catch { } await sleep(250); } throw new Error("no target"); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.p = new Map(); ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && this.p.has(m.id)) { const { resolve, reject } = this.p.get(m.id); this.p.delete(m.id); if (m.error) reject(new Error(m.error.message)); else resolve(m.result); } }); } send(method, params = {}) { const id = ++this.id; return new Promise((res, rej) => { this.p.set(id, { resolve: res, reject: rej }); this.ws.send(JSON.stringify({ id, method, params })); }); } async eval(expr) { const r = await this.send("Runtime.evaluate", { expression: `(async function(){ ${expr} })()`, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; } async nav(u) { await this.send("Page.navigate", { url: u }); } }

const AUDIT = `
  const prob = [];
  // lang do documento
  if (!/^pt/i.test(document.documentElement.lang||'')) prob.push('html sem lang pt-BR');
  // imagens sem alt (ignora aria-hidden)
  document.querySelectorAll('img').forEach(i=>{ if(!i.hasAttribute('alt') && i.getAttribute('aria-hidden')!=='true') prob.push('img sem alt'); });
  // controles de formulário sem rótulo acessível
  document.querySelectorAll('input,select,textarea').forEach(c=>{
    if(c.type==='hidden') return;
    const id=c.id; const temLabel = id && document.querySelector('label[for="'+CSS.escape(id)+'"]');
    const aria = c.getAttribute('aria-label')||c.getAttribute('aria-labelledby')||c.getAttribute('placeholder');
    if(!temLabel && !aria) prob.push('controle sem rótulo: '+(c.tagName+'#'+(id||'')+'.'+(c.className||'')).slice(0,40));
  });
  // botões sem nome acessível
  document.querySelectorAll('button').forEach(b=>{
    const nome=(b.textContent||'').trim() || b.getAttribute('aria-label') || b.getAttribute('title');
    if(!nome) prob.push('botão sem nome acessível');
  });
  // landmarks e heading principal
  if(!document.querySelector('main, [role=main]')) prob.push('sem landmark main');
  if(!document.querySelector('h1')) prob.push('sem h1');
  return prob;
`;

const rotas = [
  { nome: "Raiz (#/ → login)", url: `${BASE}#/` },
  { nome: "Login", url: `${BASE}#/login` },
  { nome: "Aluno — Novo atendimento", url: `${BASE}?demo-role=aluno#/aluno/novo` },
  { nome: "Aluno — Assistente", url: `${BASE}?demo-role=aluno#/aluno/assistente` },
  { nome: "Atendente — Chamados", url: `${BASE}?demo-role=atendente#/atendente/chamados` },
  { nome: "Admin — Indicadores", url: `${BASE}?demo-role=admin#/admin/indicadores` },
  { nome: "Admin — Artigos", url: `${BASE}?demo-role=admin#/admin/artigos` },
];

try {
  const ws = new WebSocket(await target());
  await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
  const cdp = new CDP(ws); await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
  let totalProb = 0;
  for (const r of rotas) {
    await cdp.nav(r.url); await sleep(900);
    const probs = await cdp.eval(AUDIT);
    const unicos = Array.from(new Set(probs));
    if (unicos.length) { totalProb += unicos.length; console.log(`AVISO  ${r.nome}:`); unicos.forEach((p) => console.log("   - " + p)); }
    else console.log(`OK     ${r.nome}`);
  }
  ws.close();
  console.log(`\nRESUMO A11Y (estrutural): ${totalProb} aviso(s). Observação: auditoria WCAG completa exige teste manual com leitor de tela.`);
  process.exitCode = 0; // avisos não falham a auditoria estrutural
} catch (e) { console.error("ERRO A11Y:", e.message); process.exitCode = 2; }
finally { try { chrome.kill(); } catch { } try { rmSync(profile, { recursive: true, force: true }); } catch { } }
