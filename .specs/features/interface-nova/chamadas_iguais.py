"""C4 (AC 3): cada teste da base faz as mesmas chamadas à API em <base> e em HEAD.

Uso: python chamadas_iguais.py <base> [<alvo>]      (alvo padrão: HEAD)
     python chamadas_iguais.py --autoteste

Roda a suíte Vitest de <base> e a do alvo, cada uma num `git worktree` próprio (com o web/node_modules desta
cópia ligado por junction), acrescentando ao src/test/setup.ts de cada uma um afterEach que grava as chamadas do
fetch simulado de cada teste. Para cada teste de <base> (arquivo e nome completo): o multiconjunto de (método,
URL, corpo) das chamadas que não são GET é igual nos dois, e o conjunto de URLs GET distintas também. Corpo JSON
comparado como valor; FormData como a lista de campos, com cada arquivo por nome, tipo e tamanho.
"""
import json
import os
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]

# Acrescentado ao setup.ts da cópia: roda antes do afterEach que desfaz o stub do fetch (os hooks after rodam em pilha).
GRAVADOR = r"""
import { appendFileSync as __gravar } from 'node:fs'
import { setTimeout as __esperar } from 'node:timers/promises'
import { threadId as __fio } from 'node:worker_threads'
import { afterEach as __depois, expect as __expect } from 'vitest'
__depois(async () => {
  await __esperar(50) // deixa sair a chamada que o efeito já ia fazer; o relógio do node:timers não é o falso do teste
  const chamadas = ((globalThis.fetch as any)?.mock?.calls ?? []).map(([url, init]: [unknown, RequestInit | undefined]) => {
    const b = init?.body
    const corpo = b instanceof FormData
      ? [...b.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : { nome: v.name, tipo: v.type, tamanho: v.size }])
      : b == null ? null : String(b)
    return { metodo: init?.method ?? 'GET', url: String(url), corpo }
  })
  const { testPath, currentTestName } = __expect.getState()
  __gravar(`${process.env.CHAMADAS_SAIDA}.${process.pid}.${__fio}`, JSON.stringify({ arquivo: testPath, teste: currentTestName, chamadas }) + '\n')
})
"""


def canonico(corpo):
    if isinstance(corpo, str):
        try:
            return json.dumps(json.loads(corpo), sort_keys=True, ensure_ascii=False)
        except ValueError:
            return corpo
    return json.dumps(corpo, sort_keys=True, ensure_ascii=False)


def resumo(chamadas):
    gravacoes = Counter((c["metodo"], c["url"], canonico(c["corpo"])) for c in chamadas if c["metodo"] != "GET")
    return gravacoes, {c["url"] for c in chamadas if c["metodo"] == "GET"}


def conferir(base, alvo):
    """base e alvo: {(arquivo, teste): [chamadas]}; devolve as diferenças de cada teste da base."""
    problemas = []
    for chave, chamadas in sorted(base.items()):
        if chave not in alvo:
            problemas.append(f"teste da base não rodou no alvo: {chave}")
            continue
        (g1, l1), (g2, l2) = resumo(chamadas), resumo(alvo[chave])
        if g1 != g2:
            problemas.append(f"{chave}: gravações diferentes: só na base {dict(g1 - g2)}, só no alvo {dict(g2 - g1)}")
        if l1 != l2:
            problemas.append(f"{chave}: GETs diferentes: só na base {sorted(l1 - l2)}, só no alvo {sorted(l2 - l1)}")
    return problemas


