using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record ListarCategorias : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) => g.MapGet("/categorias", (IMediator m) => m.Send(new ListarCategorias()));
}

public sealed class ListarCategoriasHandler(OneDb db) : IRequestHandler<ListarCategorias, IResult>
{
    public async ValueTask<IResult> Handle(ListarCategorias m, CancellationToken ct) =>
        Results.Ok((await db.Categorias.OrderBy(e => e.Id).ToListAsync(ct)).Select(CategoriaResposta.De));
}
