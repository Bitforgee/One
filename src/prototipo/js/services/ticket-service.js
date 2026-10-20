/* ==========================================================================
   One — services/ticket-service.js
   Ciclo de vida e atendimento de chamados (BR-D, BR-E, BR-F, BR-G, BR-H).
   Persistência demonstrativa em localStorage. Os chamados demonstrativos
   iniciais (de mock-data) são semeados uma vez no store editável.

   Regras aplicadas:
   - BR-D5: protocolo ONE-<n> sequencial, único, nunca reutilizado.
   - BR-E1: todo chamado está em exatamente um setor.
   - BR-F: transições válidas F1–F9; BR-F1 rejeita transições fora da tabela;
     BR-F2 CLOSED é terminal.
   - BR-G: respostas públicas e notas internas; mensagens imutáveis (BR-G3);
     encaminhar exige setor diferente + motivo (BR-G4).
   - BR-H: todo evento registrado com autor e timestamp (append-only).
   ========================================================================== */

import { read, write } from "../storage.js";
import { getChamados as getChamadosSeed } from "../mock-data.js";
import { resolverSetor } from "./routing-service.js";

const STORE_KEY = "tickets";
const SEQ_KEY = "ticket-seq";
const SEED_FLAG = "tickets-seeded";

/** Estados e transições permitidas (seção F das regras). */
export const ESTADOS = ["OPEN", "IN_PROGRESS", "WAITING_STUDENT", "RESOLVED", "CLOSED"];

/* Mapa de transições permitidas: de → [para...]. Espelha a tabela F1–F9. */
const TRANSICOES = {
  OPEN: ["IN_PROGRESS", "CLOSED"],                 // F2 (assumir/responder), F8 (cancelar), F9 (encaminhar→OPEN em novo setor)
  IN_PROGRESS: ["WAITING_STUDENT", "RESOLVED", "CLOSED", "OPEN"], // F3, F5, F8, F9
  WAITING_STUDENT: ["IN_PROGRESS", "CLOSED", "OPEN"],            // F4, F8, F9
  RESOLVED: ["IN_PROGRESS", "CLOSED"],             // F6 (rejeição), F7 (confirmar/expirar)
  CLOSED: [],                                      // BR-F2 terminal
};

/** Carrega o store de chamados, semeando os demonstrativos na 1ª vez. */
export async function carregar() {
  if (!read(SEED_FLAG, false)) {
    const seed = await getChamadosSeed();
    // Converte o seed (prévia) em chamados completos com histórico mínimo.
    const tickets = seed.map((c) => ({
      protocolo: c.protocolo,
      assunto: c.assunto,
      aluno: c.aluno,
      curso: c.curso || "Análise e Desenvolvimento de Sistemas",
      categoria: c.categoria,
      setor: c.setor,
      situacao: c.situacao,
      responsavel: c.situacao === "OPEN" ? null : "Carlos Lima",
      abertura: c.abertura,
      atualizacao: c.atualizacao,
      origem: "Semente demonstrativa",
      descricao: c.assunto,
      transcricao: [],
      artigos: [],
      encaminhamentos: 0,
      reaberturas: 0,
      mensagens: [
        { tipo: "evento", texto: "Chamado criado.", autor: "Sistema", em: c.abertura + "T09:00:00" },
      ],
    }));
    write(STORE_KEY, tickets);
    // Sequência inicial = maior número de protocolo semeado.
    const maior = seed.reduce((m, c) => Math.max(m, parseInt(c.protocolo.replace("ONE-", ""), 10) || 0), 1053);
    write(SEQ_KEY, maior);
    write(SEED_FLAG, true);
  }
  return read(STORE_KEY, []);
}

/** Persiste o store. */
function salvar(tickets) {
  write(STORE_KEY, tickets);
  return tickets;
}

/** Gera o próximo protocolo ONE-<n> (BR-D5). */
function proximoProtocolo() {
  const n = read(SEQ_KEY, 1053) + 1;
  write(SEQ_KEY, n);
  return "ONE-" + n;
}

/** Timestamp ISO atual. */
function agora() { return new Date().toISOString(); }
function hoje() { return agora().slice(0, 10); }

/** Localiza um chamado pelo protocolo. */
export async function obter(protocolo) {
  const tickets = await carregar();
  return tickets.find((t) => t.protocolo === protocolo) || null;
}

