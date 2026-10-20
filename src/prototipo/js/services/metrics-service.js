/* ==========================================================================
   One — services/metrics-service.js
   Indicadores (seção I das regras). Calculados sobre o store de chamados
   demonstrativo. Definições simplificadas e transparentes, coerentes com a
   documentação. Todos os números são demonstrativos.
   ========================================================================== */

import { listar } from "./ticket-service.js";

/** Agrupa a contagem de chamados por situação. */
export async function contagemPorSituacao() {
  const ts = await listar();
  const c = { OPEN: 0, IN_PROGRESS: 0, WAITING_STUDENT: 0, RESOLVED: 0, CLOSED: 0 };
  ts.forEach((t) => { if (c[t.situacao] != null) c[t.situacao] += 1; });
  return c;
}

/** Conjunto de indicadores resumidos para o painel. */
export async function resumo() {
  const ts = await listar();
  const porSituacao = await contagemPorSituacao();

  const total = ts.length;
  const abertos = ts.filter((t) => t.situacao !== "CLOSED").length;
  const resolvidos = ts.filter((t) => t.situacao === "RESOLVED" || t.situacao === "CLOSED").length;
  const reaberturas = ts.filter((t) => (t.reaberturas || 0) >= 1).length;
  const semEncaminhamento = ts.filter((t) => (t.encaminhamentos || 0) === 0).length;

  return {
    total,
    abertos,
    resolvidos,
    porSituacao,
    taxaRoteamentoCorreto: total ? Math.round((semEncaminhamento / total) * 100) : 0,
    taxaReabertura: total ? Math.round((reaberturas / total) * 100) : 0,
  };
}

/** Ranking de categorias por volume (top N). */
export async function topCategorias(n = 5) {
  const ts = await listar();
  const mapa = new Map();
  ts.forEach((t) => { mapa.set(t.categoria, (mapa.get(t.categoria) || 0) + 1); });
  return Array.from(mapa.entries())
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
}

/** Distribuição de chamados por setor. */
export async function porSetor() {
  const ts = await listar();
  const mapa = new Map();
  ts.forEach((t) => { mapa.set(t.setor, (mapa.get(t.setor) || 0) + 1); });
  return Array.from(mapa.entries()).map(([setor, total]) => ({ setor, total }));
}
