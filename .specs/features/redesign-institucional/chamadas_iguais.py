"""C25 (AC 24): o chamadas_iguais.py da interface-nova, exceto os testes da base que ## Test policy reescreveu.

Uso: python chamadas_iguais.py <base> [<alvo>]      (alvo padrão: HEAD)
     python chamadas_iguais.py --autoteste

Decisão do usuário de 03/11/2026 (verificação rodada 1): um teste da base listado em REESCRITOS pode faltar no alvo;
se ainda existir no alvo, é comparado como os outros. Todo o resto é o script da interface-nova sem mudança.
"""
import sys
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "interface-nova"))
import chamadas_iguais as base_ci  # noqa: E402

# teste da base -> o que o substitui (checks.md ## Test policy e ## Handoff)
REESCRITOS = {
    ("src/assistente/avisos.test.tsx", "avisos > no(a) Mais o item de avisos mostra o texto visível"):
        "avisos > na barra lateral o botão de avisos traz o texto visível",
}

_conferir = base_ci.conferir


def conferir(base, alvo):
    return _conferir({k: v for k, v in base.items() if k in alvo or k not in REESCRITOS}, alvo)


def autoteste():
    trocado, outro = next(iter(REESCRITOS)), ("src/a.test.tsx", "a > b")
    get = [{"metodo": "GET", "url": "/api/x", "corpo": None}]
    assert conferir({trocado: get}, {}) == [], "teste reescrito pode faltar no alvo"
    assert conferir({outro: get}, {}), "outro teste sumido deve falhar"
    assert conferir({trocado: get}, {trocado: []}), "teste reescrito que ainda existe é comparado"
    base_ci.autoteste()


base_ci.conferir = conferir

if __name__ == "__main__":
    if sys.argv[1:] == ["--autoteste"]:
        autoteste()
        sys.exit(0)
    sys.exit(base_ci.main(sys.argv))
