using Mediator;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record AlterarCategoria(long Id, CategoriaIn Corpo) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPut("/categorias/{id:long}", (long id, CategoriaIn i, IMediator m) => m.Send(new AlterarCategoria(id, i)));
}

public sealed class AlterarCategoriaHandler(OneDb db) : IRequestHandler<AlterarCategoria, IResult>
{
    public async ValueTask<IResult> Handle(AlterarCategoria m, CancellationToken ct) =>
        await CadastroRotas.Alterar<Categoria, CategoriaIn>(db, m.Id, m.Corpo, CriarCategoria.Saida, CriarCategoria.Validar, CriarCategoria.Aplicar);
}
