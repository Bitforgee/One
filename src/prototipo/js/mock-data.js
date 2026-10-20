/* ==========================================================================
   One — mock-data.js
   Dados demonstrativos (fictícios) usados nas prévias da Fase 2.
   Tenta carregar data/demo-data.json via fetch; se não for possível (ex.:
   abertura por file://), usa uma cópia embutida equivalente. Assim o protótipo
   funciona tanto em servidor estático quanto offline.

   IMPORTANTE: nada aqui é dado real. Nas próximas fases, estes dados passam a
   ser manipulados (criação/edição de chamados). Na Fase 2 são apenas prévias.
   ========================================================================== */

/** Metadados dos estados do chamado (seção F das regras de negócio). */
export const SITUACOES = {
  OPEN: { label: "Aberto", cls: "open" },
  IN_PROGRESS: { label: "Em atendimento", cls: "in_progress" },
  WAITING_STUDENT: { label: "Aguardando aluno", cls: "waiting_student" },
  RESOLVED: { label: "Resolvido", cls: "resolved" },
  CLOSED: { label: "Fechado", cls: "closed" },
};

/** Metadados dos estados do artigo (BR-C2). */
export const STATUS_ARTIGO = {
  DRAFT: { label: "Rascunho", cls: "waiting_student" },
  PUBLISHED: { label: "Publicado", cls: "resolved" },
  ARCHIVED: { label: "Arquivado", cls: "closed" },
};

