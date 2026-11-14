using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Conhecimento.Documentos;

public sealed record ListarDocumentos : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) => g.MapGet("/documentos", (IMediator m) => m.Send(new ListarDocumentos()));
}

public sealed class ListarDocumentosHandler(OneDb db) : IRequestHandler<ListarDocumentos, IResult>
{
    public async ValueTask<IResult> Handle(ListarDocumentos m, CancellationToken ct)
    {
        var lista = new List<DocumentoResposta>();
        foreach (var d in await db.Documentos.ComUltimaVersao().OrderBy(d => d.Titulo).ThenBy(d => d.Id).ToListAsync())
            lista.Add(await DocumentoResposta.De(db, d));
        return Results.Ok(lista);
    }
}
