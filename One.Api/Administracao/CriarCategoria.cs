using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Administracao.Shared;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record CriarCategoria(CriarCategoria.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(string? Nome, bool? Ativa);

    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/categorias", (CriarCategoria.Entrada i, IMediator m) => m.Send(new CriarCategoria(i)));
}

public sealed class CriarCategoriaHandler(OneDb db) : IRequestHandler<CriarCategoria, IResult>
{
    public async ValueTask<IResult> Handle(CriarCategoria m, CancellationToken ct)
    {
        var e = m.Corpo;
        if (Categoria.Validar(e.Nome, e.Ativa) is { } invalido) return Problemas.Invalido(invalido.Motivo, "nome");
        if (await db.Categorias.AnyAsync(c => c.Nome == e.Nome, ct)) return ErrosDeAdmin.Repetido("Já existe uma categoria com este nome.");
        var categoria = Categoria.Criar(e.Nome!, e.Ativa);
        db.Categorias.Add(categoria);
        await db.SaveChangesAsync(ct);
        return Results.Created($"/api/admin/categorias/{categoria.Id}", CategoriaResposta.De(categoria));
    }
}
