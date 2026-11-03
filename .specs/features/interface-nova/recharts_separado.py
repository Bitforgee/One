"""C45 (AC 33): o Recharts vai num chunk separado do de entrada.

Uso: python recharts_separado.py <pasta do build>     (ex.: api/wwwroot, depois de npm --prefix web run build)
     python recharts_separado.py --autoteste

O .js de entrada (o <script type="module" src=...> do index.html) não contém a marca `recharts-surface`, e outro
.js de assets/ contém.
"""
import re
import sys
from pathlib import Path

MARCA = "recharts-surface"


def entrada(html):
    """Caminho do .js de entrada, relativo à pasta do build."""
    achado = re.search(r'<script[^>]*type="module"[^>]*src="/?([^"]+\.js)"', html)
    if not achado:
        raise SystemExit("index.html sem <script type=\"module\" src=...>")
    return achado.group(1)


def conferir(principal, scripts):
    """principal: caminho do .js de entrada; scripts: {caminho: conteúdo} dos .js de assets/. Devolve os problemas."""
    problemas = []
    if MARCA in scripts.get(principal, ""):
        problemas.append(f"o chunk de entrada {principal} contém {MARCA}")
    if not any(MARCA in texto for caminho, texto in scripts.items() if caminho != principal):
        problemas.append(f"nenhum outro chunk contém {MARCA}")
    return problemas


def autoteste():
    assert entrada('<script type="module" crossorigin src="/assets/index-a1.js"></script>') == "assets/index-a1.js"
    assert conferir("assets/i.js", {"assets/i.js": "x", "assets/g.js": f"'{MARCA}'"}) == []
    assert conferir("assets/i.js", {"assets/i.js": MARCA, "assets/g.js": MARCA}), "Recharts na entrada deve falhar"
    assert conferir("assets/i.js", {"assets/i.js": "x", "assets/g.js": "y"}), "Recharts em nenhum chunk deve falhar"
    assert conferir("assets/i.js", {"assets/i.js": MARCA}), "só a entrada com Recharts deve falhar"
    print("autoteste ok")


def main():
    if sys.argv[1:] == ["--autoteste"]:
        autoteste()
        return
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    pasta = Path(sys.argv[1])
    principal = entrada((pasta / "index.html").read_text(encoding="utf-8"))
    scripts = {p.relative_to(pasta).as_posix(): p.read_text(encoding="utf-8") for p in (pasta / "assets").glob("*.js")}
    if principal not in scripts:
        raise SystemExit(f"o chunk de entrada {principal} não está em assets/")
    problemas = conferir(principal, scripts)
    for p in problemas:
        print(p)
    print(f"entrada {principal}, {len(scripts)} chunks, {len(problemas)} problema(s)")
    sys.exit(1 if problemas else 0)


if __name__ == "__main__":
    main()
