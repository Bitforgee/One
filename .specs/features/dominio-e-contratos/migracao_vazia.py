"""C37: nenhuma migração entrou por causa da mudança de pasta e de forma das entidades.

Uso: python migracao_vazia.py <base>

Nenhum arquivo foi adicionado em api/Dados/Migracoes depois de <base>; se uma migração DominioRico entrou, os métodos
Up e Down dela não têm nenhuma chamada migrationBuilder.
"""
import re
import subprocess
import sys


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True, encoding="utf-8", check=True).stdout


def main(argv):
    if len(argv) != 2:
        print(__doc__)
        return 2
    base, problemas = argv[1], []
    adicionados = [l for l in git("diff", "--name-status", "--diff-filter=A", base, "HEAD", "--", "api/Dados/Migracoes").splitlines() if l]
    for linha in adicionados:
        caminho = linha.split("\t")[1]
        if not caminho.endswith("DominioRico.cs"):
            problemas.append(f"{caminho}: migração adicionada depois de {base}")
            continue
        sem_comentarios = re.sub(r"(?m)//.*$", "", git("show", f"HEAD:{caminho}"))
        if "migrationBuilder." in sem_comentarios:
            problemas.append(f"{caminho}: Up ou Down com chamada migrationBuilder.")
    for p in problemas:
        print(p)
    print(f"{len(adicionados)} arquivo(s) adicionado(s) em api/Dados/Migracoes, {len(problemas)} problema(s)")
    return 1 if problemas else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
