using Mediator;
using One.Api.Dados;
using static One.Api.Conhecimento.Documentos.DocumentoComVersoes;

namespace One.Api.Conhecimento.Documentos;

public sealed record NovaVersaoDocumento(long Id, IFormCollection Form) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/documentos/{id:long}/versoes", async (long id, HttpRequest req, IMediator m) =>
            await m.Send(new NovaVersaoDocumento(id, req.HasFormContentType ? await req.ReadFormAsync() : FormCollection.Empty)));
}

public sealed class NovaVersaoDocumentoHandler(OneDb db, TimeProvider relogio, Armazenamento armazenamento) : IRequestHandler<NovaVersaoDocumento, IResult>
{
    public async ValueTask<IResult> Handle(NovaVersaoDocumento m, CancellationToken ct)
    {
        var d = await Ler(db, m.Id);
        if (d is null) return Problemas.Erro(404, "Documento não encontrado.");
        var (pdf, erro) = await LeitorDePdf.Ler(m.Form.Files["arquivo"]);
        if (erro is not null) return erro;

        var agora = relogio.GetUtcNow().UtcDateTime;
        var versao = Versao(db.InstituicaoAtual!.Value, pdf!, d.UltimaVersao.Numero + 1, agora);
        if (d.NovaVersao(versao) is { } recusa) return Problemas.Erro(409, recusa.Motivo);
        await armazenamento.Gravar(versao.Chave, pdf!.Conteudo);
        Trechos(db, versao, agora);
        await db.SaveChangesAsync();
        return Results.Created($"/api/admin/documentos/{d.Id}", await DocumentoResposta.De(db, await Ler(db, m.Id) ?? d));
    }
}
