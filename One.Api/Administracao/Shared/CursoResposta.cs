namespace One.Api.Administracao.Shared;

public sealed record CursoResposta(long Id, string Nome, long? SetorCoordenacaoId)
{
    public static CursoResposta De(Curso c) => new(c.Id, c.Nome, c.SetorCoordenacaoId);
}
