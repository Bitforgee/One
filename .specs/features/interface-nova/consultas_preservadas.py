"""C3 (AC 5): toda consulta por papel ou rótulo dos testes de <base> continua em HEAD, com os mesmos argumentos.

Uso: python consultas_preservadas.py <base> [<alvo>]      (alvo padrão: HEAD)
     python consultas_preservadas.py --autoteste

Nos arquivos de teste do C2 (web/src/**/*.test.ts, web/src/**/*.test.tsx, web/e2e/**), cada chamada
getByRole(, findByRole(, queryByRole(, getAllByRole(, findAllByRole(, queryAllByRole(, *ByLabelText( e
getByLabel(, com o texto dos argumentos (espaços normalizados), aparece no alvo pelo menos tantas vezes quanto
em <base> (multiconjunto somado sobre todos os arquivos).
"""
import re
import subprocess
import sys
from collections import Counter

CONSULTA = re.compile(r"\b(?:(?:get|find|query)(?:All)?By(?:Role|LabelText)|getByLabel)\(")


def alvo(caminho):
    return (caminho.startswith("web/src/") and caminho.endswith((".test.ts", ".test.tsx"))) or caminho.startswith("web/e2e/")


def consultas(fonte):
    """Cada consulta com os argumentos até o parêntese que fecha a chamada."""
    achadas = Counter()
    for m in CONSULTA.finditer(fonte):
        nivel, i = 1, m.end()
        while i < len(fonte) and nivel:
            nivel += {"(": 1, ")": -1}.get(fonte[i], 0)
            i += 1
        achadas[" ".join(fonte[m.start():i].split())] += 1
    return achadas


def conferir(antes, depois):
    """antes e depois: textos dos arquivos de teste; devolve as consultas que diminuíram."""
    base, alvo_ = Counter(), Counter()
    for t in antes:
        base += consultas(t)
    for t in depois:
        alvo_ += consultas(t)
    return [f"consulta perdida ({n}x): {c}" for c, n in (base - alvo_).items()]


def autoteste():
    a = "screen.getByRole('button', { name: 'Sim' })\nawait screen.findByLabelText('CPF')"
    assert conferir([a], [a]) == []
    assert conferir([a], ["screen.getByRole('button', {\n name: 'Sim' })\nscreen.findByLabelText('CPF')"]) == [], "quebra de linha não conta"
    assert conferir([a], ["screen.findByLabelText('CPF')"]), "consulta removida deve falhar"
    assert conferir([a], ["screen.getByRole('button', { name: 'Não' })\nscreen.findByLabelText('CPF')"]), "nome trocado deve falhar"
    assert conferir([a + "\n" + a], [a]), "duas cópias viram uma deve falhar"
    assert conferir(["page.getByLabel('Arquivo CSV')"], ["page.getByLabel('CSV')"]), "getByLabel do Playwright conta"
    assert conferir(["within(d).getAllByRole('option')"], ["within(d).getAllByRole('option')", "x"]) == []
    assert conferir(["f(screen.getByRole('link', { name: g('x') }))"], ["screen.getByRole('link', { name: g('x') })"]) == [], "parênteses aninhados"
    print("autoteste ok")


def arquivos(rev):
    nomes = subprocess.run(["git", "ls-tree", "-r", "--name-only", rev, "--", "web/src", "web/e2e"],
                           capture_output=True, text=True, encoding="utf-8", check=True).stdout.split()
    return [subprocess.run(["git", "show", f"{rev}:{n}"], capture_output=True, text=True, encoding="utf-8", check=True).stdout
            for n in nomes if alvo(n)]


def main(argv):
    if argv[1:] == ["--autoteste"]:
        autoteste()
        return 0
    if len(argv) not in (2, 3):
        print(__doc__)
        return 2
    base, ate = argv[1], argv[2] if len(argv) == 3 else "HEAD"
    antes = arquivos(base)
    problemas = conferir(antes, arquivos(ate))
    for p in problemas:
        print(p)
    print(f"{sum(sum(consultas(t).values()) for t in antes)} consulta(s) em {base}, {len(problemas)} problema(s) em {ate}")
    return 1 if problemas else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
