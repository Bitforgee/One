using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using UglyToad.PdfPig;
using UglyToad.PdfPig.DocumentLayoutAnalysis.TextExtractor;

namespace One.Api.Conhecimento;

// RAG S3, door R4: PDFs da instituição como fonte interna do assistente; nunca aparecem para o aluno (AD-012).
public static class DocumentoRotas
{
    const long MaxPdf = 20 * 1024 * 1024;
    public const string SemTexto = "O PDF não tem texto. Exporte o documento com texto, não digitalizado.";

    // RAG, AC 17: trechos de até 1500 caracteres, cortados no fim de parágrafo (se houver um antes do limite) ou de frase,
    // e o seguinte começa repetindo os últimos 200 caracteres do anterior.
    public static List<string> Dividir(string texto, int maximo = 1500, int sobreposicao = 200)
    {
        texto = texto.Replace("\r\n", "\n").Trim();
        var trechos = new List<string>();
        var inicio = 0;
        while (inicio < texto.Length)
        {
            if (texto.Length - inicio <= maximo) { trechos.Add(texto[inicio..]); break; }
            var janela = texto.Substring(inicio, maximo);
            var corte = janela.LastIndexOf("\n\n", StringComparison.Ordinal) is var p and > 0 && p + 2 > sobreposicao ? p + 2 : -1;
            if (corte < 0)
            {
                var frase = new[] { ". ", "! ", "? ", ".\n", "!\n", "?\n" }.Max(m => janela.LastIndexOf(m, StringComparison.Ordinal));
                corte = frase >= 0 && frase + 1 > sobreposicao ? frase + 1 : maximo;
            }
            trechos.Add(janela[..corte]);
            inicio += corte - sobreposicao;
        }
        return trechos;
    }

    record Pdf(byte[] Conteudo, string Texto, int Paginas, string Nome);

    // AC 18: 413 acima de 20 MB, 415 sem a assinatura %PDF, 400 sem texto extraível
    static async Task<(Pdf?, IResult?)> LerPdf(IFormFile? arquivo)
    {
        if (arquivo is null) return (null, Problemas.Invalido("Envie o PDF no campo arquivo.", "arquivo"));
        var (lido, recusa) = await Arquivos.Ler(arquivo, MaxPdf, [Arquivos.Pdf], "O PDF passa de 20 MB.", "O arquivo não é PDF.");
        if (lido is null) return (null, recusa);
        try
        {
            using var doc = PdfDocument.Open(lido.Bytes);
            var texto = string.Join("\n\n", doc.GetPages().Select(p => ContentOrderTextExtractor.GetText(p))).Trim();
            if (texto.Length == 0) return (null, Problemas.Invalido(SemTexto, "arquivo"));
            return (new Pdf(lido.Bytes, texto, doc.NumberOfPages, lido.Nome), null);
        }
        catch (Exception e) when (e is not OutOfMemoryException)
        {
            return (null, Problemas.Invalido("Não foi possível ler o PDF.", "arquivo"));
        }
    }

    static VersaoDocumento Versao(OneDb db, Pdf pdf, int numero, DateTime agora)
    {
        var v = new VersaoDocumento { Numero = numero, NomeArquivo = pdf.Nome, Conteudo = pdf.Conteudo, Texto = pdf.Texto, Paginas = pdf.Paginas, CriadaEm = agora };
        // AC 16: os trechos pendentes entram na mesma transação; o agendador gera os embeddings
        db.TrechosFonte.AddRange(Dividir(pdf.Texto).Select((t, i) => new TrechoFonte { VersaoDocumento = v, Ordem = i, Texto = t, ProximaTentativa = agora }));
        return v;
    }

