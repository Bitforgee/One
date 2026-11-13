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
}

public sealed class SalvarRascunhoHandler(OneDb db) : IRequestHandler<SalvarRascunho, IResult>
{
    public async ValueTask<IResult> Handle(SalvarRascunho m, CancellationToken ct)
    {
        var fluxo = await db.Fluxos.Include(f => f.Versoes).ThenInclude(v => v.Etapas).FirstOrDefaultAsync(f => f.Id == m.Id);
        if (fluxo is null) return ErrosDeAdmin.NaoEncontrado();
        var etapas = m.Corpo.Etapas?.Select(e => new EtapaFluxo.Dados(e.Destino ?? "", e.SetorId, e.PrazoHoras, e.X, e.Y)).ToList();
        var pedidos = Fluxo.SetoresPedidos(etapas);
        var ativos = (await db.Setores.Where(s => s.Ativo && s.CursoId == null && pedidos.Contains(s.Id)).Select(s => s.Id).ToListAsync()).ToHashSet();
        if (Fluxo.Validar(etapas, ativos) is { } erro) return Problemas.Invalido(erro.Motivo, Campo(erro));
        fluxo.SalvarRascunho(etapas!);
        await db.SaveChangesAsync();
        return Results.Ok(FluxoResposta.VersaoResposta.De(fluxo.Rascunho));
    }

    static string Campo(Invalido erro) => erro.Motivo switch
    {
        Fluxo.MotivoDestino or Fluxo.MotivoLideranca => "destino",
        Fluxo.MotivoSetorAtivo or Fluxo.MotivoSetorSoDeSetor => "setorId",
        Fluxo.MotivoPrazo => "prazoHoras",
        _ => "etapas",
    };
}
