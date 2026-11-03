"""C33: o chamadas_iguais.py da redesign-institucional com os testes que esta feature reescreveu (## Handoff).

Uso: python chamadas_iguais.py <base> [<alvo>]  |  python chamadas_iguais.py --autoteste
"""
import importlib.util
import sys
from pathlib import Path

sys.dont_write_bytecode = True
origem = Path(__file__).resolve().parents[1] / "redesign-institucional" / "chamadas_iguais.py"
especificacao = importlib.util.spec_from_file_location("chamadas_redesign", origem)
mod = importlib.util.module_from_spec(especificacao)
especificacao.loader.exec_module(mod)

# teste da base -> o que o substitui; cada linha precisa de uma linha em ## Handoff (Settled mid-build)
mod.REESCRITOS = {
    **{
        ("src/acesso/acesso.test.tsx", f'acesso > rodapé da barra lateral por papel ({p})'): f'acesso > botões do cabeçalho por papel ({p})'
        for p in ('["ALUNO"]', '["ATENDENTE"]', '["ADMINISTRADOR"]')
    },
    ("src/acesso/acesso.test.tsx", "barra lateral com grupos > nome do usuário na gaveta"): "barra lateral com grupos > nome do usuário no painel do celular",
    ("src/acesso/acesso.test.tsx", "barra lateral com grupos > recolher e expandir gravam one-barra"): "barra lateral com grupos > alternar barra grava one-barra",
    ("src/acesso/acesso.test.tsx", "barra lateral com grupos > one-barra desconhecido começa aberta (null)"): "barra lateral com grupos > estado inicial da barra por one-barra (null)",
    ("src/acesso/acesso.test.tsx", "barra lateral com grupos > one-barra desconhecido começa aberta (x)"): "barra lateral com grupos > estado inicial da barra por one-barra (xyz)",
    ("src/assistente/avisos.test.tsx", "avisos > na barra lateral o botão de avisos traz o texto visível"):
        "avisos > no cabeçalho o botão de avisos é um ícone com nome acessível e alterna",
    ("src/assistente/avisos.test.tsx", "avisos > no(a) gaveta o item de avisos mostra o texto visível"):
        "avisos > no cabeçalho o botão de avisos é um ícone com nome acessível e alterna",
}

if __name__ == "__main__":
    if sys.argv[1:] == ["--autoteste"]:
        (mod.autoteste if mod.REESCRITOS else mod.base_ci.autoteste)()  # o autoteste da redesign precisa de um reescrito
        sys.exit(0)
    sys.exit(mod.base_ci.main(sys.argv))
