namespace One.Api.Administracao;

public sealed record FluxoResposta(long Id, long CategoriaId, long? CursoId, int? Semestre, FluxoResposta.VersaoResposta? Vigente, FluxoResposta.VersaoResposta? Rascunho)
{
    public sealed record EtapaResposta(string Destino, long? SetorId, int? PrazoHoras, double? X, double? Y);

    public sealed record VersaoResposta(int Numero, IReadOnlyList<EtapaResposta> Etapas)
    {
        public static VersaoResposta? De(VersaoFluxo? v) =>
            v is null ? null : new(v.Numero, [.. v.Etapas.OrderBy(e => e.Ordem).Select(e => new EtapaResposta(e.Destino, e.SetorId, e.PrazoHoras, e.PosX, e.PosY))]);
    }

    public static FluxoResposta De(Fluxo f) => new(f.Id, f.CategoriaId, f.CursoId, f.Semestre, VersaoResposta.De(f.Vigente), VersaoResposta.De(f.Rascunho));
}
