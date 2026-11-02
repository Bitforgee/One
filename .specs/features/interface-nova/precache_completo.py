"""C10 (AC 11): o precache do sw.js cobre todo arquivo estático do build e nenhuma URL da API.

Uso: python precache_completo.py <pasta do build>     (ex.: api/wwwroot, depois de npm --prefix web run build)
     python precache_completo.py --autoteste

Todo .js, .css, .html, .png, .svg e .woff2 da pasta, fora o próprio sw.js e os workbox-*.js, tem de estar no
manifesto de precache do sw.js; nenhuma URL do manifesto pode começar com api/ nem /api/.
"""
import re
import sys
from pathlib import Path

EXTENSOES = {".js", ".css", ".html", ".png", ".svg", ".woff2"}


def conferir(arquivos, urls):
    """Devolve os problemas: arquivos fora do precache e URLs da API dentro dele."""
    esperados = {a for a in arquivos if Path(a).suffix in EXTENSOES and a != "sw.js" and not re.fullmatch(r"workbox-[^/]*\.js", a)}
    problemas = [f"fora do precache: {a}" for a in sorted(esperados - set(urls))]
    problemas += [f"URL da API no precache: {u}" for u in urls if u.startswith(("api/", "/api/"))]
    return problemas


def autoteste():
    assert conferir(["index.html", "sw.js", "workbox-1.js", "assets/a.js"], ["index.html", "assets/a.js"]) == []
    assert conferir(["index.html", "assets/f.woff2"], ["index.html"]), "woff2 fora do precache deve falhar"
    assert conferir(["index.html"], ["index.html", "api/auth/me"]), "URL api/ deve falhar"
    assert conferir(["index.html"], ["index.html", "/api/x"]), "URL /api/ deve falhar"
    assert conferir(["assets/a.woff"], []) == [], ".woff não é exigido"
    print("autoteste ok")


def main(argv):
    if argv[1:] == ["--autoteste"]:
        autoteste()
        return 0
    if len(argv) != 2:
        print(__doc__)
        return 2
    pasta = Path(argv[1])
    sw = (pasta / "sw.js").read_text(encoding="utf-8")
    urls = re.findall(r'url:\s*"([^"]+)"', sw)
    arquivos = [p.relative_to(pasta).as_posix() for p in pasta.rglob("*") if p.is_file()]
    problemas = conferir(arquivos, urls)
    for p in problemas:
        print(p)
    print(f"{len(urls)} URL(s) no precache, {len(problemas)} problema(s)")
    return 1 if problemas or not urls else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
