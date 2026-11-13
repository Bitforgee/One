using One.Api.Dados;
using static One.Api.Dados.Chamados.EstadosChamado;

namespace One.Api.Indicadores;

public record ChamadoLido(long Id, DateTime CriadoEm, string Estado, string? MotivoFechamento, int Reaberturas, int Encaminhamentos, long CategoriaOriginalId, long SetorId, long SolicitanteId);
public record RespostaLida(long ChamadoId, long? AutorId, DateTime CriadaEm);
public record ConversaLida(long AlunoId, string? Desfecho, bool SemBase);

public record Massa(List<ChamadoLido> Chamados, List<EventoChamado> Eventos, List<RespostaLida> Respostas,
    List<ConversaLida>? Conversas, List<long>? CategoriasDasConversas, Dictionary<long, string> Categorias);

public record Ranking(string Categoria, int Total);
public record PrincipaisCategorias(List<Ranking>? PorConversas, List<Ranking> PorChamados);

public record Resultado(DateOnly De, DateOnly Ate, long? SetorId, bool SemDados, int? AlunosAtivos, int? Conversas,
    double? TaxaAutoatendimento, double? TaxaEscalonamento, double? TaxaAbandono, double? TaxaPerguntasSemArtigo,
    int ChamadosAbertos, int ChamadosResolvidos, double? TempoPrimeiraRespostaHoras, double? TempoResolucaoHoras,
    double? RoteamentoCorreto, double? TaxaReabertura, PrincipaisCategorias PrincipaisCategorias, double? IndicadorPrincipal);

public static class CalculoIndicadores
{
    public static (DateTime Inicio, DateTime Fim) Periodo(DateOnly de, DateOnly ate, TimeZoneInfo fuso) =>
        (TimeZoneInfo.ConvertTimeToUtc(de.ToDateTime(TimeOnly.MinValue), fuso), TimeZoneInfo.ConvertTimeToUtc(ate.AddDays(1).ToDateTime(TimeOnly.MinValue), fuso));

    public static List<ChamadoLido> DosSetores(List<ChamadoLido> chamados, List<EventoChamado> eventos, List<long> setores, List<string> nomes)
    {
        var porChamado = eventos.ToLookup(e => e.ChamadoId);
        return chamados.Where(c => setores.Contains(c.SetorId) || porChamado[c.Id].Any(e => e.Tipo == TiposEvento.Encaminhamento && nomes.Contains(e.De!))).ToList();
    }

    static double? Taxa(int parte, int todo) => todo == 0 ? null : Math.Round((double)parte / todo, 4);

    static double? Media(IEnumerable<TimeSpan> tempos) => tempos.Any() ? Math.Round(tempos.Average(t => t.TotalHours), 2) : null;

    public static Resultado Calcular(Massa m, DateOnly de, DateOnly ate, TimeZoneInfo fuso, long? setorId)
    {
        var (inicio, fim) = Periodo(de, ate, fuso);
        var eventos = m.Eventos.OrderBy(e => e.CriadoEm).ThenBy(e => e.Id).ToLookup(e => e.ChamadoId);
        var criados = m.Chamados.Where(c => c.CriadoEm >= inicio && c.CriadoEm < fim).ToList();
        var resolvidos = m.Chamados.Where(c => Resolucoes(eventos[c.Id]).Any(e => e.CriadoEm >= inicio && e.CriadoEm < fim)).ToList();
        var conversas = m.Conversas ?? [];
        var c = DeConversa(m.Conversas);
        return new Resultado(de, ate, setorId, conversas.Count == 0 && criados.Count == 0 && resolvidos.Count == 0,
            c.AlunosAtivos, c.Total, c.Autoatendimento, c.Escalonamento, c.Abandono, c.SemArtigo,
            m.Chamados.Count(x => x.Estado != Fechado), resolvidos.Count,
            PrimeiraResposta(m, criados),
            Media(criados.Where(x => Resolucoes(eventos[x.Id]).Any()).Select(x => Resolucao(x, eventos[x.Id]))),
            Taxa(resolvidos.Count(x => x.Encaminhamentos == 0), resolvidos.Count),
            Taxa(resolvidos.Count(x => x.Reaberturas >= 1), resolvidos.Count),
            new PrincipaisCategorias(m.CategoriasDasConversas is { } citadas ? Ordenar(citadas, m.Categorias) : null, Ordenar(criados.Select(x => x.CategoriaOriginalId), m.Categorias)),
            Taxa(conversas.Count(x => x.Desfecho == Desfechos.Resolvida) + criados.Count(ConfirmadoSemReabertura), conversas.Count(x => x.Desfecho != null)));
    }

    record IndicadoresDeConversa(int? AlunosAtivos, int? Total, double? Autoatendimento, double? Escalonamento, double? Abandono, double? SemArtigo);

    static IndicadoresDeConversa DeConversa(List<ConversaLida>? lidas)
    {
        var conversas = lidas ?? [];
        var comDesfecho = conversas.Count(c => c.Desfecho != null);
        double? Desfecho(string d) => Taxa(conversas.Count(c => c.Desfecho == d), comDesfecho);
        return new(lidas?.Select(c => c.AlunoId).Distinct().Count(), lidas?.Count,
            Desfecho(Desfechos.Resolvida), Desfecho(Desfechos.Transferida), Desfecho(Desfechos.Abandonada), Taxa(conversas.Count(c => c.SemBase), conversas.Count));
    }

    static bool ConfirmadoSemReabertura(ChamadoLido c) =>
        c.Estado == Fechado && c.MotivoFechamento is MotivosFechamento.Confirmado or MotivosFechamento.FechadoAutomaticamente && c.Reaberturas == 0;

    static IEnumerable<EventoChamado> Resolucoes(IEnumerable<EventoChamado> eventos) =>
        eventos.Where(e => e.Tipo == TiposEvento.Transicao && e.Para == Resolvido);

    static TimeSpan Resolucao(ChamadoLido c, IEnumerable<EventoChamado> eventos)
    {
        var fimResolucao = Resolucoes(eventos).Last().CriadoEm;
        var aguardando = TimeSpan.Zero;
        DateTime? desde = null;
        foreach (var e in eventos.Where(e => e.Tipo == TiposEvento.Transicao && e.CriadoEm <= fimResolucao))
        {
            if (e.Para == AguardandoAluno) desde = e.CriadoEm;
            else if (e.De == AguardandoAluno && desde is not null) { aguardando += e.CriadoEm - desde.Value; desde = null; }
        }
        return fimResolucao - c.CriadoEm - aguardando;
    }

    static double? PrimeiraResposta(Massa m, List<ChamadoLido> criados)
    {
        var solicitante = m.Chamados.ToDictionary(c => c.Id, c => c.SolicitanteId);
        var primeira = m.Respostas.Where(r => solicitante.TryGetValue(r.ChamadoId, out var s) && r.AutorId != s)
            .GroupBy(r => r.ChamadoId).ToDictionary(g => g.Key, g => g.Min(r => r.CriadaEm));
        return Media(criados.Where(c => primeira.ContainsKey(c.Id)).Select(c => primeira[c.Id] - c.CriadoEm));
    }

    static List<Ranking> Ordenar(IEnumerable<long> categoriaIds, Dictionary<long, string> categorias) =>
        categoriaIds.GroupBy(x => x).OrderByDescending(g => g.Count()).ThenBy(g => categorias[g.Key])
            .Take(5).Select(g => new Ranking(categorias[g.Key], g.Count())).ToList();
}
