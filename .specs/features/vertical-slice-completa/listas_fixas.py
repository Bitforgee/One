"""C20: as listas fixas do ArquiteturaTests não foram afrouxadas desde <base>.

Uso: python listas_fixas.py <base>

Os pares de ReferenciasEntreFatias em HEAD são um subconjunto dos de <base>; o array Fatias e os corpos de
Fatias_do_api, Namespace_igual_a_pasta e IgnoreQueryFilters_so_no_agendador_e_no_comando são iguais aos de
<base> (espaços normalizados).
"""
import re
import subprocess
import sys

ARQUIVO = "api.Tests/ArquiteturaTests.cs"
METODOS = ["Fatias_do_api", "Namespace_igual_a_pasta", "IgnoreQueryFilters_so_no_agendador_e_no_comando"]


def texto(rev):
    return subprocess.run(["git", "show", f"{rev}:{ARQUIVO}"], capture_output=True, text=True, encoding="utf-8", check=True).stdout


def pares(codigo):
    bloco = re.search(r"ReferenciasEntreFatias\s*=\s*\[(.*?)\];", codigo, re.S)
    return set(re.findall(r'\("(\w+)",\s*"(\w+)"\)', bloco.group(1))) if bloco else None


def fatias(codigo):
    m = re.search(r"static readonly string\[\] Fatias\s*=\s*\[(.*?)\];", codigo, re.S)
    return m and " ".join(m.group(1).split())


def corpo(codigo, metodo):
    # do cabeçalho do método até a primeira linha "    }" (fim de membro da classe)
    m = re.search(rf"public \S+ {metodo}\(\)\s*(\n    \{{.*?\n    \}}|=>.*?;\n)", codigo, re.S)
    return m and " ".join(m.group(1).split())


def main(argv):
    if len(argv) != 2:
        print(__doc__)
        return 2
    base, problemas = texto(argv[1]), []
    head = texto("HEAD")
    pb, ph = pares(base), pares(head)
    if not pb or ph is None:
        problemas.append("ReferenciasEntreFatias não encontrada")
    elif not ph <= pb:
        problemas.append(f"pares novos em HEAD: {sorted(ph - pb)}")
    if not fatias(base) or fatias(base) != fatias(head):
        problemas.append("o array Fatias mudou ou não foi encontrado")
    for metodo in METODOS:
        if not corpo(base, metodo) or corpo(base, metodo) != corpo(head, metodo):
            problemas.append(f"o corpo de {metodo} mudou ou não foi encontrado")
    for p in problemas:
        print(p)
    print(f"ok: {len(ph)} de {len(pb)} pares, Fatias e {len(METODOS)} corpos iguais" if not problemas else f"{len(problemas)} problema(s)")
    return 1 if problemas else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
