using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Conhecimento.Artigos;

public sealed record ListarArtigos : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) => g.MapGet("/artigos", (IMediator m) => m.Send(new ListarArtigos()));
}

public sealed class ListarArtigosHandler(OneDb db) : IRequestHandler<ListarArtigos, IResult>
{
    public async ValueTask<IResult> Handle(ListarArtigos m, CancellationToken ct)
    {
        var categorias = await db.Categorias.ToDictionaryAsync(c => c.Id, c => c.Nome);
        var artigos = await db.Artigos.Include(a => a.Versoes).OrderBy(a => a.Id).ToListAsync();
        var indexacao = await BuscarFontes.Indexacao(db, artigos.Select(a => a.UltimaVersao.Id).ToList());
        return Results.Ok(artigos.Select(a => ArtigoResposta.De(a, categorias[a.CategoriaId], indexacao)));
    }
}
