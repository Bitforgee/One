"""C7: os retratos de S1 foram gravados com o código da base e os testes de S1 não mudaram depois.

Uso: python retratos_antes.py <base>

Cada retrato foi adicionado num único commit depois de <base>, nenhum arquivo de api/ mudou entre <base> e esse
commit, e o retrato não mudou desde então; os 3 arquivos de teste de S1 não mudam em nenhum commit posterior ao
último desses commits de adição.
"""
import subprocess
import sys

RETRATOS = ["api.Tests/Retratos/sucessos.txt", "api.Tests/Retratos/importacao.txt", "api.Tests/Retratos/gravacoes.txt"]
TESTES = ["api.Tests/RetratoTests.cs", "api.Tests/OrdemDasRecusasTests.cs", "api.Tests/RecusasDoDominioTests.cs"]


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True, encoding="utf-8", check=True).stdout.strip()


def main(argv):
    if len(argv) != 2:
        print(__doc__)
        return 2
    base, problemas, adicoes = argv[1], [], []
    for retrato in RETRATOS:
        commits = git("log", "--format=%H", f"{base}..HEAD", "--", retrato).split()
        adicao = git("log", "--diff-filter=A", "--format=%H", f"{base}..HEAD", "--", retrato).split()
        if len(adicao) != 1:
            problemas.append(f"{retrato}: {len(adicao)} commits de adição depois de {base}, esperado 1")
            continue
        adicoes.append(adicao[0])
        if commits != adicao:
            problemas.append(f"{retrato}: mudou depois de {adicao[0][:7]} ({len(commits) - 1} commit(s) a mais)")
        if git("diff", "--name-only", base, adicao[0], "--", "api"):
            problemas.append(f"{retrato}: api/ mudou entre {base} e {adicao[0][:7]}")
    if adicoes:
        # o último commit de adição na história de HEAD
        ultimo = next(c for c in git("rev-list", f"{base}..HEAD").split() if c in adicoes)
        for teste in TESTES:
            depois = git("log", "--format=%h", f"{ultimo}..HEAD", "--", teste).split()
            if depois:
                problemas.append(f"{teste}: mudou depois de {ultimo[:7]} em {', '.join(depois)}")
    for p in problemas:
        print(p)
    print("ok: retratos de S1 gravados com o código da base e testes sem mudança" if not problemas else f"{len(problemas)} problema(s)")
    return 1 if problemas else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
