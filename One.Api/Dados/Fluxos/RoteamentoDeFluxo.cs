namespace One.Api.Dados.Fluxos;

public static class RoteamentoDeFluxo
{
    public const string SemCoordenacao = "Curso sem coordenação";
    public const string SemLideranca = "Sem liderança disponível";
    public const string SetorInativo = "Setor inativo";
    public const string SemConversa = "Atendimento direto não passa pela liderança";

    public sealed record Contexto(IReadOnlyDictionary<long, Setor> Setores, long? CoordenacaoDoCurso, long? Lideranca);

    public sealed record Resolucao(long? SetorId, string? Motivo)
    {
        public bool Resolvida => SetorId is not null;
    }

    public sealed record Passo(EtapaFluxo Etapa, long SetorId);

    public sealed record Rota(Fluxo? Fluxo, Passo? Passo, long SetorId);

    public static Fluxo? Escolher(IEnumerable<Fluxo> fluxos, long cursoId, int semestre)
    {
        var publicados = fluxos.Where(f => f.Vigente is not null).ToList();
        return publicados.FirstOrDefault(f => f.CursoId == cursoId && f.Semestre == semestre)
            ?? publicados.FirstOrDefault(f => f.CursoId == cursoId && f.Semestre is null)
            ?? publicados.FirstOrDefault(f => f.CursoId is null);
    }

    public static bool UsaOSetor(Fluxo fluxo, long setorId) =>
        fluxo.Vigente is { } v && v.Etapas.Any(e => e.Destino == DestinosEtapa.Setor && e.SetorId == setorId);

    public static Resolucao Etapa(EtapaFluxo etapa, Contexto contexto) => etapa.Destino switch
    {
        DestinosEtapa.Setor => contexto.Setores.TryGetValue(etapa.SetorId ?? 0, out var s) && s.Ativo ? new Resolucao(s.Id, null) : new Resolucao(null, SetorInativo),
        DestinosEtapa.CoordenacaoCurso => contexto.CoordenacaoDoCurso is { } id ? new Resolucao(id, null) : new Resolucao(null, SemCoordenacao),
        _ => contexto.Lideranca is { } lider ? new Resolucao(lider, null) : new Resolucao(null, SemLideranca),
    };

    public static Resolucao Situacao(EtapaFluxo etapa, Contexto contexto, bool comLideranca)
    {
        var resolucao = Etapa(etapa, contexto);
        return DestinosEtapa.PedeCiencia(etapa.Destino) && resolucao.Resolvida && !comLideranca ? new Resolucao(null, SemConversa) : resolucao;
    }

    public static Passo? Proximo(IEnumerable<EtapaFluxo> etapas, int depoisDe, Contexto contexto, bool comLideranca) =>
        etapas.Where(e => e.Ordem > depoisDe).OrderBy(e => e.Ordem)
            .Select(e => (Etapa: e, Resolucao: Situacao(e, contexto, comLideranca)))
            .Where(x => x.Resolucao.Resolvida)
            .Select(x => new Passo(x.Etapa, x.Resolucao.SetorId!.Value))
            .FirstOrDefault();
}