/** Lista todos os chamados (cópia). */
export async function listar() {
  return (await carregar()).slice();
}

/** Lista os chamados de um aluno (BR-A4). */
export async function listarDoAluno(nomeAluno) {
  return (await carregar()).filter((t) => t.aluno === nomeAluno);
}

/** Lista os chamados atualmente em um setor (BR-A5). */
export async function listarDoSetor(setor) {
  return (await carregar()).filter((t) => t.setor === setor);
}

/**
 * Cria um chamado a partir de uma conversa do assistente (BR-D1–D6, BR-E).
 * @param {object} opts
 * @param {object} opts.aluno        { name, course }
 * @param {string} opts.perguntaInicial  primeira mensagem (vira título — BR-D3)
 * @param {object[]} [opts.transcricao] transcrição da conversa (BR-D2)
 * @param {object} [opts.artigoSnapshot] artigo mostrado (define categoria — BR-D4)
 * @param {string} [opts.descricao]  descrição complementar opcional (BR-D1)
 * @returns {Promise<object>} o chamado criado
 */
export async function criarDeConversa({ aluno, perguntaInicial, transcricao = [], artigoSnapshot = null, descricao = "" }) {
  const tickets = await carregar();

  // BR-D4: categoria = categoria do último artigo mostrado; senão "Não classificado".
  const categoria = artigoSnapshot && artigoSnapshot.categoria ? artigoSnapshot.categoria : "Não classificado";
  const curso = aluno.course || null;

  // BR-E: roteamento avaliado uma vez.
  const setor = await resolverSetor({ categoria, curso });

  // BR-D3: título = primeira mensagem truncada.
  const titulo = truncar(perguntaInicial || "Solicitação", 80);

  const protocolo = proximoProtocolo();
  const ticket = {
    protocolo,
    assunto: titulo,
    aluno: aluno.name,
    curso: curso || "—",
    categoria,
    categoriaOriginal: categoria, // BR-E5: guarda a original para métricas
    setor,
    situacao: "OPEN",             // F1
    responsavel: null,            // F1: sem responsável
    abertura: hoje(),
    atualizacao: hoje(),
    origem: "Assistente One",
    descricao: descricao || "",
    transcricao,                  // BR-D2: conversa anexada (somente leitura)
    artigos: artigoSnapshot ? [artigoSnapshot] : [],
    encaminhamentos: 0,
    reaberturas: 0,
    mensagens: [
      { tipo: "evento", texto: `Chamado criado a partir do assistente e roteado para "${setor}".`, autor: "Sistema", em: agora() },
    ],
  };

  tickets.unshift(ticket);
  salvar(tickets);
  return ticket;
}

