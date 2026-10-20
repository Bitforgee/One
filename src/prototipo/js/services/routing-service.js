/* ==========================================================================
   One — services/routing-service.js
   Classificação e roteamento de chamados (BR-E). Avaliado uma vez, na criação
   do chamado (BR-E3).
   - BR-E2: regra mapeia categoria → setor fixo OU "coordenação do curso".
   - BR-E3: categoria sem regra, categoria "Unclassified" ou curso sem
     coordenação configurada → setor de triagem.
   - BR-E4: existe exatamente um setor de triagem.
   ========================================================================== */

import { getRegrasRoteamento, getCursos, getSetorTriagem } from "../mock-data.js";

const DESTINO_COORDENACAO = "coordenacao-do-curso";

/**
 * Determina o setor de destino de um chamado.
 * @param {object} opts
 * @param {string} opts.categoria  categoria do chamado ("Unclassified" se não houver)
 * @param {string} [opts.curso]    curso do aluno (para regra de coordenação)
 * @returns {Promise<string>} nome do setor de destino
 */
export async function resolverSetor({ categoria, curso }) {
  const triagem = await getSetorTriagem();

  if (!categoria || categoria === "Unclassified" || categoria === "Não classificado") {
    return triagem; // BR-E3
  }

  const regras = await getRegrasRoteamento();
  const regra = regras.find((r) => r.categoria === categoria);
  if (!regra) return triagem; // sem regra → triagem (BR-E3)

  if (regra.destino === DESTINO_COORDENACAO) {
    // BR-E2(b): coordenação do curso do aluno.
    const cursos = await getCursos();
    const c = cursos.find((x) => x.nome === curso);
    if (c && c.coordenacao) return c.coordenacao;
    return triagem; // curso sem coordenação → triagem (BR-E3)
  }

  return regra.destino; // BR-E2(a): setor fixo
}
