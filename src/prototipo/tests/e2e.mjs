/* ==========================================================================
   One — tests/e2e.mjs
   Teste ponta a ponta REAL via Chrome DevTools Protocol (sem dependências
   externas: usa o WebSocket global do Node). Lança o Chrome headless com
   porta de depuração, conecta ao alvo da página e executa cliques e leituras
   reais no DOM (os mesmos event handlers da interface são disparados).

   Exercita a jornada principal clicando de verdade:
   login → assistente → responder → "Não" → abrir solicitação → protocolo →
   trocar para atendente → abrir chamado → assumir → resolver → trocar para
   aluno → confirmar resolução → ver histórico → indicadores.

   Requer o static-server em 4178. Uso: node tests/e2e.mjs
   ========================================================================== */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = "http://localhost:4178/index.html";
const PORT = 9222;
const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => existsSync(p));
if (!CHROME) { console.error("Chrome/Edge não encontrado"); process.exit(3); }

const profile = mkdtempSync(join(tmpdir(), "one-e2e-"));
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  "--window-size=1366,950", "about:blank",
], { windowsHide: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Descobre o WebSocket de uma aba (page) via endpoint HTTP /json. */
async function getPageTarget() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      const list = await res.json();
      const page = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* aguarda o Chrome subir */ }
    await sleep(250);
  }
  throw new Error("Não foi possível conectar ao Chrome (CDP).");
}

/** Cliente CDP mínimo sobre o WebSocket global. */
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.ready = false;
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  /** Avalia JS na página e devolve o valor serializável. */
  async eval(expr) {
    const r = await this.send("Runtime.evaluate", {
      expression: `(async function(){ ${expr} })()`,
      returnByValue: true, awaitPromise: true,
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + " :: " + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || ""));
    return r.result.value;
  }
  async navigate(url) { await this.send("Page.navigate", { url }); }
}

/* --- Helpers de interação (rodam dentro da página) ------------------------ */

// Clica no primeiro elemento que casa com o seletor OU cujo texto contém `text`.
const CLICK = `
  const sel = arguments; // não usado; usamos closures via template
`;

