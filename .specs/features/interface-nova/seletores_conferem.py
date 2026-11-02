"""C2 (AC 1, AC 2): toda asserção trocada desde <base> está em seletores.md, e nada mais está lá.

Uso: python seletores_conferem.py <base> [<alvo>]      (alvo padrão: HEAD)
     python seletores_conferem.py --autoteste

Linha de asserção = o critério do `conferir` de refatoracao-solid/asserts_preservados.py (Assert, expect(, toBe,
toHave), sobre web/src/**/*.test.ts, web/src/**/*.test.tsx e web/e2e/**. Uma linha removida que não reaparece
idêntica (espaços normalizados) é uma linha trocada; o multiconjunto das trocadas tem de ser igual ao da coluna
`Antes` de seletores.md, cada linha com `Depois` e `Afirmação` preenchidos. Nenhuma linha adicionada pode
trazer .skip( nem .only(.
"""
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

ASSERCAO = re.compile(r"Assert|expect\(|toBe|toHave")
PULO = re.compile(r"\.skip\(|\.only\(")
TABELA = Path(__file__).with_name("seletores.md")


def alvo(caminho):
    return (caminho.startswith("web/src/") and caminho.endswith((".test.ts", ".test.tsx"))) or caminho.startswith("web/e2e/")


def normalizar(linha):
    return " ".join(linha.split())


def trocadas(diff):
    """Linhas de asserção removidas que não voltaram, e os pulos adicionados, num diff unificado."""
    removidas, adicionadas, pulos = Counter(), Counter(), []
    antes = depois = None
    for linha in diff.splitlines():
        if linha.startswith("--- "):
            antes = linha[6:] if linha.startswith("--- a/") else None
        elif linha.startswith("+++ "):
            depois = linha[6:] if linha.startswith("+++ b/") else None
        elif linha.startswith("-") and antes and alvo(antes) and ASSERCAO.search(linha):
            removidas[normalizar(linha[1:])] += 1
        elif linha.startswith("+") and depois and alvo(depois):
            adicionadas[normalizar(linha[1:])] += 1
            if PULO.search(linha):
                pulos.append(f"pulo adicionado em {depois}: {linha[1:].strip()}")
    return removidas - adicionadas, pulos


def celulas(linha):
    partes = re.split(r"(?<!\\)\|", linha.strip())[1:-1]
    return [p.strip().strip("`").strip().replace("\\|", "|") for p in partes]


def tabela(markdown):
    """Linhas da tabela | Arquivo | Antes | Depois | Afirmação |, sem cabeçalho nem separador."""
    linhas = []
    for linha in markdown.splitlines():
        c = celulas(linha) if linha.lstrip().startswith("|") else []
        if len(c) == 4 and c[1] != "Antes" and not set(c[1]) <= set("-: "):
            linhas.append(c)
    return linhas


def conferir(diff, markdown):
    faltam_na_tabela, problemas = trocadas(diff)
    linhas = tabela(markdown)
    listadas = Counter(normalizar(c[1]) for c in linhas)
    for texto, n in (faltam_na_tabela - listadas).items():
        problemas.append(f"asserção trocada sem linha em seletores.md ({n}x): {texto}")
    for texto, n in (listadas - faltam_na_tabela).items():
        problemas.append(f"linha de seletores.md que não é asserção trocada ({n}x): {texto}")
    problemas += [f"linha sem Depois ou Afirmação: {c[1]}" for c in linhas if not c[2] or not c[3]]
    return problemas


def autoteste():
    def diff(arquivo, menos, mais):
        return f"--- a/{arquivo}\n+++ b/{arquivo}\n@@ -1 +1 @@\n" + "".join(f"-{l}\n" for l in menos) + "".join(f"+{l}\n" for l in mais)

    def md(*linhas):
        return "| Arquivo | Antes | Depois | Afirmação |\n| --- | --- | --- | --- |\n" + "".join(f"| `a` | `{a}` | `{d}` | {f} |\n" for a, d, f in linhas)

    trocada = diff("web/src/x/a.test.tsx", ["expect(b).toHaveClass('btn-primary')"], ["expect(b).toHaveClass('bg-primary')"])
    certa = md(("expect(b).toHaveClass('btn-primary')", "expect(b).toHaveClass('bg-primary')", "variante principal"))
    assert conferir(trocada, certa) == [], "linha trocada e listada deve passar"
    assert conferir(trocada, md()), "linha faltando na tabela deve falhar"
    sobra = md(("expect(b).toHaveClass('btn-primary')", "x", "y"), ("expect(c).toBe(1)", "x", "y"))
    assert conferir(trocada, sobra), "linha sobrando na tabela deve falhar"
    assert conferir(trocada, md(("expect(b).toHaveClass('btn-primary')", "", "y"))), "Depois vazio deve falhar"
    assert conferir(diff("web/e2e/p.spec.ts", [], ["test.only('x', () => {})"]), md()), ".only( adicionado deve falhar"
    assert conferir(diff("web/src/a.test.ts", [], ["it.skip('x')"]), md()), ".skip( adicionado deve falhar"
    movida = diff("web/src/a.test.ts", ["expect(a).toBe(1)"], ["  expect(a).toBe(1)"])
    assert conferir(movida, md()) == [], "linha que volta idêntica não é trocada"
    assert conferir(diff("web/src/A.tsx", ["expect(a).toBe(1)"], []), md()) == [], "fora dos testes não conta"
    barra = md(("expect(a || b).toBe(1)".replace("|", "\\|"), "x", "y"))
    assert conferir(diff("web/src/a.test.ts", ["expect(a || b).toBe(1)"], []), barra) == [], "| escapado na tabela"
    print("autoteste ok")


def main(argv):
    if argv[1:] == ["--autoteste"]:
        autoteste()
        return 0
    if len(argv) not in (2, 3):
        print(__doc__)
        return 2
    base, ate = argv[1], argv[2] if len(argv) == 3 else "HEAD"
    diff = subprocess.run(
        ["git", "diff", "--no-renames", "--no-color", "-U0", base, ate, "--", "web/src", "web/e2e"],
        capture_output=True, text=True, encoding="utf-8", check=True,
    ).stdout
    problemas = conferir(diff, TABELA.read_text(encoding="utf-8"))
    for p in problemas:
        print(p)
    print(f"{len(problemas)} problema(s) entre {base} e {ate}")
    return 1 if problemas else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
