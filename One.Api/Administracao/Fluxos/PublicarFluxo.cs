using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao.Fluxos;

public sealed record PublicarFluxo(long Id) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/fluxos/{id:long}/publicar", (long id, IMediator m) => m.Send(new PublicarFluxo(id)));
}

public sealed class PublicarFluxoHandler(OneDb db, TimeProvider relogio) : IRequestHandler<PublicarFluxo, IResult>
{
    public async ValueTask<IResult> Handle(PublicarFluxo m, CancellationToken ct)
    {
        var fluxo = await db.Fluxos.Include(f => f.Versoes).ThenInclude(v => v.Etapas).FirstOrDefaultAsync(f => f.Id == m.Id);
        if (fluxo is null) return ErrosDeAdmin.NaoEncontrado();
        if (fluxo.Publicar(relogio.GetUtcNow().UtcDateTime) is { } recusa) return Problemas.Erro(409, recusa.Motivo);
        await db.SaveChangesAsync();
        return Results.Created($"/api/admin/fluxos/{fluxo.Id}", FluxoResposta.VersaoResposta.De(fluxo.Vigente));
    }
}