async function run() {
  const wsUrl = await getPageTarget();
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
  const cdp = new CDP(ws);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  const results = [];
  const check = (nome, cond, detalhe = "") => { results.push({ nome, ok: !!cond, detalhe }); console.log(`${cond ? "PASS" : "FAIL"}  ${nome}${detalhe ? " — " + detalhe : ""}`); };

  // Função utilitária injetada: clicar por texto.
  const helpers = `
    window.__clickText = function(selector, text, exact){
      const els = Array.from(document.querySelectorAll(selector));
      const norm = (s)=> (s||'').trim();
      const match = !text ? els[0]
        : exact ? els.find(e => norm(e.textContent).toLowerCase() === text.toLowerCase())
                : els.find(e => norm(e.textContent).toLowerCase().includes(text.toLowerCase()));
      if (match){ match.click(); return true; } return false;
    };
    window.__clickIn = function(scopeSel, selector, text){
      const scope = document.querySelector(scopeSel); if(!scope) return false;
      const els = Array.from(scope.querySelectorAll(selector));
      const match = text ? els.find(e => (e.textContent||'').trim().toLowerCase().includes(text.toLowerCase())) : els[0];
      if (match){ match.click(); return true; } return false;
    };
    window.__setVal = function(selector, val){
      const e = document.querySelector(selector); if(!e) return false;
      e.value = val; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); return true;
    };
    window.__text = function(){ return document.body.innerText; };
    window.__exists = function(sel){ return !!document.querySelector(sel); };
  `;

  // Reinstala os helpers após cada navegação de documento (reload/nav real).
  const injeta = () => cdp.eval(helpers + " return true;");

  // Espera até que o texto da página contenha `txt` (ou estoure o tempo).
  async function waitForText(txt, tentativas = 20) {
    for (let i = 0; i < tentativas; i += 1) {
      const ok = await cdp.eval(`return document.body.innerText.includes(${JSON.stringify(txt)});`);
      if (ok) return true;
      await sleep(150);
    }
    return false;
  }
  // Espera por um seletor existir.
  async function waitForSel(sel, tentativas = 20) {
    for (let i = 0; i < tentativas; i += 1) {
      const ok = await cdp.eval(`return !!document.querySelector(${JSON.stringify(sel)});`);
      if (ok) return true;
      await sleep(150);
    }
    return false;
  }

  // 1) Login real como Aluno (clica no card). Começa com storage limpo.
  await cdp.navigate(`${BASE}#/login`);
  await sleep(900);
  await cdp.eval(`localStorage.clear(); return true;`);
  await cdp.send("Page.reload", {}); await sleep(900);
  await injeta();
  const logou = await cdp.eval(`
    const btns = Array.from(document.querySelectorAll('button[aria-label^="Entrar como"]'));
    const aluno = btns.find(b => /Aluno/i.test(b.getAttribute('aria-label')));
    if(aluno){ aluno.click(); return true } return false;
  `);
  await sleep(900);
  const rotaAluno = await cdp.eval("return location.hash;");
  check("Login do aluno (clique real) leva ao painel", logou && rotaAluno.includes("/aluno"), rotaAluno);

  // 2) Navega ao assistente pela SIDEBAR (clique real no link).
  await injeta();
  await cdp.eval(`window.__clickText('.one-sidebar__link', 'Assistente'); return true;`);
  await sleep(800);
  await injeta();
  await cdp.eval(`window.__setVal('.one-chat__input input[type=text]', 'Como emitir meu boleto?'); return true;`);
  await cdp.eval(`window.__clickText('.one-chat__input button[type=submit]', ''); return true;`);
  await sleep(900);
  const temResposta = await cdp.eval(`return window.__text().includes('Isso resolveu');`);
  const temRef = await cdp.eval(`return window.__text().includes('KB-001');`);
  check("Assistente responde com artigo e pergunta Sim/Não (BR-B3)", temResposta);
  check("Assistente mostra referência do artigo (BR-B8)", temRef);

  // 3) Clica "Não" DENTRO do bloco de feedback (evita o chip de exemplo).
  const clicouNao = await cdp.eval(`return window.__clickIn('#one-feedback', 'button', 'Não');`);
  await sleep(500);
  const ofereceSolic = await cdp.eval(`return window.__text().includes('Abrir solicitação');`);
  check("Responder 'Não' oferece abrir solicitação (BR-B6)", clicouNao && ofereceSolic);

  // 4) Abre a solicitação (clique real) — cria o chamado.
  await cdp.eval(`window.__clickIn('#one-escalar', 'button', 'Abrir solicitação'); return true;`);
  await sleep(800);
  const protocolo = await cdp.eval(`const m = window.__text().match(/ONE-\\d+/); return m ? m[0] : null;`);
  check("Conversa vira solicitação com protocolo ONE-<n> (BR-D5)", !!protocolo, protocolo || "sem protocolo");

  // 5) "Minhas solicitações": o chamado aparece.
  await injeta();
  await cdp.eval(`window.__clickText('.one-sidebar__link', 'Minhas solicitações'); return true;`);
  await sleep(700);
  const apareceNaLista = await cdp.eval(`return window.__text().includes(${JSON.stringify(protocolo)});`);
  check("Chamado aparece em 'Minhas solicitações' (BR-A4/D6)", apareceNaLista);

  // Confirma o setor de destino do chamado (boleto → Financeiro) no modelo.
  const setorDoChamado = await cdp.eval(`
    const ts=JSON.parse(localStorage.getItem('one.proto.tickets')||'[]');
    const t=ts.find(x=>x.protocolo===${JSON.stringify(protocolo)});
    return t ? t.setor : null;
  `);
  check("Chamado roteado para 'Financeiro' (BR-E)", setorDoChamado === "Financeiro", "setor=" + setorDoChamado);

  // Loga como atendente do Financeiro. Define a sessão e faz um RELOAD real
  // (mudança só de hash não reavalia os módulos, então a sessão em cache ficaria
  // desatualizada). Após o reload, o documento roda com a sessão da atendente.
  await cdp.eval(`
    localStorage.setItem('one.proto.session', JSON.stringify({name:'Beatriz Rocha', role:'atendente', sector:'Financeiro', startedAt:new Date().toISOString()}));
    location.hash = '#/atendente/chamados'; return true;
  `);
  await cdp.send("Page.reload", {});
  await waitForText(protocolo);
  await injeta();
  const atendenteVe = await cdp.eval(`return window.__text().includes(${JSON.stringify(protocolo)});`);
  check("Atendente do setor (Financeiro) vê o chamado na fila (BR-A5)", atendenteVe);

  // 7) Abre o chamado pela própria fila (clique real no botão de ação da linha).
  await cdp.eval(`window.__clickIn('.table-responsive', 'a[href="#/atendente/chamado/${protocolo}"]', ''); return true;`);
  await waitForText("Assumir");
  await injeta();
  await cdp.eval(`window.__clickText('button', 'Assumir'); return true;`);
  await sleep(500);
  const emAtendimento = await cdp.eval(`
    const ts=JSON.parse(localStorage.getItem('one.proto.tickets')||'[]');
    const t=ts.find(x=>x.protocolo===${JSON.stringify(protocolo)});
    return t ? t.situacao : null;
  `);
  check("Atendente assume o chamado → IN_PROGRESS (F2)", emAtendimento === "IN_PROGRESS", "situação=" + emAtendimento);

  // Nota interna (marca o checkbox e envia) — a página re-renderiza após assumir.
  await injeta();
  await waitForSel(".card textarea");
  await cdp.eval(`window.__setVal('.card textarea', 'Nota interna de teste'); return true;`);
  await cdp.eval(`const c=document.querySelector('#ag-interna'); if(c){c.checked=true; c.dispatchEvent(new Event('change',{bubbles:true}));} return true;`);
  await cdp.eval(`window.__clickText('button', 'Enviar'); return true;`);
  await sleep(500);

  // Resolve (abre modal de motivo → confirma).
  await injeta();
  await waitForText("Resolver");
  await cdp.eval(`window.__clickText('button', 'Resolver'); return true;`);
  await waitForSel("#one-motivo-modal textarea");
  await cdp.eval(`window.__setVal('#one-motivo-modal textarea', 'Boleto emitido pelo portal.'); return true;`);
  await cdp.eval(`window.__clickText('#one-motivo-ok', ''); return true;`);
  await sleep(600);
  const resolvido = await cdp.eval(`
    const ts=JSON.parse(localStorage.getItem('one.proto.tickets')||'[]');
    const t=ts.find(x=>x.protocolo===${JSON.stringify(protocolo)});
    return t ? t.situacao : null;
  `);
  check("Atendente resolve o chamado → RESOLVED (F5)", resolvido === "RESOLVED", "situação=" + resolvido);

  // 8) Nota interna existe no modelo, mas é oculta ao aluno (BR-G2).
  const hasInterna = await cdp.eval(`
    const ts=JSON.parse(localStorage.getItem('one.proto.tickets')||'[]');
    const t=ts.find(x=>x.protocolo===${JSON.stringify(protocolo)});
    return t ? t.mensagens.some(m=>m.tipo==='interna' && /Nota interna de teste/.test(m.texto)) : false;
  `);
  await cdp.navigate(`${BASE}?demo-role=aluno#/aluno/solicitacoes/${protocolo}`);
  await waitForText(protocolo);
  await injeta();
  const alunoNaoVeNota = await cdp.eval(`return !window.__text().includes('Nota interna de teste');`);
  check("Nota interna existe no modelo mas é oculta ao aluno (BR-G2)", hasInterna && alunoNaoVeNota, "modelo=" + hasInterna + " ocultaUI=" + alunoNaoVeNota);

  // 9) Aluno confirma a resolução → CLOSED (F7).
  await waitForText("Confirmar resolução");
  await cdp.eval(`window.__clickText('button', 'Confirmar resolução'); return true;`);
  await sleep(700);
  const fechado = await cdp.eval(`
    const ts=JSON.parse(localStorage.getItem('one.proto.tickets')||'[]');
    const t=ts.find(x=>x.protocolo===${JSON.stringify(protocolo)});
    return t ? t.situacao : null;
  `);
  check("Aluno confirma resolução → CLOSED (F7)", fechado === "CLOSED", "situação=" + fechado);

  // 10) Histórico visível ao aluno (BR-H). O título é exibido em maiúsculas
  //     via CSS (text-transform), então a comparação ignora caixa.
  await injeta();
  const temHistorico = await cdp.eval(`return /hist[oó]rico/i.test(document.body.innerText);`);
  check("Histórico visível no detalhe do aluno (BR-H)", temHistorico);

  // 11) Admin: indicadores renderizam gráficos.
  await cdp.navigate(`${BASE}?demo-role=admin#/admin/indicadores`);
  const temSvg = await waitForSel("svg");
  await injeta();
  // Os títulos de seção são exibidos em maiúsculas via CSS; comparação ignora caixa.
  const temGrafico = await cdp.eval(`
    const n = document.querySelectorAll('svg').length;
    return n >= 2 && /principais categorias/i.test(document.body.innerText) && /chamados por setor/i.test(document.body.innerText);
  `);
  check("Indicadores renderizam gráficos SVG (seção I)", temGrafico && temSvg);

  // 12) Assistente SEM correspondência (BR-B4).
  await cdp.navigate(`${BASE}?demo-role=aluno#/aluno/assistente`);
  await sleep(800);
  await injeta();
  await cdp.eval(`window.__setVal('.one-chat__input input[type=text]', 'quero conversar sobre futebol e cinema'); return true;`);
  await cdp.eval(`window.__clickText('.one-chat__input button[type=submit]', ''); return true;`);
  await sleep(900);
  const semArtigo = await cdp.eval(`return window.__text().includes('Não encontrei um artigo publicado');`);
  const naoMostrouArtigo = await cdp.eval(`return !window.__text().includes('Isso resolveu');`);
  check("Assistente sem correspondência não inventa resposta nem mostra artigo (BR-B4)", semArtigo && naoMostrouArtigo);

  // 13) Encaminhamento inválido é rejeitado (BR-G4) — via serviço real na página.
  const encInvalido = await cdp.eval(`
    const mod = await import('/js/services/ticket-service.js');
    const t = await mod.criarDeConversa({ aluno:{name:'X',course:'Análise e Desenvolvimento de Sistemas'}, perguntaInicial:'p', artigoSnapshot:{categoria:'Financeiro › Boleto'} });
    let rejeitouMesmo=false, rejeitouSemMotivo=false;
    try{ await mod.encaminhar(t.protocolo,'Beatriz Rocha','Financeiro','motivo'); }catch(e){ rejeitouMesmo=true; }
    try{ await mod.encaminhar(t.protocolo,'Beatriz Rocha','Secretaria Acadêmica',''); }catch(e){ rejeitouSemMotivo=true; }
    return rejeitouMesmo && rejeitouSemMotivo;
  `);
  check("Encaminhamento sem motivo ou para o mesmo setor é rejeitado (BR-G4)", encInvalido);

  // 14) Assistente: pergunta cujo único artigo é DRAFT não é respondida (BR-B2).
  await cdp.navigate(`${BASE}?demo-role=aluno#/aluno/assistente`);
  await waitForSel(".one-chat__input input[type=text]");
  await injeta();
  await cdp.eval(`window.__setVal('.one-chat__input input[type=text]', 'minha nota de arquitetura não apareceu'); return true;`);
  await cdp.eval(`window.__clickText('.one-chat__input button[type=submit]', ''); return true;`);
  await sleep(900);
  const notaDraftNaoResponde = await cdp.eval(`return document.body.innerText.includes('Não encontrei um artigo publicado') && !document.body.innerText.includes('calendário acadêmico');`);
  check("Artigo DRAFT não alimenta o assistente (BR-B2)", notaDraftNaoResponde);

  // 15) Tema: alterna por clique e persiste após reload.
  await cdp.navigate(`${BASE}?demo-role=aluno#/aluno`);
  await waitForSel("[data-one-theme-toggle]");
  await injeta();
  const temaAntes = await cdp.eval(`return document.documentElement.getAttribute('data-bs-theme');`);
  await cdp.eval(`window.__clickText('[data-one-theme-toggle]', ''); return true;`);
  await sleep(300);
  const temaDepois = await cdp.eval(`return document.documentElement.getAttribute('data-bs-theme');`);
  await cdp.send("Page.reload", {}); await sleep(800);
  const temaAposReload = await cdp.eval(`return document.documentElement.getAttribute('data-bs-theme');`);
  check("Tema alterna por clique e persiste (localStorage)", temaAntes !== temaDepois && temaDepois === temaAposReload, `${temaAntes}→${temaDepois}→${temaAposReload}`);

  // 16) Permissão: aluno acessando rota de admin recebe 403 (navegação real).
  await cdp.navigate(`${BASE}?demo-role=aluno#/admin/indicadores`);
  await sleep(700);
  const bloqueado = await cdp.eval(`return document.body.innerText.includes('403') || document.body.innerText.includes('Acesso não autorizado');`);
  check("Aluno é bloqueado em rota de admin (BR-A / 403)", bloqueado);

  // 17) Persistência do chamado após reload real.
  await cdp.navigate(`${BASE}?demo-role=aluno#/aluno/solicitacoes`);
  await sleep(600);
  await cdp.send("Page.reload", {});
  await sleep(900);
  const persiste = await cdp.eval(`return document.body.innerText.includes(${JSON.stringify(protocolo)});`);
  check("Chamado persiste após recarregar a página (localStorage)", persiste);

  ws.close();
  const falhas = results.filter((r) => !r.ok);
  console.log(`\nRESUMO E2E: ${results.length - falhas.length}/${results.length} verificações reais ok`);
  return falhas.length;
}

let code = 1;
try { code = (await run()) === 0 ? 0 : 1; }
catch (e) { console.error("ERRO E2E:", e.message); code = 2; }
finally {
  try { chrome.kill(); } catch { /* noop */ }
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* noop */ }
}
process.exit(code);
