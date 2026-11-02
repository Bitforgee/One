"""C4: os retratos api.Tests/Retratos/rotas.txt e erros.txt foram gravados com o código da base.

Uso: python retratos_antes.py <base>

Cada retrato foi adicionado num único commit depois de <base>, nenhum arquivo de api/ mudou entre <base>
e esse commit, e o retrato não mudou desde então.
"""
import subprocess
import sys

RETRATOS = ["api.Tests/Retratos/rotas.txt", "api.Tests/Retratos/erros.txt"]


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True, encoding="utf-8", check=True).stdout.strip()


def main(argv):
    if len(argv) != 2:
        print(__doc__)
        return 2
    base, problemas = argv[1], []
    for retrato in RETRATOS:
        commits = git("log", "--format=%H", f"{base}..HEAD", "--", retrato).split()
        adicoes = git("log", "--diff-filter=A", "--format=%H", f"{base}..HEAD", "--", retrato).split()
        if len(adicoes) != 1:
            problemas.append(f"{retrato}: {len(adicoes)} commits de adição depois de {base}, esperado 1")
            continue
        adicao = adicoes[0]
        if commits != [adicao]:
            problemas.append(f"{retrato}: mudou depois de {adicao[:7]} ({len(commits) - 1} commit(s) a mais)")
        if git("diff", "--name-only", base, adicao, "--", "api"):
            problemas.append(f"{retrato}: api/ mudou entre {base} e {adicao[:7]}")
        if git("diff", "--name-only", adicao, "HEAD", "--", retrato):
            problemas.append(f"{retrato}: difere entre {adicao[:7]} e HEAD")
    for p in problemas:
        print(p)
    print("ok: retratos gravados com o código da base e sem mudança" if not problemas else f"{len(problemas)} problema(s)")
    return 1 if problemas else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
