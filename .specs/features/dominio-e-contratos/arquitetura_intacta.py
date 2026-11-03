"""C40: nenhum membro de api.Tests/ArquiteturaTests.cs que existe em <base> mudou.

Uso: python arquitetura_intacta.py <base>

Métodos de teste, auxiliares e campos (Fatias, ReferenciasEntreFatias, LiteraisGravados, TabelasDaInstituicao...) têm em HEAD o
mesmo texto de <base>, sem comentários e com os espaços normalizados. Membro novo não conta; membro que sumiu ou mudou, sim.
"""
import re
import subprocess
import sys

ARQUIVO = "api.Tests/ArquiteturaTests.cs"


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True, encoding="utf-8", check=True).stdout


def sem_comentarios(texto):
    """Tira // e /* */ fora de literais de texto; a posição de cada caractere restante não importa."""
    saida, i, n = [], 0, len(texto)
    while i < n:
        c = texto[i]
        if texto.startswith('"""', i):
            fim = texto.index('"""', i + 3) + 3
            saida.append(texto[i:fim]); i = fim
        elif c in '"' or (c in "@$" and texto[i + 1:i + 2] in ('"', "$", "@")):
            j = i
            while texto[j] != '"': j += 1
            verbatim = "@" in texto[i:j]
            j += 1
            while True:
                if verbatim and texto.startswith('""', j): j += 2
                elif not verbatim and texto[j] == "\\": j += 2
                elif texto[j] == '"': j += 1; break
                else: j += 1
            saida.append(texto[i:j]); i = j
        elif c == "'" :
            j = i + 1
            while texto[j] != "'":
                j += 2 if texto[j] == "\\" else 1
            saida.append(texto[i:j + 1]); i = j + 1
        elif texto.startswith("//", i):
            # o // de uma URL (depois de ":") fica, como em ArquiteturaTests.SemComentarios
            if i > 0 and texto[i - 1] == ":": saida.append("//"); i += 2; continue
            while i < n and texto[i] != "\n": i += 1
        elif texto.startswith("/*", i):
            i = texto.index("*/", i) + 2
        else:
            saida.append(c); i += 1
    return "".join(saida)


def membros(texto):
    """Membros do primeiro tipo do arquivo, por nome -> texto normalizado."""
    texto = sem_comentarios(texto)
    inicio = texto.index("{", texto.index("class ArquiteturaTests")) + 1
    corpo, resultado = texto[inicio:], {}
    atual, prof, i, n, tem_igual = [], 0, 0, len(corpo), False
    while i < n:
        c = corpo[i]
        if c == '"' or (c in "@$" and corpo[i + 1:i + 2] in ('"', "$", "@")):
            if corpo.startswith('"""', i):
                fim = corpo.index('"""', i + 3) + 3
            else:
                j = i
                while corpo[j] != '"': j += 1
                verbatim = "@" in corpo[i:j]
                j += 1
                while True:
                    if verbatim and corpo.startswith('""', j): j += 2
                    elif not verbatim and corpo[j] == "\\": j += 2
                    elif corpo[j] == '"': j += 1; break
                    else: j += 1
                fim = j
            atual.append(corpo[i:fim]); i = fim; continue
        if c == "'":
            j = i + 1
            while corpo[j] != "'": j += 2 if corpo[j] == "\\" else 1
            atual.append(corpo[i:j + 1]); i = j + 1; continue
        atual.append(c)
        if c in "{[(": prof += 1
        elif c in "}])":
            prof -= 1
            if prof < 0: break  # fim da classe
            if prof == 0 and c == "}" and not tem_igual:
                guardar(resultado, "".join(atual)); atual, tem_igual = [], False
        elif prof == 0 and c == "=": tem_igual = True
        elif prof == 0 and c == ";":
            guardar(resultado, "".join(atual)); atual, tem_igual = [], False
        i += 1
    return resultado


def guardar(resultado, texto):
    texto = re.sub(r"\s+", " ", texto).strip()
    cabecalho = re.sub(r"^(\[[^\]]*\]\s*)+", "", texto)
    while (sem := re.sub(r"<[^<>]*>", "", cabecalho)) != cabecalho:
        cabecalho = sem
    nome = re.search(r"\b(\w+)\s*(?=[(=])", cabecalho)
    chave = nome.group(1) if nome else texto[:40]
    while chave in resultado:
        chave += "+"
    resultado[chave] = texto


def main(argv):
    if len(argv) != 2:
        print(__doc__)
        return 2
    base = argv[1]
    antes, depois = membros(git("show", f"{base}:{ARQUIVO}")), membros(git("show", f"HEAD:{ARQUIVO}"))
    problemas = [f"{nome}: " + ("sumiu" if nome not in depois else "mudou") for nome, texto in antes.items() if depois.get(nome) != texto]
    for p in problemas:
        print(p)
    print(f"{len(antes)} membro(s) em {base}, {len(depois)} em HEAD, {len(problemas)} problema(s)")
    return 1 if problemas else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
