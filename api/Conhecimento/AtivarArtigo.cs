using Mediator;
using One.Api.Conhecimento.Shared;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Conhecimento;

public sealed record AtivarArtigo(long Id) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/artigos/{id:long}/ativar", (long id, IMediator m) => m.Send(new AtivarArtigo(id)));
}

public sealed class AtivarArtigoHandler(OneDb db, TimeProvider relogio) : IRequestHandler<AtivarArtigo, IResult>
{
    public async ValueTask<IResult> Handle(AtivarArtigo m, CancellationToken ct)
    {
        var a = await ArtigoRotas.Ler(db, m.Id);
        if (a is null) return Problemas.Erro(404, "Artigo não encontrado.");
        if (a.Ativar() is { } recusa) return Problemas.Erro(409, recusa.Motivo);
        var atual = a.Ultima();
        // reativar um artigo arquivado reaproveita o trecho que a versão atual já tem
        if (!await db.TrechosFonte.AnyAsync(t => t.VersaoArtigoId == atual.Id))
            db.TrechosFonte.Add(Fontes.DoArtigo(atual, relogio.GetUtcNow().UtcDateTime));
        await db.SaveChangesAsync();
        return Results.Ok(await ArtigoResposta.De(db, a));
    }
}
