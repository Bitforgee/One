/* ==========================================================================
   One — services/conversation-service.js
   Estado e persistência de uma conversa do assistente (demonstrativa).
   Regras aplicadas:
   - BR-B1: a conversa pertence a um aluno e começa com uma mensagem livre.
   - BR-B7: desfecho único — SELF_RESOLVED | ESCALATED | DECLINED | ABANDONED.
   - BR-B8: cada resposta mostrada guarda um snapshot do artigo (id, versão,
     título e texto), para que edições futuras não alterem o histórico.
   - BR-B9: uma conversa gera no máximo um chamado (criação na Fase 4).

   Persistência via localStorage (namespace do protótipo). Sem dados pessoais
   reais.
   ========================================================================== */

import { read, write } from "../storage.js";

const KEY = "conversa-atual";

/** Desfechos possíveis (BR-B7). */
export const DESFECHOS = {
  SELF_RESOLVED: "SELF_RESOLVED",
  ESCALATED: "ESCALATED",
  DECLINED: "DECLINED",
  ABANDONED: "ABANDONED",
};

/** Cria uma conversa vazia para um aluno. */
export function novaConversa(aluno) {
  const conversa = {
    id: "CONV-" + Date.now(),
    aluno: aluno ? aluno.name : "Aluno",
    curso: aluno ? aluno.course || null : null,
    iniciadaEm: new Date().toISOString(),
    mensagens: [],
    desfecho: null,
    ultimoArtigo: null, // snapshot do último artigo mostrado (BR-D4/B8)
  };
  write(KEY, conversa);
  return conversa;
}

/** Carrega a conversa atual ou cria uma nova. */
export function obterOuCriar(aluno) {
  const atual = read(KEY, null);
  if (atual && !atual.desfecho) return atual;
  return novaConversa(aluno);
}

/** Carrega a conversa atual (pode ser null). */
export function obterAtual() {
  return read(KEY, null);
}

/** Persiste a conversa. */
function salvar(conversa) {
  write(KEY, conversa);
  return conversa;
}

/** Adiciona uma mensagem simples (autor: "aluno" | "assistente" | "sistema"). */
export function adicionarMensagem(conversa, autor, texto, extra = {}) {
  conversa.mensagens.push({
    autor,
    texto,
    em: new Date().toISOString(),
    ...extra,
  });
  return salvar(conversa);
}

/**
 * Registra uma resposta do assistente baseada em um artigo, guardando o
 * SNAPSHOT do artigo (BR-B8).
 */
export function registrarResposta(conversa, artigo) {
  const snapshot = {
    id: artigo.id,
    versao: artigo.versao,
    titulo: artigo.titulo,
    categoria: artigo.categoria,
    texto: artigo.conteudo, // congelado neste momento
  };
  conversa.ultimoArtigo = snapshot;
  conversa.mensagens.push({
    autor: "assistente",
    texto: artigo.conteudo,
    em: new Date().toISOString(),
    artigo: snapshot,
  });
  return salvar(conversa);
}

/** Define o desfecho da conversa (BR-B5/B6/B7). Encerra-a. */
export function definirDesfecho(conversa, desfecho) {
  conversa.desfecho = desfecho;
  conversa.encerradaEm = new Date().toISOString();
  return salvar(conversa);
}

/** Reinicia a conversa (começa uma nova — BR-B9: nova dúvida, nova conversa). */
export function reiniciar(aluno) {
  return novaConversa(aluno);
}