/** Cópia embutida (fallback) — espelha data/demo-data.json. */
const FALLBACK = {
  setores: [
    { id: "secretaria", nome: "Secretaria Acadêmica", triagem: true },
    { id: "financeiro", nome: "Financeiro", triagem: false },
    { id: "coord-ads", nome: "Coordenação ADS", triagem: false },
    { id: "ti", nome: "TI / Suporte", triagem: false },
  ],
  categorias: [
    { id: "fin-boleto", nome: "Financeiro › Boleto" },
    { id: "aca-documentos", nome: "Acadêmico › Documentos" },
    { id: "aca-notas", nome: "Acadêmico › Notas" },
    { id: "tec-portal", nome: "Tecnologia › Portal do Aluno" },
    { id: "aca-matricula", nome: "Acadêmico › Matrícula" },
  ],
  regrasRoteamento: [
    { categoria: "Financeiro › Boleto", destino: "Financeiro" },
    { categoria: "Acadêmico › Documentos", destino: "Secretaria Acadêmica" },
    { categoria: "Acadêmico › Matrícula", destino: "Secretaria Acadêmica" },
    { categoria: "Acadêmico › Notas", destino: "coordenacao-do-curso" },
    { categoria: "Tecnologia › Portal do Aluno", destino: "TI / Suporte" },
  ],
  cursos: [
    { id: "ads", nome: "Análise e Desenvolvimento de Sistemas", coordenacao: "Coordenação ADS" },
    { id: "eng-sw", nome: "Engenharia de Software", coordenacao: "Coordenação ADS" },
  ],
  usuarios: [
    { nome: "Maria Souza", perfil: "Aluno", vinculo: "Análise e Desenvolvimento de Sistemas", ativo: true },
    { nome: "João Silva", perfil: "Aluno", vinculo: "Análise e Desenvolvimento de Sistemas", ativo: true },
    { nome: "Carlos Lima", perfil: "Atendente", vinculo: "Secretaria Acadêmica", ativo: true },
    { nome: "Beatriz Rocha", perfil: "Atendente", vinculo: "Financeiro", ativo: true },
    { nome: "Ana Diretora", perfil: "Administrador", vinculo: "—", ativo: true },
    { nome: "Rafael Antigo", perfil: "Atendente", vinculo: "TI / Suporte", ativo: false },
  ],
  chamados: [
    { protocolo: "ONE-1053", assunto: "Problema para emitir boleto", aluno: "João Silva", categoria: "Financeiro › Boleto", setor: "Financeiro", situacao: "OPEN", abertura: "2026-10-06", atualizacao: "2026-10-06" },
    { protocolo: "ONE-1052", assunto: "Nota de Arquitetura não publicada", aluno: "Maria Souza", categoria: "Acadêmico › Notas", setor: "Coordenação ADS", situacao: "IN_PROGRESS", abertura: "2026-10-05", atualizacao: "2026-10-06" },
    { protocolo: "ONE-1051", assunto: "Não consigo acessar o Portal do Aluno", aluno: "Pedro Alves", categoria: "Tecnologia › Portal do Aluno", setor: "TI / Suporte", situacao: "WAITING_STUDENT", abertura: "2026-10-05", atualizacao: "2026-10-06" },
    { protocolo: "ONE-1050", assunto: "Atestado de escolaridade", aluno: "Ana Costa", categoria: "Acadêmico › Documentos", setor: "Secretaria Acadêmica", situacao: "RESOLVED", abertura: "2026-10-03", atualizacao: "2026-10-05" },
    { protocolo: "ONE-1049", assunto: "Dúvida sobre rematrícula", aluno: "Lucas Pereira", categoria: "Acadêmico › Matrícula", setor: "Secretaria Acadêmica", situacao: "CLOSED", abertura: "2026-10-01", atualizacao: "2026-10-04" },
    { protocolo: "ONE-1048", assunto: "Segunda via do boleto do semestre", aluno: "Carla Dias", categoria: "Financeiro › Boleto", setor: "Financeiro", situacao: "IN_PROGRESS", abertura: "2026-10-02", atualizacao: "2026-10-06" },
  ],
  artigos: [
    { id: "KB-001", versao: 2, titulo: "Como emitir a segunda via do boleto?", categoria: "Financeiro › Boleto", perguntasRelacionadas: ["como emitir boleto", "segunda via do boleto", "onde vejo meu boleto", "preciso pagar a mensalidade", "emitir boleto do semestre"], conteudo: "Para emitir a segunda via do boleto:\n1. Acesse o Portal do Aluno.\n2. Entre em \"Financeiro\".\n3. Selecione \"Boletos\".\n4. Escolha a competência desejada e clique em \"Gerar segunda via\".", links: [{ rotulo: "Acessar o Portal do Aluno", url: "#" }], status: "PUBLISHED", atualizadoEm: "2026-10-04", atualizadoPor: "Ana Diretora" },
    { id: "KB-002", versao: 1, titulo: "Como solicitar o atestado de escolaridade?", categoria: "Acadêmico › Documentos", perguntasRelacionadas: ["atestado de escolaridade", "atestado de matrícula", "como solicitar atestado", "preciso de um comprovante de matrícula", "documento de matrícula"], conteudo: "O atestado de escolaridade pode ser emitido pelo próprio aluno:\n1. Acesse o Portal do Aluno.\n2. Entre em \"Documentos\".\n3. Selecione \"Atestado de matrícula\".\n4. Baixe o PDF gerado.", links: [{ rotulo: "Portal do Aluno › Documentos", url: "#" }], status: "PUBLISHED", atualizadoEm: "2026-10-03", atualizadoPor: "Ana Diretora" },
    { id: "KB-003", versao: 1, titulo: "Não consigo acessar o Portal do Aluno", categoria: "Tecnologia › Portal do Aluno", perguntasRelacionadas: ["não consigo acessar o portal", "esqueci minha senha", "portal fora do ar", "login do portal", "redefinir senha"], conteudo: "Se você não consegue acessar o Portal do Aluno:\n1. Confirme seu usuário (e-mail institucional).\n2. Use a opção \"Esqueci minha senha\" para redefinir.\n3. Caso persista, aguarde alguns minutos e tente novamente.", links: [{ rotulo: "Redefinir senha", url: "#" }], status: "PUBLISHED", atualizadoEm: "2026-10-02", atualizadoPor: "Ana Diretora" },
    { id: "KB-004", versao: 1, titulo: "Como funciona a rematrícula?", categoria: "Acadêmico › Matrícula", perguntasRelacionadas: ["rematrícula", "como me rematricular", "renovar matrícula", "matrícula do próximo semestre"], conteudo: "A rematrícula é feita no período divulgado pela coordenação:\n1. Acesse o Portal do Aluno.\n2. Entre em \"Matrícula\".\n3. Confira as disciplinas e confirme.\nFique atento ao prazo para evitar perda de vaga em turmas.", links: [], status: "PUBLISHED", atualizadoEm: "2026-09-28", atualizadoPor: "Ana Diretora" },
    { id: "KB-005", versao: 1, titulo: "Quando as notas são publicadas?", categoria: "Acadêmico › Notas", perguntasRelacionadas: ["minha nota não apareceu", "quando sai a nota", "nota não publicada", "lançamento de notas"], conteudo: "As notas são publicadas pelo professor conforme o calendário acadêmico. Caso uma nota não apareça após o prazo informado em sala, registre uma solicitação para a coordenação do seu curso.", links: [], status: "DRAFT", atualizadoEm: "2026-10-06", atualizadoPor: "Ana Diretora" },
    { id: "KB-006", versao: 3, titulo: "Política antiga de boleto (desatualizada)", categoria: "Financeiro › Boleto", perguntasRelacionadas: ["boleto no guichê", "boleto presencial"], conteudo: "Conteúdo arquivado: a emissão presencial de boletos foi descontinuada. Utilize o Portal do Aluno.", links: [], status: "ARCHIVED", atualizadoEm: "2026-08-15", atualizadoPor: "Ana Diretora" },
  ],
};

