#!/usr/bin/env python3
"""C18 de fatias-em-subpastas: entre <base> e HEAD, toda linha de asserção removida reaparece como linha
adicionada depois de trocar cada caminho ou namespace do mapa por um marcador, e nenhuma linha adicionada
traz Skip =, .skip( ou .only(.

Uso: python .specs/features/fatias-em-subpastas/asserts_so_caminho.py <base>
"""
import re
import subprocess
import sys
from collections import Counter

FATIAS_API = ["Chamados", "Administracao", "Assistente", "Conhecimento", "Instituicoes"]
SUBPASTAS_API = [
    "Acoes", "Permissao", "Consulta", "Push", "TempoReal", "Tarefas",
    "Categorias", "Cursos", "Setores", "Usuarios", "RespostasProntas", "Fluxos", "Matriculas", "Integracoes",
    "Conversas", "Respostas", "Busca",
    "Artigos", "Documentos",
    "Aparencia", "Carga", "Plataforma",
]
SUBPASTAS_WEB = ["aparencia", "fluxos", "cadastros", "integracoes", "instituicoes"]

ARQUIVOS = [
    re.compile(r"^One\.Api\.Tests/.*\.cs$"),
    re.compile(r"^web/src/.*\.test\.tsx$"),
    re.compile(r"^web/e2e/"),
]
ASSERCAO = re.compile(r"Assert|expect\(|toBe|toHave")
PROIBIDO = re.compile(r"Skip\s*=|\.skip\(|\.only\(")

F = "|".join(FATIAS_API)
S = "|".join(SUBPASTAS_API)
W = "|".join(SUBPASTAS_WEB)
SUBSTITUICOES = [
    (re.compile(rf"\b({F})\.({S})\b"), r"\1"),
    (re.compile(rf"\b({F})/({S})/"), r"\1/"),
    (re.compile(rf"\b({F})\{{sep\}}({S})\{{sep\}}"), r"\1{sep}"),
    (re.compile(rf'"({F})", "({S})"'), r'"\1"'),
    (re.compile(rf"\b({F})\\\\({S})\\\\"), r"\1\\\\"),
    (re.compile(rf"(administracao/)({W})/"), r"\1"),
    (re.compile(r"(\.\./)+"), "../"),
    (re.compile(r"\\\.\{SubpastaDoShared\[\w+\]\}"), ""),
    (re.compile(r"FatiaDo\((\w+)\) == fatia"), r'\1.Namespace == $"One.Api.{fatia}"'),
]


def normalizar(linha):
    linha = linha.strip()
    for padrao, troca in SUBSTITUICOES:
        linha = padrao.sub(troca, linha)
    return re.sub(r"\s+", " ", linha)


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True, encoding="utf-8", check=True).stdout


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    base = sys.argv[1]
    alcance = base if "--worktree" in sys.argv[2:] else f"{base}..HEAD"
    diff = git("diff", "--no-renames", "-U0", alcance)
    atual = None
    removidas, adicionadas = [], []
    proibidas = []
    for linha in diff.splitlines():
        if linha.startswith("+++ "):
            alvo = linha[6:] if linha.startswith("+++ b/") else None
            atual = alvo if alvo and any(p.match(alvo) for p in ARQUIVOS) else None
            continue
        if linha.startswith("--- "):
            continue
        if atual is None:
            continue
        if linha.startswith("-"):
            if ASSERCAO.search(linha):
                removidas.append((atual, linha[1:]))
        elif linha.startswith("+"):
            if PROIBIDO.search(linha):
                proibidas.append((atual, linha[1:]))
            adicionadas.append(normalizar(linha[1:]))

    disponiveis = Counter(adicionadas)
    faltando = []
    for arquivo, linha in removidas:
        chave = normalizar(linha)
        if disponiveis[chave] > 0:
            disponiveis[chave] -= 1
        else:
            faltando.append((arquivo, linha.strip()))

    for arquivo, linha in proibidas:
        print(f"FAIL proibido adicionado em {arquivo}: {linha.strip()}")
    for arquivo, linha in faltando:
        print(f"FAIL asserção removida sem equivalente em {arquivo}: {linha}")
    print(f"asserções removidas: {len(removidas)}; sem equivalente: {len(faltando)}; skip/only adicionados: {len(proibidas)}")
    return 1 if faltando or proibidas else 0


if __name__ == "__main__":
    sys.exit(main())