/** Trunca texto preservando palavras. */
function truncar(txt, max) {
  const s = (txt || "").trim();
  if (s.length <= max) return s;
  return s.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

/** Verifica se uma transição é permitida (BR-F1). */
export function transicaoPermitida(de, para) {
  if (!ESTADOS.includes(para)) return false;
  return (TRANSICOES[de] || []).includes(para);
}

/** Aplica uma transição validada e registra no histórico (BR-F1/H). */
function aplicarTransicao(ticket, para, { autor, nota }) {
  if (!transicaoPermitida(ticket.situacao, para)) {
    throw new Error(`Transição inválida: ${ticket.situacao} → ${para}`);
  }
  const de = ticket.situacao;
  ticket.situacao = para;
  ticket.atualizacao = hoje();
  ticket.mensagens.push({
    tipo: "evento",
    texto: nota || `Situação alterada de ${de} para ${para}.`,
    autor,
    em: agora(),
  });
}

/* --- Ações do atendente (BR-F / BR-G) ------------------------------------- */

/** Atendente assume o chamado (F2). */
export async function assumir(protocolo, atendente) {
  const tickets = await carregar();
  const t = tickets.find((x) => x.protocolo === protocolo);
  if (!t) throw new Error("Chamado não encontrado");
  if (t.situacao === "OPEN") {
    aplicarTransicao(t, "IN_PROGRESS", { autor: atendente, nota: `Chamado assumido por ${atendente}.` });
  } else {
    // BR-F3: troca de responsável registrada.
    t.mensagens.push({ tipo: "evento", texto: `Atendimento assumido por ${atendente}.`, autor: atendente, em: agora() });
  }
  t.responsavel = atendente;
  t.atualizacao = hoje();
  salvar(tickets);
  return t;
}

/** Resposta pública (visível ao aluno). Pode marcar "aguardando aluno" (F3). */
export async function responder(protocolo, autor, texto, { aguardaAluno = false } = {}) {
  const tickets = await carregar();
  const t = tickets.find((x) => x.protocolo === protocolo);
  if (!t) throw new Error("Chamado não encontrado");
  if (t.situacao === "CLOSED") throw new Error("Chamado fechado não aceita mensagens (BR-F2)");

  // F2: primeira resposta de um chamado OPEN move para IN_PROGRESS.
  if (t.situacao === "OPEN") {
    t.responsavel = t.responsavel || autor;
    aplicarTransicao(t, "IN_PROGRESS", { autor, nota: `Chamado assumido por ${autor}.` });
  }

  t.mensagens.push({ tipo: "publica", texto, autor, em: agora() });
  t.atualizacao = hoje();

  if (aguardaAluno && t.situacao === "IN_PROGRESS") {
    aplicarTransicao(t, "WAITING_STUDENT", { autor, nota: "Aguardando resposta do aluno." });
  }
  salvar(tickets);
  return t;
}

/** Nota interna (nunca visível ao aluno — BR-G2). */
export async function adicionarNota(protocolo, autor, texto) {
  const tickets = await carregar();
  const t = tickets.find((x) => x.protocolo === protocolo);
  if (!t) throw new Error("Chamado não encontrado");
  if (t.situacao === "CLOSED") throw new Error("Chamado fechado não aceita mensagens (BR-F2)");
  t.mensagens.push({ tipo: "interna", texto, autor, em: agora() });
  t.atualizacao = hoje();
  salvar(tickets);
  return t;
}

/** Resposta do aluno. WAITING_STUDENT volta a IN_PROGRESS (F4). */
export async function responderAluno(protocolo, aluno, texto) {
  const tickets = await carregar();
  const t = tickets.find((x) => x.protocolo === protocolo);
  if (!t) throw new Error("Chamado não encontrado");
  if (t.situacao === "CLOSED") throw new Error("Chamado fechado não aceita mensagens (BR-F2)");
  t.mensagens.push({ tipo: "publica", texto, autor: aluno, em: agora() });
  t.atualizacao = hoje();
  if (t.situacao === "WAITING_STUDENT") {
    aplicarTransicao(t, "IN_PROGRESS", { autor: aluno, nota: "Aluno respondeu." });
  }
  salvar(tickets);
  return t;
}

/** Encaminha para outro setor (BR-G4 / F9): exige destino diferente + motivo. */
export async function encaminhar(protocolo, autor, setorDestino, motivo) {
  const tickets = await carregar();
  const t = tickets.find((x) => x.protocolo === protocolo);
  if (!t) throw new Error("Chamado não encontrado");
  if (t.situacao === "CLOSED") throw new Error("Chamado fechado não pode ser encaminhado (BR-F2)");
  if (!motivo || !motivo.trim()) throw new Error("Encaminhamento exige um motivo (BR-G4)");
  if (!setorDestino || setorDestino === t.setor) throw new Error("O setor de destino deve ser diferente do atual (BR-G4)");

  // Motivo guardado como nota interna.
  t.mensagens.push({ tipo: "interna", texto: `Encaminhamento: ${motivo}`, autor, em: agora() });
  const origem = t.setor;
  t.setor = setorDestino;
  t.responsavel = null;        // assignee limpo
  t.encaminhamentos += 1;
  // Volta a OPEN no novo setor (F9).
  t.situacao = "OPEN";
  t.atualizacao = hoje();
  t.mensagens.push({ tipo: "evento", texto: `Encaminhado de "${origem}" para "${setorDestino}".`, autor, em: agora() });
  salvar(tickets);
  return t;
}

/** Resolve o chamado (F5): exige texto de resolução visível ao aluno. */
export async function resolver(protocolo, autor, textoResolucao) {
  const tickets = await carregar();
  const t = tickets.find((x) => x.protocolo === protocolo);
  if (!t) throw new Error("Chamado não encontrado");
  if (!textoResolucao || !textoResolucao.trim()) throw new Error("A resolução exige um texto (F5)");
  if (t.situacao === "OPEN") {
    t.responsavel = t.responsavel || autor;
    aplicarTransicao(t, "IN_PROGRESS", { autor, nota: `Chamado assumido por ${autor}.` });
  }
  t.mensagens.push({ tipo: "publica", texto: textoResolucao, autor, em: agora() });
  aplicarTransicao(t, "RESOLVED", { autor, nota: "Chamado marcado como resolvido." });
  salvar(tickets);
  return t;
}

/* --- Ações do aluno sobre a resolução (F6/F7/F8) -------------------------- */

/** Aluno confirma a resolução → CLOSED (F7, motivo CONFIRMED). */
export async function confirmarResolucao(protocolo, aluno) {
  const tickets = await carregar();
  const t = tickets.find((x) => x.protocolo === protocolo);
  if (!t) throw new Error("Chamado não encontrado");
  if (t.situacao !== "RESOLVED") throw new Error("Só é possível confirmar um chamado resolvido (F7)");
  t.motivoFechamento = "CONFIRMED";
  aplicarTransicao(t, "CLOSED", { autor: aluno, nota: "Resolução confirmada pelo aluno." });
  salvar(tickets);
  return t;
}

/** Aluno rejeita a resolução → IN_PROGRESS (F6): exige motivo; reabertura +1. */
export async function rejeitarResolucao(protocolo, aluno, motivo) {
  const tickets = await carregar();
  const t = tickets.find((x) => x.protocolo === protocolo);
  if (!t) throw new Error("Chamado não encontrado");
  if (t.situacao !== "RESOLVED") throw new Error("Só é possível rejeitar um chamado resolvido (F6)");
  if (!motivo || !motivo.trim()) throw new Error("A reabertura exige um motivo (F6)");
  t.reaberturas += 1;
  t.mensagens.push({ tipo: "publica", texto: `Reabertura: ${motivo}`, autor: aluno, em: agora() });
  aplicarTransicao(t, "IN_PROGRESS", { autor: aluno, nota: "Aluno rejeitou a resolução; chamado reaberto." });
  salvar(tickets);
  return t;
}

/** Aluno cancela o chamado (F8): de OPEN/IN_PROGRESS/WAITING_STUDENT → CLOSED. */
export async function cancelar(protocolo, aluno, motivo = "") {
  const tickets = await carregar();
  const t = tickets.find((x) => x.protocolo === protocolo);
  if (!t) throw new Error("Chamado não encontrado");
  if (!["OPEN", "IN_PROGRESS", "WAITING_STUDENT"].includes(t.situacao)) {
    throw new Error("Este chamado não pode ser cancelado no estado atual (F8)");
  }
  t.motivoFechamento = "CANCELED";
  aplicarTransicao(t, "CLOSED", { autor: aluno, nota: motivo ? `Cancelado pelo aluno: ${motivo}` : "Cancelado pelo aluno." });
  salvar(tickets);
  return t;
}

/** Reclassifica a categoria sem mover o chamado (BR-E5). */
export async function reclassificar(protocolo, autor, novaCategoria) {
  const tickets = await carregar();
  const t = tickets.find((x) => x.protocolo === protocolo);
  if (!t) throw new Error("Chamado não encontrado");
  if (t.situacao === "CLOSED") throw new Error("Chamado fechado não aceita alterações (BR-F2)");
  const antiga = t.categoria;
  t.categoria = novaCategoria;
  t.atualizacao = hoje();
  t.mensagens.push({ tipo: "evento", texto: `Categoria alterada de "${antiga}" para "${novaCategoria}" (sem mover de setor).`, autor, em: agora() });
  salvar(tickets);
  return t;
}

/** Mensagens visíveis a um perfil: aluno não vê notas internas (BR-G2/H2). */
export function mensagensVisiveis(ticket, perfil) {
  return ticket.mensagens.filter((m) => !(perfil === "aluno" && m.tipo === "interna"));
}

/** Reseta o store demonstrativo (re-semeia na próxima carga). */
export function resetar() {
  write(SEED_FLAG, false);
  write(STORE_KEY, []);
  write(SEQ_KEY, 1053);
}
