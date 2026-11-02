using Mediator;
using One.Api.Dados;
using static One.Api.Conhecimento.DocumentoRotas;

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
        if (d.Estado == EstadosDocumento.Arquivado) return Problemas.Erro(409, "O documento já está arquivado.");
        d.Estado = EstadosDocumento.Arquivado;
        await db.SaveChangesAsync();
        return Results.Ok(await Saida(db, d));
    }
}
