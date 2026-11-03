"""C26 e C27 da feature arquivos-minio.

Uso: python asserts_minio.py <base>            (C27: asserções preservadas, sem pulo, sem commit misto)
     python asserts_minio.py <base> --erros    (C26: erros.txt só ganha a linha do 503)
     python asserts_minio.py --autoteste

C27 aplica `conferir` de refatoracao-solid/asserts_preservados.py e tolera só as 3 linhas listadas em EXCECOES,
e só quando a linha nova correspondente também aparece como adicionada.
"""
import importlib.util
import os
import re
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("asserts_preservados", os.path.join(AQUI, "..", "refatoracao-solid", "asserts_preservados.py"))
base_regras = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(base_regras)

ERROS = "api.Tests/Retratos/erros.txt"
LINHA_503 = '503 {"type":"https://tools.ietf.org/html/rfc9110#section-15.6.4","title":"Erro interno","status":503,"detail":"Armazenamento de arquivos indisponível."}'

# (linha removida, trecho que a linha nova precisa conter)
EXCECOES = [
    ("Assert.Equal(8, gravados.Length);", "Assert.Equal(9, gravados.Length);"),
    ("Assert.Equal(png, coluna);", "Assert.Equal(png, await f.Objeto("),
    ('Assert.Equal(["Agendador", "Cpf", "Email", "Prazos", "Problemas", "Program", "Sessao", "Tokens"],', '"Armazenamento"'),
]


def adicionadas(diff):
    return [base_regras.normalizar(l[1:]) for l in diff.splitlines() if l.startswith("+") and not l.startswith("+++")]


def conferir(diff):
    novas = adicionadas(diff)
    problemas = []
    for p in base_regras.conferir(diff):
        excecao = next((e for e in EXCECOES if p.endswith(base_regras.normalizar(e[0]))), None)
        if excecao is None:
            problemas.append(p)
        elif not any(excecao[1] in n for n in novas):
            problemas.append(f"exceção sem a linha nova ({excecao[1]}): {p}")
    return problemas


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True, encoding="utf-8", check=True).stdout


def commits_mistos(base):
    mistos = []
    for sha in git("rev-list", f"{base}..HEAD").split():
        arquivos = git("diff-tree", "--no-commit-id", "--name-only", "-r", sha).split()
        if any(a.startswith(("api/", "api.Tests/")) for a in arquivos) and any(a.startswith("web/") for a in arquivos):
            mistos.append(sha[:7])
    return mistos


def linhas_novas_de_erros(base):
    """Devolve (acrescentadas, removidas, texto das linhas acrescentadas) de erros.txt entre base e HEAD."""
    saida = git("diff", "--numstat", base, "HEAD", "--", ERROS)
    ganho, perda = saida.split("	")[:2] if saida else ("0", "0")
    diff = git("diff", "--no-color", "-U0", base, "HEAD", "--", ERROS)
    texto = [l[1:].rstrip("\r") for l in diff.splitlines() if l.startswith("+") and not l.startswith("+++")]
    return int(ganho), int(perda), texto


def erros(base):
    ganho, perda, texto = linhas_novas_de_erros(base)
    problemas = []
    if (ganho, perda) != (1, 0):
        problemas.append(f"erros.txt: {ganho} acrescentada(s) e {perda} removida(s), esperado 1 e 0")
    if texto != [LINHA_503]:
        problemas.append(f"erros.txt: linha nova diferente da esperada: {texto}")
    return problemas


def autoteste():
    def diff(arquivo, menos, mais):
        return f"--- a/{arquivo}\n+++ b/{arquivo}\n@@ -1 +1 @@\n" + "".join(f"-{l}\n" for l in menos) + "".join(f"+{l}\n" for l in mais)

    a = "api.Tests/A.cs"
    assert conferir(diff(a, ["Assert.Equal(8, gravados.Length);"], ["Assert.Equal(9, gravados.Length);"])) == [], "8 para 9 passa"
    assert conferir(diff(a, ["Assert.Equal(8, gravados.Length);"], [])), "8 sem a linha nova falha"
    assert conferir(diff(a, ["Assert.Equal(8, gravados.Length);"], ["Assert.Equal(7, gravados.Length);"])), "8 para 7 falha"
    assert conferir(diff(a, ["Assert.Equal(png, coluna);"], ["Assert.Equal(png, await f.Objeto(chave));"])) == [], "coluna para objeto passa"
    assert conferir(diff(a, ["Assert.Equal(png, coluna);"], [])), "coluna sem a linha nova falha"
    raiz = '["Agendador", "Cpf", "Email", "Prazos", "Problemas", "Program", "Sessao", "Tokens"],'
    assert conferir(diff(a, [f"Assert.Equal({raiz}"], ['Assert.Equal(["Agendador", "Armazenamento", "Cpf"],'])) == [], "lista com Armazenamento passa"
    assert conferir(diff(a, [f"Assert.Equal({raiz}"], [])), "lista sem a linha nova falha"
    assert conferir(diff(a, ["Assert.True(x);"], [])), "outra asserção removida falha"
    assert conferir(diff(a, [], ['[Fact(Skip = "x")]'])), "Skip = falha"
    assert conferir(diff(a, ["using A;"], ["using B;"])) == []
    print("autoteste ok")


def main(argv):
    if argv[1:] == ["--autoteste"]:
        autoteste()
        return 0
    if len(argv) not in (2, 3) or (len(argv) == 3 and argv[2] != "--erros"):
        print(__doc__)
        return 2
    base = argv[1]
    if len(argv) == 3:
        problemas = erros(base)
    else:
        diff = git("diff", "--no-renames", "--no-color", "-U0", base, "HEAD", "--", "api.Tests", "web/src", "web/e2e")
        problemas = conferir(diff) + [f"commit mistura api e web: {c}" for c in commits_mistos(base)]
    for p in problemas:
        print(p)
    print(f"{len(problemas)} problema(s) desde {base}")
    return 1 if problemas else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
