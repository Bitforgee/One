namespace One.Api.Administracao.Shared;

public sealed record RegraResposta(long Id, long CategoriaId, string Destino, long? SetorId)
{
    public static RegraResposta De(RegraRoteamento r) => new(r.Id, r.CategoriaId, r.Destino, r.SetorId);
}
