using System.Text.Json;
using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Instituicoes.Plataforma;

namespace One.Api.Instituicoes.Carga;

public sealed record ImportarCargaInstituicao(string Slug, IFormCollection Form) : IRequest<IResult>
{
    public sealed record Resposta(int Setores, int Cursos, int Categorias, int Regras, int Artigos);

    public const long Limite = 2 * 1024 * 1024;

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/instituicoes/{slug}/carga", async (string slug, HttpRequest req, IMediator m) =>
            await m.Send(new ImportarCargaInstituicao(slug, req.HasFormContentType ? await req.ReadFormAsync() : FormCollection.Empty)));
}

public sealed class ImportarCargaInstituicaoHandler(OneDb db, TimeProvider relogio) : IRequestHandler<ImportarCargaInstituicao, IResult>
{
    static IResult Recusa(IEnumerable<string> erros) =>
        Results.ValidationProblem(new Dictionary<string, string[]> { ["arquivo"] = [.. erros] }, detail: "O arquivo de carga tem erros.", title: Problemas.Titulo(400));

    public async ValueTask<IResult> Handle(ImportarCargaInstituicao m, CancellationToken ct)
    {
        var instituicao = await db.Instituicoes.FirstOrDefaultAsync(i => i.Slug == m.Slug, ct);
        if (instituicao is null) return Problemas.Erro(404, ErrosDaPlataforma.NaoEncontrada);
        if (m.Form.Files["arquivo"] is not { } arquivo) return Problemas.Invalido("Envie o arquivo JSON no campo arquivo.", "arquivo");
        if (arquivo.Length > ImportarCargaInstituicao.Limite) return Problemas.Erro(413, "O arquivo passa de 2 MB.");

        ArquivoCarga? arq;
        try
        {
            await using var corpo = arquivo.OpenReadStream();
            arq = await JsonSerializer.DeserializeAsync<ArquivoCarga>(corpo, JsonSerializerOptions.Web, ct);
        }
        catch (JsonException e) { return Recusa([$"JSON inválido ({e.Message})"]); }
        if (arq is null) return Recusa(["O arquivo está vazio."]);

        db.InstituicaoAtual = instituicao.Id;
        var existentes = await CargaInicial.Existentes(db);
        var (erros, plano) = CargaValidacao.Validar(arq, existentes);
        if (erros.Count > 0) return Recusa(erros);

        var (setores, categorias) = await CargaInicial.Gravar(db, arq, existentes, plano, relogio.GetUtcNow().UtcDateTime);
        return Results.Ok(new ImportarCargaInstituicao.Resposta(setores, plano.Cursos.Count, categorias, plano.Regras.Count, plano.Artigos.Count));
    }
}