def autoteste():
    def c(metodo, url, corpo=None):
        return {"metodo": metodo, "url": url, "corpo": corpo}

    k = ("src/a.test.tsx", "a > b")
    base = {k: [c("GET", "/api/x"), c("POST", "/api/y", '{"a":1,"b":2}')]}
    assert conferir(base, {k: [c("GET", "/api/x"), c("GET", "/api/x"), c("POST", "/api/y", '{"b":2,"a":1}')]}) == [], "GET repetido e ordem das chaves não contam"
    assert conferir(base, {k: [c("GET", "/api/x")]}), "POST a menos deve falhar"
    assert conferir(base, {k: [c("GET", "/api/x"), c("POST", "/api/y", '{"a":1,"b":3}')]}), "corpo diferente deve falhar"
    assert conferir(base, {k: [c("GET", "/api/x"), c("GET", "/api/z"), c("POST", "/api/y", '{"a":1,"b":2}')]}), "GET novo deve falhar"
    assert conferir(base, {k: [c("POST", "/api/y", '{"a":1,"b":2}'), c("POST", "/api/y", '{"a":1,"b":2}'), c("GET", "/api/x")]}), "POST a mais deve falhar"
    assert conferir(base, {}), "teste sumido deve falhar"
    arquivo = lambda nome: {k: [c("POST", "/api/m", [["anexos", {"nome": nome, "tipo": "application/pdf", "tamanho": 8}]])]}
    assert conferir(arquivo("a.pdf"), arquivo("a.pdf")) == []
    assert conferir(arquivo("a.pdf"), arquivo("b.pdf")), "arquivo com outro nome deve falhar"
    print("autoteste ok")


def rodar(rev, pasta):
    """Suíte Vitest de rev numa worktree em pasta; devolve {(arquivo, teste): [chamadas]}."""
    subprocess.run(["git", "worktree", "add", "--detach", str(pasta), rev], cwd=RAIZ, check=True, capture_output=True)
    modulos = pasta / "web" / "node_modules"
    try:
        import _winapi
        _winapi.CreateJunction(str(RAIZ / "web" / "node_modules"), str(modulos))
    except ImportError:
        modulos.symlink_to(RAIZ / "web" / "node_modules", target_is_directory=True)
    try:
        setup = pasta / "web" / "src" / "test" / "setup.ts"
        setup.write_text(setup.read_text(encoding="utf-8") + GRAVADOR, encoding="utf-8")
        saida = pasta / "chamadas"
        env = {**os.environ, "CHAMADAS_SAIDA": str(saida)}
        r = subprocess.run("npx vitest run", cwd=pasta / "web", env=env, shell=True, capture_output=True, text=True, encoding="utf-8")
        if r.returncode:
            sys.stdout.buffer.write((r.stdout[-3000:] + r.stderr[-3000:]).encode('utf-8'))
            raise SystemExit(f"a suíte de {rev} falhou")
        testes = {}
        for arquivo in pasta.glob("chamadas.*"):
            for linha in arquivo.read_text(encoding="utf-8").splitlines():
                g = json.loads(linha)
                caminho = g["arquivo"].replace("\\", "/")
                testes[(caminho[caminho.rindex("/src/") + 1:], g["teste"])] = g["chamadas"]
        return testes
    finally:
        os.rmdir(modulos) if modulos.is_junction() else modulos.unlink(missing_ok=True)  # só o link, nunca o alvo
        subprocess.run(["git", "worktree", "remove", "--force", str(pasta)], cwd=RAIZ, check=True, capture_output=True)


def main(argv):
    if argv[1:] == ["--autoteste"]:
        autoteste()
        return 0
    if len(argv) not in (2, 3):
        print(__doc__)
        return 2
    base, ate = argv[1], argv[2] if len(argv) == 3 else "HEAD"
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp).resolve()  # sem o nome curto 8.3 do Windows, que o Vite não casa com o caminho real
        antes, depois = rodar(base, tmp / "base"), rodar(ate, tmp / "alvo")
    problemas = conferir(antes, depois)
    for p in problemas:
        print(p)
    gravacoes = sum(len(resumo(c)[0]) for c in antes.values())
    print(f"{len(antes)} teste(s) da base, {gravacoes} gravação(ões) distintas; {len(problemas)} problema(s) em {ate}")
    return 1 if problemas or not antes else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
