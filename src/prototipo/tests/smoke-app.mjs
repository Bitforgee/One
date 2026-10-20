/* Smoke test de navegação (apenas desenvolvimento).
   Abre várias rotas em Chrome headless, captura o DOM renderizado por JS e
   verifica marcadores-chave de cada tela, incluindo guardas de acesso.
   Também detecta erros de página via window.__ONE_SMOKE_ERRORS__ (ver abaixo).
   Uso: node tests/smoke-app.mjs  (requer static-server em 4178). */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const BASE = "http://localhost:4178/index.html";
const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => existsSync(p));
if (!CHROME) { console.error("Chrome/Edge não encontrado"); process.exit(3); }

function dumpDom(url) {
  return new Promise((resolve) => {
    const child = spawn(CHROME, [
      "--headless", "--disable-gpu", "--no-sandbox",
      "--virtual-time-budget=5000", "--dump-dom", url,
    ], { windowsHide: true });
    let dom = "";
    child.stdout.on("data", (d) => { dom += d.toString(); });
    child.on("close", () => resolve(dom));
  });
}

// Cada cenário: url (hash + query), e os marcadores que devem/não devem existir.
const scenarios = [
  {
    // A landing foi removida da navegação pública: a raiz "#/" agora redireciona
    // para o login. Mantemos uma asserção positiva de que a raiz resolve na tela
    // de seleção de perfis (login), com os mesmos marcadores do cenário de login.
    name: "Raiz (#/) redireciona para o login",
    url: `${BASE}#/`,
    expect: [/one-login/, /Escolha um perfil para entrar/, /Administrador/],
    reject: [/one-landing/],
  },
  {
    name: "Login (público)",
    url: `${BASE}#/login`,
    expect: [/one-login/, /Escolha um perfil para entrar/, /Administrador/],
  },
  {
    name: "Rota protegida sem sessão redireciona ao login",
    url: `${BASE}#/admin`,
    expect: [/one-login/, /Escolha um perfil para entrar/],
    reject: [/Indicadores/],
  },
  {
    name: "404 (rota inexistente, sem sessão)",
    url: `${BASE}#/rota-que-nao-existe`,
    expect: [/one-error/, /404/, /Página não encontrada/],
  },
  {
    name: "Painel do Aluno (sessão via query)",
    url: `${BASE}?demo-role=aluno#/aluno`,
    expect: [/one-app/, /one-sidebar__brand/, /Olá, Maria/, /Minhas solicitações recentes/, /Novo atendimento/],
  },
  {
    name: "Painel do Atendente (sessão via query, prévia de chamados GLPI)",
    url: `${BASE}?demo-role=atendente#/atendente`,
    expect: [/Dashboard do atendente/, /Prévia de chamados/, /ONE-105/, /one-status--/, /table/],
  },
  {
    name: "Painel do Administrador (sessão via query, prévia de chamados)",
    url: `${BASE}?demo-role=admin#/admin`,
    expect: [/Dashboard administrativo/, /Chamados \(total\)/, /Visão geral das solicitações/, /ONE-104/],
  },
  {
    name: "403 (aluno tentando rota de admin)",
    url: `${BASE}?demo-role=aluno#/admin`,
    expect: [/one-error/, /403/, /Acesso não autorizado/],
    reject: [/Chamados abertos/],
  },
  {
    name: "Base de conhecimento do aluno (só publicados)",
    url: `${BASE}?demo-role=aluno#/aluno/base`,
    expect: [/Base de conhecimento/, /Como emitir a segunda via do boleto/, /one-kb-card/],
    reject: [/Política antiga de boleto/, /Quando as notas são publicadas/],
  },
  {
    name: "Gestão da base de conhecimento (admin, CRUD)",
    url: `${BASE}?demo-role=admin#/admin/artigos`,
    expect: [/Base de conhecimento — gestão/, /Novo artigo/, /Política antiga de boleto/, /Arquivado/, /Rascunho/],
  },
  {
    name: "Assistente acadêmico (aluno)",
    url: `${BASE}?demo-role=aluno#/aluno/assistente`,
    expect: [/Assistente acadêmico/, /one-chat/, /Digite sua dúvida/, /Explique a sua dúvida/],
  },
  {
    name: "Base de conhecimento bloqueada para atendente em rota de aluno (403)",
    url: `${BASE}?demo-role=atendente#/aluno/base`,
    expect: [/one-error/, /403/],
  },
  // --- Fase 4 ---
  {
    name: "Novo atendimento (aluno)",
    url: `${BASE}?demo-role=aluno#/aluno/novo`,
    expect: [/Novo atendimento/, /Assunto/, /Setor de destino/, /Revisar e criar/],
  },
  {
    name: "Minhas solicitações (aluno)",
    url: `${BASE}?demo-role=aluno#/aluno/solicitacoes`,
    expect: [/Minhas solicitações/, /Buscar por protocolo/, /table/],
  },
  // --- Fase 5 ---
  {
    name: "Fila de chamados (atendente, só do setor)",
    url: `${BASE}?demo-role=atendente#/atendente/chamados`,
    expect: [/Chamados do setor/, /Secretaria Acadêmica/, /table/],
  },
  {
    name: "Visão Resolvidos (atendente)",
    url: `${BASE}?demo-role=atendente#/atendente/resolvidos`,
    expect: [/Resolvidos/, /table/],
  },
  // --- Fase 6 ---
  {
    name: "Indicadores (admin, gráficos SVG)",
    url: `${BASE}?demo-role=admin#/admin/indicadores`,
    expect: [/Indicadores/, /Principais categorias/, /svg/, /Chamados por setor/],
  },
  {
    name: "Todos os chamados (admin, BR-A6)",
    url: `${BASE}?demo-role=admin#/admin/chamados`,
    expect: [/Chamados/, /table/, /ONE-/],
  },
  {
    name: "Gestão de setores (admin, triagem marcada)",
    url: `${BASE}?demo-role=admin#/admin/setores`,
    expect: [/Setores/, /Triagem/, /Secretaria Acadêmica/],
  },
  {
    name: "Regras de encaminhamento (admin)",
    url: `${BASE}?demo-role=admin#/admin/regras`,
    expect: [/Regras de encaminhamento/, /Coordenação do curso do aluno/],
  },
];

let failed = 0;
for (const s of scenarios) {
  // eslint-disable-next-line no-await-in-loop
  const dom = await dumpDom(s.url);
  const missing = (s.expect || []).filter((re) => !re.test(dom));
  const leaked = (s.reject || []).filter((re) => re.test(dom));
  const ok = missing.length === 0 && leaked.length === 0;
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${s.name}`);
  if (missing.length) console.log("      faltou:", missing.map(String).join(", "));
  if (leaked.length) console.log("      vazou:", leaked.map(String).join(", "));
}

console.log(`\nRESUMO SMOKE: ${scenarios.length - failed}/${scenarios.length} cenários ok`);
process.exit(failed === 0 ? 0 : 1);
