namespace One.Api.Administracao;

public sealed record SetorResposta(long Id, string Nome, bool Triagem, bool Ativo, long? CursoId, int? Semestre)
{
    public static SetorResposta De(Setor s) => new(s.Id, s.Nome, s.Triagem, s.Ativo, s.CursoId, s.Semestre);
}
