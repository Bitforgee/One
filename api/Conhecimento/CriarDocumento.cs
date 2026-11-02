using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using static One.Api.Conhecimento.DocumentoRotas;

namespace One.Api.Conhecimento;

// door 6: o formulário é lido no lambda, sem ligar IFormFile (que exigiria o antiforgery)
public sealed record CriarDocumento(IFormCollection Form) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/documentos", async (HttpRequest req, IMediator m) =>
            await m.Send(new CriarDocumento(req.HasFormContentType ? await req.ReadFormAsync() : FormCollection.Empty)));
}

public sealed class CriarDocumentoHandler(OneDb db, TimeProvider relogio) : IRequestHandler<CriarDocumento, IResult>
{
    public async ValueTask<IResult> Handle(CriarDocumento m, CancellationToken ct)
    {
        var form = m.Form;
        var titulo = form["titulo"].ToString();
        if (string.IsNullOrWhiteSpace(titulo) || titulo.Length > 200) return Problemas.Invalido("Informe o título, com até 200 caracteres.", "titulo");
        if (!long.TryParse(form["categoriaId"], out var categoriaId) || !await db.Categorias.AnyAsync(c => c.Id == categoriaId && c.Ativa))
            return Problemas.Invalido("Escolha uma categoria ativa.", "categoriaId");
        var (pdf, erro) = await LerPdf(form.Files["arquivo"]);
        if (erro is not null) return erro;

        var d = new Documento { Titulo = titulo, CategoriaId = categoriaId };
        d.Versoes.Add(Versao(db, pdf!, 1, relogio.GetUtcNow().UtcDateTime));
        db.Documentos.Add(d);
        await db.SaveChangesAsync();
        return Results.Created($"/api/admin/documentos/{d.Id}", await Saida(db, d));
    }
}
