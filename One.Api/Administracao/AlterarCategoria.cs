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
        if (categoria is null) return ErrosDeAdmin.NaoEncontrado();
        if (Categoria.Validar(e.Nome, e.Ativa, categoria) is { } invalido) return Problemas.Invalido(invalido.Motivo, "nome");
        if (await db.Categorias.AnyAsync(c => c.Nome == e.Nome && c.Id != categoria.Id, ct)) return ErrosDeAdmin.Repetido("Já existe uma categoria com este nome.");
        categoria.Alterar(e.Nome!, e.Ativa);
        await db.SaveChangesAsync(ct);
        return Results.Ok(CategoriaResposta.De(categoria));
    }
}
