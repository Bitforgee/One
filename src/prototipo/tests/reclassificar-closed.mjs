/* Regressão focada no defeito D1 (BR-F2 — CLOSED é terminal).
   Reproduz o cenário auditado: em um chamado CLOSED, reclassificar() deve
   lançar erro e NÃO alterar a categoria nem acrescentar mensagens ao histórico,
   tal como as demais ações mutadoras (responder, adicionarNota, encaminhar...).
   Apenas Node stdlib — sem dependências. Não requer o servidor estático.
   Uso: node tests/reclassificar-closed.mjs */

// Shim mínimo de localStorage (o serviço persiste via js/storage.js).
const _store = new Map();
globalThis.localStorage = {
  getItem: (k) => (_store.has(k) ? _store.get(k) : null),
  setItem: (k, v) => { _store.set(k, String(v)); },
  removeItem: (k) => { _store.delete(k); },
  key: (i) => Array.from(_store.keys())[i] ?? null,
  get length() { return _store.size; },
};

const svc = await import("../js/services/ticket-service.js");

let fails = 0;
function assert(cond, msg) {
  if (cond) { console.log("PASS ", msg); }
  else { console.log("FAIL ", msg); fails += 1; }
}

svc.resetar();
const lista = await svc.listar();
const alvo = lista[0];

// Leva o chamado a CLOSED pelo caminho de cancelamento (F8).
await svc.cancelar(alvo.protocolo, alvo.aluno, "regressão D1");
const fechado = await svc.obter(alvo.protocolo);
assert(fechado.situacao === "CLOSED", `pré-condição: ${alvo.protocolo} está CLOSED`);

const categoriaAntes = fechado.categoria;
const msgsAntes = fechado.mensagens.length;

let lancou = false;
try {
  await svc.reclassificar(alvo.protocolo, "Carlos Lima", "Nova");
} catch {
  lancou = true;
}

const depois = await svc.obter(alvo.protocolo);
assert(lancou, "reclassificar() em chamado CLOSED lança erro (BR-F2)");
assert(depois.categoria === categoriaAntes, "categoria permanece inalterada após tentativa");
assert(depois.mensagens.length === msgsAntes, "nenhuma mensagem acrescentada ao histórico");

console.log(`RESUMO D1: ${fails === 0 ? "OK" : fails + " falha(s)"} — passaram=${4 - fails} falharam=${fails}`);
process.exit(fails === 0 ? 0 : 1);
