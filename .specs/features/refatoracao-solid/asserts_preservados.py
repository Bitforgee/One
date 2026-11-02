"""C2: nenhuma asserção que existia em <base> foi removida, alterada ou pulada.

Uso: python asserts_preservados.py <base> [<alvo>]      (alvo padrão: HEAD)
     python asserts_preservados.py --autoteste

Toda linha removida com Assert, expect( ou toBe/toHave em api.Tests/**/*.cs, web/src/**/*.test.tsx e
web/e2e/** precisa reaparecer idêntica (espaços normalizados) como linha adicionada em algum desses
arquivos; nenhuma linha adicionada neles pode trazer Skip =, .skip( nem .only(.
"""
import re
import subprocess
import sys
from collections import Counter

ASSERCAO = re.compile(r"Assert|expect\(|toBe|toHave")
PULO = re.compile(r"Skip\s*=|\.skip\(|\.only\(")


def alvo(caminho):
    return (
        (caminho.startswith("api.Tests/") and caminho.endswith(".cs"))
        or (caminho.startswith("web/src/") and caminho.endswith(".test.tsx"))
        or caminho.startswith("web/e2e/")
    )


def normalizar(linha):
    return " ".join(linha.split())


def conferir(diff):
    """Devolve a lista de problemas encontrados num diff unificado sem renomeações."""
    removidas, adicionadas, problemas = Counter(), Counter(), []
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
                problemas.append(f"pulo adicionado em {depois}: {linha[1:].strip()}")
    for texto, n in removidas.items():
        if adicionadas[texto] < n:
            problemas.append(f"asserção removida ou alterada ({n - adicionadas[texto]}x): {texto}")
    return problemas


def autoteste():
    def diff(arquivo, menos, mais):
        return f"--- a/{arquivo}\n+++ b/{arquivo}\n@@ -1 +1 @@\n" + "".join(f"-{l}\n" for l in menos) + "".join(f"+{l}\n" for l in mais)

    movida = "--- a/api.Tests/A.cs\n+++ /dev/null\n@@ -1 +0,0 @@\n-        Assert.Equal(1, x);\n" \
             "--- /dev/null\n+++ b/api.Tests/B.cs\n@@ -0,0 +1 @@\n+    Assert.Equal(1,  x);\n"
    assert conferir(movida) == [], "asserção movida de arquivo deve passar"
    assert conferir(diff("api.Tests/A.cs", ["using One.Api.Rotas;"], ["using One.Api.Chamados;"])) == []
    assert conferir(diff("api.Tests/A.cs", ["Assert.Equal(1, x);"], ["Assert.Equal(2, x);"])), "asserção alterada deve falhar"
    assert conferir(diff("api.Tests/A.cs", ["Assert.Equal(1, x);"], [])), "asserção removida deve falhar"
    assert conferir(diff("web/src/x/a.test.tsx", ["expect(a).toBe(1)"], [])), "expect removido deve falhar"
    assert conferir(diff("web/e2e/p.spec.ts", [], ["test.skip('x', () => {})"])), ".skip( adicionado deve falhar"
    assert conferir(diff("api.Tests/A.cs", [], ['[Fact(Skip = "x")]'])), "Skip = adicionado deve falhar"
    assert conferir(diff("web/src/a.test.tsx", [], ["it.only('x')"])), ".only( adicionado deve falhar"
    assert conferir(diff("api/X.cs", ["Assert.Equal(1, x);"], [])) == [], "fora dos testes não conta"
    dupla = diff("api.Tests/A.cs", ["Assert.True(a);", "Assert.True(a);"], ["Assert.True(a);"])
    assert conferir(dupla), "duas cópias removidas e uma adicionada deve falhar"
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
        ["git", "diff", "--no-renames", "--no-color", "-U0", base, ate, "--", "api.Tests", "web/src", "web/e2e"],
        capture_output=True, text=True, encoding="utf-8", check=True,
    ).stdout
    problemas = conferir(diff)
    for p in problemas:
        print(p)
    print(f"{len(problemas)} problema(s) entre {base} e {ate}")
    return 1 if problemas else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
