using Mediator;
using One.Api.Administracao.Shared;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record AlterarCategoria(long Id, AlterarCategoria.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(string? Nome, bool? Ativa);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPut("/categorias/{id:long}", (long id, AlterarCategoria.Entrada i, IMediator m) => m.Send(new AlterarCategoria(id, i)));
}

public sealed class AlterarCategoriaHandler(OneDb db) : IRequestHandler<AlterarCategoria, IResult>
{
    public async ValueTask<IResult> Handle(AlterarCategoria m, CancellationToken ct)
    {
        var e = m.Corpo;
        return await CadastroRotas.Alterar<Categoria, CategoriaResposta>(db, m.Id, a => CriarCategoria.Validar(db, e.Nome, e.Ativa, a), s => CriarCategoria.Aplicar(s, e.Nome, e.Ativa), CategoriaResposta.De);
    }
}
