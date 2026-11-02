using One.Api.Dados;

namespace One.Api.Chamados;

// door 5: o chamado carregado e quem age nele, um por requisição; só o AgirNoChamado preenche, antes do Validar e do handler.
public sealed class AcessoChamado
{
    public Chamado Chamado { get; private set; } = null!;
    public string Papel { get; private set; } = "";
    public Usuario Usuario { get; private set; } = null!;
    public Instituicao Instituicao { get; private set; } = null!;
    public DateTime Agora { get; private set; }
    public IConfiguration Cfg { get; private set; } = null!;
    public Prazos Prazos { get; private set; } = null!;

    public void Preencher(Chamado chamado, string papel, Usuario usuario, Instituicao instituicao, DateTime agora, IConfiguration cfg, Prazos prazos) =>
        (Chamado, Papel, Usuario, Instituicao, Agora, Cfg, Prazos) = (chamado, papel, usuario, instituicao, agora, cfg, prazos);
}
