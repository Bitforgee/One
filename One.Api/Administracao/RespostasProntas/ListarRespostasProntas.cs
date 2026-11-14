using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao.RespostasProntas;

public sealed record ListarRespostasProntas : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) => g.MapGet("/respostas-prontas", (IMediator m) => m.Send(new ListarRespostasProntas()));
}

public sealed class ListarRespostasProntasHandler(OneDb db) : IRequestHandler<ListarRespostasProntas, IResult>
{
    public async ValueTask<IResult> Handle(ListarRespostasProntas m, CancellationToken ct) =>
        Results.Ok((await db.RespostasProntas.OrderBy(e => e.Id).ToListAsync(ct)).Select(RespostaProntaResposta.De));
}
