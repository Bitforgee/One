using Mediator;
using One.Api.Dados;
using static One.Api.Conhecimento.DocumentoRotas;

namespace One.Api.Conhecimento;

public sealed record NovaVersaoDocumento(long Id, IFormCollection Form) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/documentos/{id:long}/versoes", async (long id, HttpRequest req, IMediator m) =>
            await m.Send(new NovaVersaoDocumento(id, req.HasFormContentType ? await req.ReadFormAsync() : FormCollection.Empty)));
}

public sealed class NovaVersaoDocumentoHandler(OneDb db, TimeProvider relogio) : IRequestHandler<NovaVersaoDocumento, IResult>
{
    public async ValueTask<IResult> Handle(NovaVersaoDocumento m, CancellationToken ct)
    {
        var d = await Ler(db, m.Id);
        if (d is null) return Problemas.Erro(404, "Documento não encontrado.");
        var (pdf, erro) = await LerPdf(m.Form.Files["arquivo"]);
        if (erro is not null) return erro;
        if (d.Estado == EstadosDocumento.Arquivado) return Problemas.Erro(409, "O documento está arquivado.");

        d.Versoes.Add(Versao(db, pdf!, d.Ultima().Numero + 1, relogio.GetUtcNow().UtcDateTime));
        await db.SaveChangesAsync();
        return Results.Created($"/api/admin/documentos/{d.Id}", await Saida(db, await Ler(db, m.Id) ?? d));
    }
}
