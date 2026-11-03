using Mediator;
using One.Api.Conhecimento.Shared;
using One.Api.Dados;
using static One.Api.Conhecimento.ArtigoRotas;

namespace One.Api.Conhecimento;

public sealed record CriarArtigo(CriarArtigo.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(string? Titulo, string[]? Perguntas, long? CategoriaId, string? Resposta, string[]? Links, DateOnly? VisivelDe = null, DateOnly? VisivelAte = null);

    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/artigos", (CriarArtigo.Entrada i, IMediator m) => m.Send(new CriarArtigo(i)));
}

public sealed class CriarArtigoHandler(OneDb db, TimeProvider relogio) : IRequestHandler<CriarArtigo, IResult>
{
    public async ValueTask<IResult> Handle(CriarArtigo m, CancellationToken ct)
    {
        var i = m.Corpo;
        if (await Validar(db, i.Titulo, i.Perguntas, i.CategoriaId, i.Resposta, i.Links, i.VisivelDe, i.VisivelAte) is { } erro) return erro;
        var a = Artigo.Criar(i.CategoriaId!.Value, i.VisivelDe, i.VisivelAte, Versao(i.Titulo, i.Perguntas, i.Resposta, i.Links, 1, relogio.GetUtcNow().UtcDateTime));
        db.Artigos.Add(a);
        await db.SaveChangesAsync();
        return Results.Created($"/api/admin/artigos/{a.Id}", await ArtigoResposta.De(db, a));
    }
}
