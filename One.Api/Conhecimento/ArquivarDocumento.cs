using Mediator;
using One.Api.Dados;
using static One.Api.Conhecimento.DocumentoComVersoes;

namespace One.Api.Conhecimento;

public sealed record ArquivarDocumento(long Id) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/documentos/{id:long}/arquivar", (long id, IMediator m) => m.Send(new ArquivarDocumento(id)));
}

public sealed class ArquivarDocumentoHandler(OneDb db) : IRequestHandler<ArquivarDocumento, IResult>
{
    public async ValueTask<IResult> Handle(ArquivarDocumento m, CancellationToken ct)
    {
        var d = await Ler(db, m.Id);
        if (d is null) return Problemas.Erro(404, "Documento não encontrado.");
        if (d.Arquivar() is { } recusa) return Problemas.Erro(409, recusa.Motivo);
        await db.SaveChangesAsync();
        return Results.Ok(await DocumentoResposta.De(db, d));
    }
}
