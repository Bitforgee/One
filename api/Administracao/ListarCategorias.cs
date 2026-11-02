using Mediator;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record ListarCategorias : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) => g.MapGet("/categorias", (IMediator m) => m.Send(new ListarCategorias()));
}

public sealed class ListarCategoriasHandler(OneDb db) : IRequestHandler<ListarCategorias, IResult>
{
    public async ValueTask<IResult> Handle(ListarCategorias m, CancellationToken ct) => await CadastroRotas.Listar<Categoria>(db, CriarCategoria.Saida);
}
