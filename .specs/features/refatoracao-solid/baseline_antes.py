"""C7: baseline.md existe, entrou num commit anterior ao primeiro que mexe em api/ ou web/src/,
e traz a contagem de CA1502 por arquivo e o top 10 do crapper com cobertura.

Uso: python baseline_antes.py <base>
"""
import re
import subprocess
import sys

BASELINE = ".specs/features/refatoracao-solid/baseline.md"


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True, encoding="utf-8", check=True).stdout.strip()


def secao(texto, titulo):
    m = re.search(rf"^## {titulo}.*?$(.*?)(?=^## |\Z)", texto, re.M | re.S)
    return m.group(1) if m else ""


def main(argv):
    if len(argv) != 2:
        print(__doc__)
        return 2
    base, problemas = argv[1], []
    commits = git("rev-list", "--reverse", f"{base}..HEAD").split()
    adicao = git("log", "--diff-filter=A", "--format=%H", f"{base}..HEAD", "--", BASELINE).split()
    codigo = git("log", "--reverse", "--format=%H", f"{base}..HEAD", "--", "api", "web/src").split()
    if not adicao:
        problemas.append(f"{BASELINE} não foi adicionado depois de {base}")
    elif codigo and commits.index(adicao[-1]) >= commits.index(codigo[0]):
        problemas.append(f"baseline em {adicao[-1][:7]} não é anterior ao primeiro commit de código {codigo[0][:7]}")

    texto = git("show", f"HEAD:{BASELINE}") if adicao else ""
    ca1502 = [l for l in secao(texto, "CA1502").splitlines() if re.match(r"^\| `?api/\S+\.cs`? \| \d+ \|", l)]
    if not ca1502:
        problemas.append("a seção ## CA1502 não tem linhas | api/<arquivo>.cs | <contagem> |")
    crapper = [l for l in secao(texto, "crapper").splitlines() if re.match(r"^\| \d+ \| .+ \| \d+ \| \d+\.\d+% \| \d+\.\d+ \|", l)]
    if len(crapper) != 10:
        problemas.append(f"a seção ## crapper tem {len(crapper)} linhas | n | função | CC | cobertura% | CRAP |, esperadas 10")

    for p in problemas:
        print(p)
    print("ok" if not problemas else f"{len(problemas)} problema(s)")
    return 1 if problemas else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
