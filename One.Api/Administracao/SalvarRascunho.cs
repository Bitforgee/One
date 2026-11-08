using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Administracao.Shared;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record SalvarRascunho(long Id, SalvarRascunho.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(List<EtapaEntrada>? Etapas);

    public sealed record EtapaEntrada(string? Destino, long? SetorId, int? PrazoHoras, double? X, double? Y);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPut("/fluxos/{id:long}/rascunho", (long id, SalvarRascunho.Entrada i, IMediator m) => m.Send(new SalvarRascunho(id, i)));

    public static IResult? Validar(List<EtapaEntrada>? etapas, HashSet<long> setoresValidos)
    {
        if (etapas is null || etapas.Count is < 1 or > 5) return Problemas.Invalido("O fluxo precisa de 1 a 5 etapas.", "etapas");
        return etapas.Select((e, i) => ErroDaEtapa(e, i, etapas.Count, setoresValidos)).FirstOrDefault(erro => erro is not null);
    }

    static IResult? ErroDaEtapa(EtapaEntrada e, int indice, int total, HashSet<long> setoresValidos) =>
        ErroDoDestino(e, indice, total) ?? ErroDoSetor(e, setoresValidos) ?? ErroDoPrazo(e, indice, total) ?? ErroDaPosicao(e);

    static IResult? ErroDoDestino(EtapaEntrada e, int indice, int total)
    {
        if (e.Destino is null || !DestinosEtapa.Todos.Contains(e.Destino)) return Problemas.Invalido("O destino deve ser SETOR, COORDENACAO_CURSO ou LIDERANCA_SEMESTRE.", "destino");
        var lideranca = e.Destino == DestinosEtapa.LiderancaSemestre;
        return lideranca && (indice != 0 || indice == total - 1) ? Problemas.Invalido("A liderança do semestre só pode ser a primeira etapa e nunca a última.", "destino") : null;
    }

    static IResult? ErroDoSetor(EtapaEntrada e, HashSet<long> setoresValidos)
    {
        if (e.Destino == DestinosEtapa.Setor)
            return e.SetorId is { } id && setoresValidos.Contains(id) ? null : Problemas.Invalido("Escolha um setor ativo da instituição.", "setorId");
        return e.SetorId is null ? null : Problemas.Invalido("Só a etapa de setor leva um setor.", "setorId");
    }

    static IResult? ErroDoPrazo(EtapaEntrada e, int indice, int total) =>
        e.PrazoHoras is { } horas && (horas is < 1 or > 720 || indice == total - 1)
            ? Problemas.Invalido("O prazo vai de 1 a 720 horas e não vale na última etapa.", "prazoHoras")
            : null;

    static IResult? ErroDaPosicao(EtapaEntrada e) =>
        (e.X is null) != (e.Y is null) ? Problemas.Invalido("Informe x e y juntos.", "etapas") : null;
}

public sealed class SalvarRascunhoHandler(OneDb db) : IRequestHandler<SalvarRascunho, IResult>
{
    public async ValueTask<IResult> Handle(SalvarRascunho m, CancellationToken ct)
    {
        var fluxo = await db.Fluxos.Include(f => f.Versoes).ThenInclude(v => v.Etapas).FirstOrDefaultAsync(f => f.Id == m.Id);
        if (fluxo is null) return AdminRotas.NaoEncontrado();
        var etapas = m.Corpo.Etapas;
        var pedidos = (etapas ?? []).Where(e => e.Destino == DestinosEtapa.Setor && e.SetorId is not null).Select(e => e.SetorId!.Value).ToList();
        var ativos = (await db.Setores.Where(s => s.Ativo && pedidos.Contains(s.Id)).Select(s => s.Id).ToListAsync()).ToHashSet();
        if (SalvarRascunho.Validar(etapas, ativos) is { } erro) return erro;
        fluxo.SalvarRascunho(etapas!.Select(e => new EtapaFluxo.Dados(e.Destino!, e.SetorId, e.PrazoHoras, e.X, e.Y)));
        await db.SaveChangesAsync();
        return Results.Ok(FluxoResposta.VersaoResposta.De(fluxo.Rascunho));
    }
}
