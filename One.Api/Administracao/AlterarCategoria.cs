using Mediator;
using Microsoft.EntityFrameworkCore;
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
        var categoria = await db.Categorias.FirstOrDefaultAsync(c => c.Id == m.Id, ct);
        if (categoria is null) return AdminRotas.NaoEncontrado();
        if (await CriarCategoria.Validar(db, e.Nome, e.Ativa, categoria) is { } erro) return erro;
        categoria.Alterar(e.Nome!, e.Ativa);
        await db.SaveChangesAsync(ct);
        return Results.Ok(CategoriaResposta.De(categoria));
    }
}
