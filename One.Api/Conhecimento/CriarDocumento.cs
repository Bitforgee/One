using Mediator;
using One.Api.Conhecimento.Shared;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using static One.Api.Conhecimento.DocumentoRotas;

namespace One.Api.Conhecimento;

public sealed record CriarDocumento(IFormCollection Form) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/documentos", async (HttpRequest req, IMediator m) =>
            await m.Send(new CriarDocumento(req.HasFormContentType ? await req.ReadFormAsync() : FormCollection.Empty)));
}

public sealed class CriarDocumentoHandler(OneDb db, TimeProvider relogio, Armazenamento armazenamento) : IRequestHandler<CriarDocumento, IResult>
{
    public async ValueTask<IResult> Handle(CriarDocumento m, CancellationToken ct)
    {
        var form = m.Form;
        var titulo = form["titulo"].ToString();
        if (!TituloDeConhecimento.Valido(titulo)) return Problemas.Invalido(TituloDeConhecimento.Recusa, "titulo");
        if (!long.TryParse(form["categoriaId"], out var categoriaId) || !await db.Categorias.AnyAsync(c => c.Id == categoriaId && c.Ativa))
            return Problemas.Invalido("Escolha uma categoria ativa.", "categoriaId");
        var (pdf, erro) = await LeitorDePdf.Ler(form.Files["arquivo"]);
        if (erro is not null) return erro;

        var agora = relogio.GetUtcNow().UtcDateTime;
        var primeira = Versao(db.InstituicaoAtual!.Value, pdf!, 1, agora);
        await armazenamento.Gravar(primeira.Chave, pdf!.Conteudo);
        var d = Documento.Criar(titulo, categoriaId, primeira);
        Trechos(db, d.Versoes.Single(), agora);
        db.Documentos.Add(d);
        await db.SaveChangesAsync();
        return Results.Created($"/api/admin/documentos/{d.Id}", await DocumentoResposta.De(db, d));
    }
}
