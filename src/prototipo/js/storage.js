/* ==========================================================================
   One — storage.js
   Camada fina sobre localStorage/sessionStorage com namespace e JSON.
   Toda a persistência demonstrativa do protótipo passa por aqui.
   ========================================================================== */

const NS = "one.proto.";

/**
 * Lê um valor persistido e faz o parse de JSON.
 * @param {string} key  chave (sem namespace)
 * @param {*} fallback  valor retornado se a chave não existir ou falhar
 * @returns {*}
 */
export function read(key, fallback = null) {
  try {
    const raw = localStorage.getItem(NS + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[one/storage] falha ao ler "${key}":`, err);
    return fallback;
  }
}

/**
 * Grava um valor como JSON.
 * @param {string} key
 * @param {*} value
 * @returns {boolean} true se gravou com sucesso
 */
export function write(key, value) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`[one/storage] falha ao gravar "${key}":`, err);
    return false;
  }
}

/**
 * Remove uma chave do armazenamento.
 * @param {string} key
 */
export function remove(key) {
  try {
    localStorage.removeItem(NS + key);
  } catch (err) {
    console.warn(`[one/storage] falha ao remover "${key}":`, err);
  }
}

/**
 * Remove todas as chaves do namespace do protótipo (reset dos dados demo).
 */
export function clearAll() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith(NS)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.warn("[one/storage] falha ao limpar namespace:", err);
  }
}

/** Indica se o localStorage está disponível (modo privado pode bloquear). */
export function isAvailable() {
  try {
    const probe = NS + "__probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