    static async Task<object> Saida(OneDb db, Documento d)
    {
        var v = d.Ultima();
        var trechos = await db.TrechosFonte.Where(t => t.VersaoDocumentoId == v.Id).Select(t => new { Indexado = t.Embedding != null, t.Tentativas }).ToListAsync();
        return new
        {
            id = d.Id,
            titulo = d.Titulo,
            categoriaId = d.CategoriaId,
            categoria = await db.Categorias.Where(c => c.Id == d.CategoriaId).Select(c => c.Nome).SingleAsync(),
            estado = d.Estado,
            versao = new { id = v.Id, numero = v.Numero, nomeArquivo = v.NomeArquivo, paginas = v.Paginas, criadaEm = v.CriadaEm },
            indexacao = trechos.All(t => t.Indexado) ? "INDEXADO" : trechos.Any(t => !t.Indexado && t.Tentativas >= 5) ? "FALHOU" : "PENDENTE",
        };
    }

    static Task<Documento?> Ler(OneDb db, long id) =>
        db.Documentos.ComUltimaVersao().FirstOrDefaultAsync(d => d.Id == id);

    public static void MapearAdmin(RouteGroupBuilder admin)
    {
        admin.MapGet("/documentos", async (OneDb db) =>
        {
            var lista = new List<object>();
            foreach (var d in await db.Documentos.ComUltimaVersao().OrderBy(d => d.Titulo).ThenBy(d => d.Id).ToListAsync())
                lista.Add(await Saida(db, d));
            return Results.Ok(lista);
        });

        admin.MapPost("/documentos", async (HttpRequest req, OneDb db, TimeProvider relogio) =>
        {
            var form = req.HasFormContentType ? await req.ReadFormAsync() : FormCollection.Empty;
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
        });

        // AC 19 e AC 20: versão nova só em documento ATIVO; as anteriores ficam guardadas
        admin.MapPost("/documentos/{id:long}/versoes", async (long id, HttpRequest req, OneDb db, TimeProvider relogio) =>
        {
            var d = await Ler(db, id);
            if (d is null) return Problemas.Erro(404, "Documento não encontrado.");
            var form = req.HasFormContentType ? await req.ReadFormAsync() : FormCollection.Empty;
            var (pdf, erro) = await LerPdf(form.Files["arquivo"]);
            if (erro is not null) return erro;
            if (d.Estado == EstadosDocumento.Arquivado) return Problemas.Erro(409, "O documento está arquivado.");

            d.Versoes.Add(Versao(db, pdf!, d.Ultima().Numero + 1, relogio.GetUtcNow().UtcDateTime));
            await db.SaveChangesAsync();
            return Results.Created($"/api/admin/documentos/{d.Id}", await Saida(db, await Ler(db, id) ?? d));
        });

        admin.MapPost("/documentos/{id:long}/arquivar", async (long id, OneDb db) =>
        {
            var d = await Ler(db, id);
            if (d is null) return Problemas.Erro(404, "Documento não encontrado.");
            if (d.Estado == EstadosDocumento.Arquivado) return Problemas.Erro(409, "O documento já está arquivado.");
            d.Estado = EstadosDocumento.Arquivado;
            await db.SaveChangesAsync();
            return Results.Ok(await Saida(db, d));
        });
    }

    // AC 21 e AC 22: só atendente e administrador baixam a versão citada; para os demais ela "não existe"
    public static void Mapear(RouteGroupBuilder api)
    {
        api.MapGet("/documentos/versoes/{id:long}", async (long id, HttpContext ctx, OneDb db) =>
        {
            var u = ctx.Usuario();
            if (!u.Tem(Papeis.Atendente) && !u.Tem(Papeis.Administrador)) return Problemas.Erro(404, "Documento não encontrado.");
            var v = await db.VersoesDocumento.Where(x => x.Id == id).Select(x => new { x.Conteudo, x.NomeArquivo }).FirstOrDefaultAsync();
            return v is null ? Problemas.Erro(404, "Documento não encontrado.") : Results.File(v.Conteudo, "application/pdf", v.NomeArquivo);
        });
    }
}
