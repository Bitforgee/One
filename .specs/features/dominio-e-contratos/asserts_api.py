"""C2: nenhuma asserção de api.Tests que existia em <base> foi removida, alterada ou pulada, e nenhum commit desta
feature mistura api/ ou api.Tests/ com web/.

Uso: python asserts_api.py <base>
     python asserts_api.py --autoteste

Aplica a função conferir de .specs/features/refatoracao-solid/asserts_preservados.py ao
git diff --no-renames <base> HEAD -- api.Tests; depois confere os arquivos de cada commit de <base>..HEAD.
"""
import importlib.util
import pathlib
import subprocess
import sys

PRESERVADOS = pathlib.Path(__file__).resolve().parents[1] / "refatoracao-solid" / "asserts_preservados.py"


def carregar_conferir():
    spec = importlib.util.spec_from_file_location("asserts_preservados", PRESERVADOS)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo.conferir


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True, encoding="utf-8", check=True).stdout


def misturado(arquivos):
    """Um commit que toca api/ ou api.Tests/ e também web/."""
    api = any(a.startswith(("api/", "api.Tests/")) for a in arquivos)
    return api and any(a.startswith("web/") for a in arquivos)


def autoteste():
    assert misturado(["api/X.cs", "web/src/a.tsx"])
    assert misturado(["api.Tests/A.cs", "web/e2e/b.spec.ts"])
    assert not misturado(["api/X.cs", "api.Tests/A.cs", ".specs/x.md"])
    assert not misturado(["web/src/a.tsx", ".specs/features/interface-nova/checks.md"])
    assert not misturado(["webapp/x", "api/X.cs"]), "só a pasta web/ conta"
    conferir = carregar_conferir()
    removida = "--- a/api.Tests/A.cs\n+++ b/api.Tests/A.cs\n@@ -1 +0,0 @@\n-        Assert.Equal(1, x);\n"
    assert conferir(removida), "asserção removida deve falhar"
    print("autoteste ok")


def main(argv):
    if argv[1:] == ["--autoteste"]:
        autoteste()
        return 0
    if len(argv) != 2:
        print(__doc__)
        return 2
    base = argv[1]
    problemas = carregar_conferir()(git("diff", "--no-renames", "--no-color", "-U0", base, "HEAD", "--", "api.Tests"))
    commits = git("rev-list", f"{base}..HEAD").split()
    for c in commits:
        arquivos = git("show", "--name-only", "--format=", c).split()
        if misturado(arquivos):
            problemas.append(f"commit {c[:7]} toca api/ ou api.Tests/ e web/")
    for p in problemas:
        print(p)
    print(f"{len(problemas)} problema(s) entre {base} e HEAD ({len(commits)} commits)")
    return 1 if problemas else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
