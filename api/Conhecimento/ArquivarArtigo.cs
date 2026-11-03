using Mediator;
using One.Api.Conhecimento.Shared;
using One.Api.Dados;

namespace One.Api.Conhecimento;

public sealed record ArquivarArtigo(long Id) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/artigos/{id:long}/arquivar", (long id, IMediator m) => m.Send(new ArquivarArtigo(id)));
}

public sealed class ArquivarArtigoHandler(OneDb db) : IRequestHandler<ArquivarArtigo, IResult>
{
    public async ValueTask<IResult> Handle(ArquivarArtigo m, CancellationToken ct)
    {
        var a = await ArtigoRotas.Ler(db, m.Id);
        if (a is null) return Problemas.Erro(404, "Artigo não encontrado.");
        if (a.Arquivar() is { } recusa) return Problemas.Erro(409, recusa.Motivo);
        await db.SaveChangesAsync();
        return Results.Ok(await ArtigoResposta.De(db, a));
    }
}
