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
mod.REESCRITOS = {}

if __name__ == "__main__":
    if sys.argv[1:] == ["--autoteste"]:
        (mod.autoteste if mod.REESCRITOS else mod.base_ci.autoteste)()  # o autoteste da redesign precisa de um reescrito
        sys.exit(0)
    sys.exit(mod.base_ci.main(sys.argv))
