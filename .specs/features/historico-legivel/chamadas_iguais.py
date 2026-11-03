"""C10: o chamadas_iguais.py da redesign-institucional com os testes que ## Test policy desta feature reescreveu.

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

mod.REESCRITOS = {
    ("src/chamados/resposta.test.tsx", "conversa do chamado > histórico só mostra a seta quando o evento tem origem ou destino"):
        "conversa do chamado > estado nulo no histórico sai como travessão",
}

if __name__ == "__main__":
    if sys.argv[1:] == ["--autoteste"]:
        mod.autoteste()
        sys.exit(0)
    sys.exit(mod.base_ci.main(sys.argv))
