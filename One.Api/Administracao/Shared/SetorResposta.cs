namespace One.Api.Administracao.Shared;

public sealed record SetorResposta(long Id, string Nome, bool Triagem, bool Ativo)
{
    public static SetorResposta De(Setor s) => new(s.Id, s.Nome, s.Triagem, s.Ativo);
}
