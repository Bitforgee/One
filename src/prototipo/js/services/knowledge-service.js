/* ==========================================================================
   One — services/knowledge-service.js
   Consulta à base de conhecimento e correspondência de artigos para o
   assistente. Regras de negócio aplicadas:
   - BR-C2: somente artigos PUBLISHED alimentam a consulta pública e o assistente.
   - BR-B2/B4: o assistente responde SÓ de artigos publicados; sem correspondência,
     não mostra artigo algum.

   A correspondência é baseada em regras locais simples (palavras-chave e
   perguntas relacionadas) — NÃO há IA real. É uma pontuação determinística,
   adequada ao nível acadêmico e transparente para demonstração.
   ========================================================================== */

import { getArtigos as getArtigosSeed, getCategorias } from "../mock-data.js";
import { read, write } from "../storage.js";

const STORE_KEY = "artigos";
const SEED_FLAG = "artigos-seeded";

/** Carrega o store editável de artigos (semeia a partir do mock na 1ª vez). */
export async function carregarArtigos() {
  if (!read(SEED_FLAG, false)) {
    const seed = await getArtigosSeed();
    write(STORE_KEY, seed.map((a) => ({ ...a })));
    write(SEED_FLAG, true);
  }
  return read(STORE_KEY, []);
}

function salvarArtigos(arts) {
  write(STORE_KEY, arts);
  return arts;
}

/** Substitui getArtigos (seed) pela leitura do store editável. */
async function getArtigos() {
  return carregarArtigos();
}

/** Normaliza texto: minúsculas, sem acentos, sem pontuação. */
export function normalize(text) {
  return (text || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^\w\s]/g, " ")         // remove pontuação
    .replace(/\s+/g, " ")
    .trim();
}

/** Palavras muito comuns, ignoradas na correspondência. */
const STOPWORDS = new Set([
  "a", "o", "as", "os", "um", "uma", "de", "do", "da", "dos", "das", "e", "em",
  "no", "na", "nos", "nas", "para", "por", "com", "meu", "minha", "meus", "minhas",
  "como", "onde", "quando", "que", "qual", "quais", "preciso", "quero", "the",
]);

/** Divide um texto em termos relevantes (sem stopwords). */
function terms(text) {
  return normalize(text)
    .split(" ")
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/** Retorna apenas os artigos publicados (BR-C2). */
export async function getPublishedArticles() {
  const artigos = await getArtigos();
  return artigos.filter((a) => a.status === "PUBLISHED");
}

/**
 * Consulta pública da base: filtra por texto e categoria, somente publicados.
 * @param {object} [opts]
 * @param {string} [opts.query]     texto de busca
 * @param {string} [opts.categoria] nome exato da categoria ("" = todas)
 * @returns {Promise<object[]>}
 */
export async function searchPublished({ query = "", categoria = "" } = {}) {
  let artigos = await getPublishedArticles();

  if (categoria) {
    artigos = artigos.filter((a) => a.categoria === categoria);
  }

  const q = normalize(query);
  if (q) {
    artigos = artigos.filter((a) => {
      const haystack = normalize(
        [a.titulo, a.categoria, a.conteudo, (a.perguntasRelacionadas || []).join(" ")].join(" ")
      );
      // Todos os termos relevantes da busca devem aparecer.
      const ts = terms(query);
      if (ts.length === 0) return haystack.includes(q);
      return ts.every((t) => haystack.includes(t));
    });
  }

  return artigos;
}

/**
 * Encontra o melhor artigo publicado para uma pergunta do assistente.
 * Pontuação por sobreposição de termos entre a pergunta e
 * (título + perguntas relacionadas + conteúdo). BR-B2/B4.
 * @param {string} pergunta
 * @returns {Promise<{artigo:object, score:number}|null>}
 */
export async function matchArticle(pergunta) {
  const artigos = await getPublishedArticles();
  const perguntaTerms = terms(pergunta);
  if (perguntaTerms.length === 0) return null;

  let best = null;

  for (const a of artigos) {
    // Campos com peso: perguntas relacionadas valem mais que o conteúdo.
    const relacionadas = (a.perguntasRelacionadas || []).map(normalize);
    const alvoForte = normalize([a.titulo, relacionadas.join(" ")].join(" "));
    const alvoFraco = normalize(a.conteudo);

    let score = 0;
    for (const t of perguntaTerms) {
      if (alvoForte.includes(t)) score += 2;
      else if (alvoFraco.includes(t)) score += 1;
    }
    // Bônus se alguma pergunta relacionada estiver quase inteira na pergunta.
    for (const r of relacionadas) {
      const rt = r.split(" ").filter((x) => x.length > 2 && !STOPWORDS.has(x));
      if (rt.length && rt.every((x) => normalize(pergunta).includes(x))) score += 3;
    }

    if (!best || score > best.score) best = { artigo: a, score };
  }

  // Limiar mínimo para considerar "correspondência válida" (BR-B4).
  if (!best || best.score < 2) return null;
  return best;
}

/** Lista de categorias (para filtros). */
export async function listCategories() {
  return getCategorias();
}

/* --- CRUD de artigos (Fase 6 / BR-C3, BR-C5) ------------------------------ */

/** Localiza um artigo pelo id. */
export async function obterArtigo(id) {
  const arts = await carregarArtigos();
  return arts.find((a) => a.id === id) || null;
}

function hojeISO() { return new Date().toISOString().slice(0, 10); }

/** Cria um novo artigo (começa como DRAFT, versão 1). */
export async function criarArtigo({ titulo, categoria, conteudo, perguntasRelacionadas = [], links = [] }, autor) {
  const arts = await carregarArtigos();
  const seq = arts.reduce((m, a) => Math.max(m, parseInt((a.id || "KB-0").replace("KB-", ""), 10) || 0), 0) + 1;
  const art = {
    id: "KB-" + String(seq).padStart(3, "0"),
    versao: 1,
    titulo, categoria, conteudo,
    perguntasRelacionadas: perguntasRelacionadas.filter(Boolean),
    links,
    status: "DRAFT",
    atualizadoEm: hojeISO(),
    atualizadoPor: autor || "Administrador",
  };
  arts.unshift(art);
  salvarArtigos(arts);
  return art;
}

/** Edita um artigo. Se já estava PUBLISHED, incrementa a versão (BR-C5). */
export async function editarArtigo(id, campos, autor) {
  const arts = await carregarArtigos();
  const a = arts.find((x) => x.id === id);
  if (!a) throw new Error("Artigo não encontrado");
  if (a.status === "PUBLISHED") a.versao += 1; // BR-C5: nova versão
  Object.assign(a, campos);
  a.atualizadoEm = hojeISO();
  a.atualizadoPor = autor || "Administrador";
  salvarArtigos(arts);
  return a;
}

/** Altera o status do artigo (DRAFT/PUBLISHED/ARCHIVED) — BR-C2/C3. */
export async function definirStatusArtigo(id, status, autor) {
  if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) throw new Error("Status inválido");
  const arts = await carregarArtigos();
  const a = arts.find((x) => x.id === id);
  if (!a) throw new Error("Artigo não encontrado");
  a.status = status;
  a.atualizadoEm = hojeISO();
  a.atualizadoPor = autor || "Administrador";
  salvarArtigos(arts);
  return a;
}

/** Reseta o store de artigos (re-semeia na próxima carga). */
export function resetarArtigos() {
  write(SEED_FLAG, false);
  write(STORE_KEY, []);
}
