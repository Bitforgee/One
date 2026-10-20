/* ==========================================================================
   One — test-harness.js
   Micro-framework de testes sem dependências (roda no navegador).
   Oferece describe/it/expect e um relator que escreve o resultado na página
   e no console. Suficiente para a Fase 1; pode crescer nas próximas fases.
   ========================================================================== */

const suites = [];
let current = null;

export function describe(name, fn) {
  current = { name, tests: [] };
  suites.push(current);
  fn();
  current = null;
}

export function it(name, fn) {
  if (!current) throw new Error("it() fora de describe()");
  current.tests.push({ name, fn });
}

export function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`esperado ${format(expected)}, obtido ${format(actual)}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`esperado ${format(expected)}, obtido ${format(actual)}`);
      }
    },
    toBeTruthy() {
      if (!actual) throw new Error(`esperado valor verdadeiro, obtido ${format(actual)}`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`esperado valor falso, obtido ${format(actual)}`);
    },
    toContain(sub) {
      if (!String(actual).includes(sub)) {
        throw new Error(`esperado conter "${sub}" em ${format(actual)}`);
      }
    },
  };
}

function format(v) {
  try { return JSON.stringify(v); } catch { return String(v); }
}

/** Executa todas as suítes e escreve o relatório no elemento informado. */
export async function run(mountEl) {
  let passed = 0;
  let failed = 0;
  const frag = document.createDocumentFragment();

  for (const suite of suites) {
    const header = document.createElement("h2");
    header.textContent = suite.name;
    header.style.cssText = "font:600 16px system-ui;margin:16px 0 8px";
    frag.append(header);

    for (const test of suite.tests) {
      const line = document.createElement("div");
      line.style.cssText = "font:14px system-ui;padding:4px 0;display:flex;gap:8px";
      try {
        await test.fn();
        passed += 1;
        line.innerHTML = `<span style="color:#1f9d57">✔</span>`;
        line.append(document.createTextNode(" " + test.name));
        console.log("PASS:", suite.name, "›", test.name);
      } catch (err) {
        failed += 1;
        line.innerHTML = `<span style="color:#d1434b">✘</span>`;
        const txt = document.createElement("span");
        txt.textContent = ` ${test.name} — ${err.message}`;
        txt.style.color = "#d1434b";
        line.append(txt);
        console.error("FAIL:", suite.name, "›", test.name, "—", err.message);
      }
      frag.append(line);
    }
  }

  const summary = document.createElement("div");
  const ok = failed === 0;
  summary.style.cssText =
    `font:600 15px system-ui;margin-top:20px;padding:12px;border-radius:8px;` +
    `background:${ok ? "#e7f6ee" : "#fbe9ea"};color:${ok ? "#1f6b43" : "#9c2a30"}`;
  summary.textContent = `${ok ? "TODOS OS TESTES PASSARAM" : "FALHAS DETECTADAS"} — ${passed} ok, ${failed} falhas`;
  frag.append(summary);

  mountEl.replaceChildren(frag);
  // Sinalizador legível por automação (browser-qa / Playwright futuramente).
  window.__ONE_TEST_RESULT__ = { passed, failed, ok };
  return { passed, failed, ok };
}
