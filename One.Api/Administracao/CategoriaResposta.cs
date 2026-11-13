namespace One.Api.Administracao;

public sealed record CategoriaResposta(long Id, string Nome, bool Ativa, bool Padrao)
{
    public static CategoriaResposta De(Categoria c) => new(c.Id, c.Nome, c.Ativa, c.Padrao);
}