let cache = null;

/** Carrega os dados demonstrativos (uma vez), com fallback embutido. */
export async function loadDemoData() {
  if (cache) return cache;
  try {
    const res = await fetch(new URL("../data/demo-data.json", import.meta.url));
    if (!res.ok) throw new Error("HTTP " + res.status);
    cache = await res.json();
  } catch {
    cache = FALLBACK; // offline / file://
  }
  return cache;
}

/** Retorna os chamados demonstrativos (array). */
export async function getChamados() {
  const data = await loadDemoData();
  return data.chamados || [];
}

/** Conta chamados por situação. */
export async function contarPorSituacao() {
  const chamados = await getChamados();
  const contagem = { OPEN: 0, IN_PROGRESS: 0, WAITING_STUDENT: 0, RESOLVED: 0, CLOSED: 0 };
  chamados.forEach((c) => { if (contagem[c.situacao] != null) contagem[c.situacao] += 1; });
  return contagem;
}

/** Retorna todos os artigos (todos os estados). Uso administrativo. */
export async function getArtigos() {
  const data = await loadDemoData();
  return data.artigos || [];
}

/** Retorna a lista de categorias demonstrativas. */
export async function getCategorias() {
  const data = await loadDemoData();
  return data.categorias || [];
}

/** Retorna a lista de setores. */
export async function getSetores() {
  const data = await loadDemoData();
  return data.setores || [];
}

/** Retorna as regras de roteamento (categoria → destino). */
export async function getRegrasRoteamento() {
  const data = await loadDemoData();
  return data.regrasRoteamento || [];
}

/** Retorna os cursos. */
export async function getCursos() {
  const data = await loadDemoData();
  return data.cursos || [];
}

/** Retorna os usuários demonstrativos. */
export async function getUsuarios() {
  const data = await loadDemoData();
  return data.usuarios || [];
}

/** Retorna o setor de triagem (BR-E4). */
export async function getSetorTriagem() {
  const setores = await getSetores();
  const t = setores.find((s) => s.triagem);
  return t ? t.nome : "Secretaria Acadêmica";
}
