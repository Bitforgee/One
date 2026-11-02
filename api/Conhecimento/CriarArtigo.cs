using Mediator;
using One.Api.Dados;
using static One.Api.Conhecimento.ArtigoRotas;

namespace One.Api.Conhecimento;

public sealed record CriarArtigo(ArtigoIn Corpo) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/artigos", (ArtigoIn i, IMediator m) => m.Send(new CriarArtigo(i)));
}

public sealed class CriarArtigoHandler(OneDb db, TimeProvider relogio) : IRequestHandler<CriarArtigo, IResult>
{
    public async ValueTask<IResult> Handle(CriarArtigo m, CancellationToken ct)
    {
        var i = m.Corpo;
        if (await Validar(db, i) is { } erro) return erro;
        var a = new Artigo { CategoriaId = i.CategoriaId!.Value, VisivelDe = i.VisivelDe, VisivelAte = i.VisivelAte, Versoes = [Versao(i, 1, relogio.GetUtcNow().UtcDateTime)] };
        db.Artigos.Add(a);
        await db.SaveChangesAsync();
        return await Responder(db, a, 201);
    }
}
