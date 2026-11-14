using One.Api.Dados;

namespace One.Api.Chamados.Permissao;

public sealed class AcessoChamado
{
    public Chamado Chamado { get; private set; } = null!;
    public string Papel { get; private set; } = "";
    public DateTime Agora { get; private set; }

    public void Preencher(Chamado chamado, string papel, DateTime agora) => (Chamado, Papel, Agora) = (chamado, papel, agora);
}
