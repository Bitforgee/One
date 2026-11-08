using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Administracao.Shared;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record ListarFluxos : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) => g.MapGet("/fluxos", (IMediator m) => m.Send(new ListarFluxos()));
}

public sealed class ListarFluxosHandler(OneDb db) : IRequestHandler<ListarFluxos, IResult>
{
    public async ValueTask<IResult> Handle(ListarFluxos m, CancellationToken ct) =>
        Results.Ok((await db.Fluxos.Include(f => f.Versoes).ThenInclude(v => v.Etapas).OrderBy(f => f.Id).ToListAsync()).Select(FluxoResposta.De));
}
