using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Administracao.Shared;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record ListarRegras : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) => g.MapGet("/regras", (IMediator m) => m.Send(new ListarRegras()));
}

public sealed class ListarRegrasHandler(OneDb db) : IRequestHandler<ListarRegras, IResult>
{
    public async ValueTask<IResult> Handle(ListarRegras m, CancellationToken ct) =>
        Results.Ok((await db.Regras.OrderBy(r => r.Id).ToListAsync()).Select(RegraResposta.De));
}
