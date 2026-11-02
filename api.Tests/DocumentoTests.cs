using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using One.Api.Dados;
using One.Api.Conhecimento;
using One.Api.Tests.Infra;
using UglyToad.PdfPig.Content;
using UglyToad.PdfPig.Core;
using UglyToad.PdfPig.Fonts.Standard14Fonts;
using UglyToad.PdfPig.Writer;

namespace One.Api.Tests;

public static class Pdfs
{
    // PDF com uma página por texto; um texto vazio vira uma página sem texto. A fonte padrão do PdfPig não escreve todo acento, então os textos são ASCII.
    public static byte[] Criar(params string[] paginas)
    {
        var b = new PdfDocumentBuilder();
        var fonte = b.AddStandard14Font(Standard14Font.Helvetica);
        foreach (var texto in paginas)
        {
            var p = b.AddPage(PageSize.A4);
            if (texto != "") p.AddText(texto, 10, new PdfPoint(25, 700), fonte);
        }
        return b.Build();
    }

    // Completa até o tamanho exato com um comentário depois do fim e repete o startxref, como numa atualização incremental.
    public static byte[] ComTamanho(byte[] pdf, int tamanho)
    {
        var texto = Encoding.Latin1.GetString(pdf);
        var cauda = Encoding.Latin1.GetBytes("\n" + texto[texto.LastIndexOf("startxref", StringComparison.Ordinal)..]);
        var preenchimento = tamanho - pdf.Length - cauda.Length - 2;
        var resultado = new byte[tamanho];
        pdf.CopyTo(resultado, 0);
        resultado[pdf.Length] = (byte)'\n';
        resultado[pdf.Length + 1] = (byte)'%';
        Array.Fill(resultado, (byte)'x', pdf.Length + 2, preenchimento);
        cauda.CopyTo(resultado, tamanho - cauda.Length);
        return resultado;
    }

    public static Task<HttpResponseMessage> Subir(this HttpClient admin, string? titulo, long? categoriaId, byte[]? arquivo, string nome = "regulamento.pdf")
    {
        var form = new MultipartFormDataContent();
        if (titulo is not null) form.Add(new StringContent(titulo), "titulo");
        if (categoriaId is not null) form.Add(new StringContent(categoriaId.Value.ToString()), "categoriaId");
        if (arquivo is not null) form.Add(new ByteArrayContent(arquivo), "arquivo", nome);
        return admin.PostAsync("/api/admin/documentos", form);
    }

    public static Task<HttpResponseMessage> NovaVersao(this HttpClient admin, long id, byte[] arquivo)
    {
        var form = new MultipartFormDataContent { { new ByteArrayContent(arquivo), "arquivo", "regulamento-v2.pdf" } };
        return admin.PostAsync($"/api/admin/documentos/{id}/versoes", form);
    }
}

// RAG C27: a divisão do texto do documento, na própria camada.
public class DivisaoTests
{
    [Fact]
    public void Trechos_de_ate_1500_com_sobreposicao()
    {
        Assert.Single(DocumentoRotas.Dividir(new string('a', 1500)));
        Assert.Equal(2, DocumentoRotas.Dividir(new string('a', 1501)).Count);

        // sem parágrafo nem frase: corta no limite e repete os últimos 200
        var corrido = string.Concat(Enumerable.Range(0, 400).Select(i => (char)('a' + i % 26)));
        corrido = string.Concat(Enumerable.Repeat(corrido, 8)); // 3200 caracteres
        var t = DocumentoRotas.Dividir(corrido);
        Assert.All(t, x => Assert.True(x.Length <= 1500));
        Assert.Equal(1500, t[0].Length);
        for (var i = 1; i < t.Count; i++) Assert.StartsWith(t[i - 1][^200..], t[i]);

        // com parágrafo antes do limite: corta no fim do parágrafo
        var paragrafos = new string('p', 900) + "\n\n" + new string('q', 900);
        var p = DocumentoRotas.Dividir(paragrafos);
        Assert.Equal(new string('p', 900) + "\n\n", p[0]);
        Assert.StartsWith(p[0][^200..], p[1]);

        // sem parágrafo, com frase antes do limite: corta no fim da frase
        var frases = new string('f', 1000) + ". " + new string('g', 900);
        var f = DocumentoRotas.Dividir(frases);
        Assert.Equal(new string('f', 1000) + ".", f[0]);
        Assert.StartsWith(f[0][^200..], f[1]);
        Assert.EndsWith(new string('g', 900), f[^1]);

        // parágrafo ou frase dentro dos primeiros 200 caracteres não serve de corte (o trecho seguinte voltaria para antes do começo)
        Assert.Equal(1500, DocumentoRotas.Dividir(new string('a', 100) + "\n\n" + new string('b', 1600))[0].Length);
        Assert.Equal(1500, DocumentoRotas.Dividir(new string('a', 100) + ". " + new string('b', 1600))[0].Length);
    }
}

public class DocumentoTests(OneFactory f) : IClassFixture<OneFactory>
{
    const string Estagio = "A carga horaria minima do estagio supervisionado e de 300 horas, cumpridas no setimo semestre.";
    const string TrechoEstagio = "carga horaria minima do estagio supervisionado e de 300 horas";

    Agendador Agendador => f.Services.GetRequiredService<Agendador>();

    record Mundo(Instituicao I, HttpClient Admin, long Categoria);

    async Task<Mundo> Criar()
    {
        var (i, admin) = await Admin.Criar(f);
        return new Mundo(i, admin, (await f.Categoria(i, "Estágio")).Id);
    }

    static async Task<long> Id(HttpResponseMessage r) => (await r.Json()).GetProperty("id").GetInt64();

    Task<List<long>> TrechosDaVersao(Instituicao i, long documentoId, int numero) =>
        f.Db(i.Id, db => db.TrechosFonte.Where(t => t.VersaoDocumento!.DocumentoId == documentoId && t.VersaoDocumento.Numero == numero).OrderBy(t => t.Ordem).Select(t => t.Id).ToListAsync());

    static List<long> IdsDasFontes(JsonElement corpoChat) =>
        JsonDocument.Parse(corpoChat.GetProperty("messages")[1].GetProperty("content").GetString()!["Fontes (JSON):\n".Length..]).RootElement
            .EnumerateArray().Select(x => x.GetProperty("id").GetInt64()).ToList();

    static object Cita(long trecho, string texto, string trechoCopiado) =>
        new { tipo = "resposta", texto, fonteIds = new[] { trecho }, trechos = new[] { new { fonteId = trecho, texto = trechoCopiado } } };

    // C26
    [Fact]
    public async Task Subir_pdf_201()
    {
        var m = await Criar();

        var r = await m.Admin.Subir("Regulamento de estágio", m.Categoria, Pdfs.Criar(Estagio, "Segunda pagina do regulamento."));

        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var j = await r.Json();
        Assert.Equal(("ATIVO", 1, 2), (j.GetProperty("estado").GetString(), j.GetProperty("versao").GetProperty("numero").GetInt32(), j.GetProperty("versao").GetProperty("paginas").GetInt32()));
        var id = j.GetProperty("id").GetInt64();
        var versao = await f.Db(m.I.Id, db => db.VersoesDocumento.SingleAsync(v => v.DocumentoId == id));
        Assert.Contains(Estagio, versao.Texto);
        Assert.Contains("Segunda pagina do regulamento.", versao.Texto);
        var trechos = await f.Db(m.I.Id, db => db.TrechosFonte.Where(t => t.VersaoDocumentoId == versao.Id).ToListAsync());
        Assert.NotEmpty(trechos);
        Assert.All(trechos, t => Assert.Null(t.Embedding));

        // mesma transação: se gravar um trecho falha, nem o documento nem a versão ficam
        Task<(int, int, int)> Linhas() => f.Db(m.I.Id, async db => (await db.Documentos.CountAsync(), await db.VersoesDocumento.CountAsync(), await db.TrechosFonte.CountAsync()));
        await f.Db(m.I.Id, db => db.Database.ExecuteSqlRawAsync("""
            CREATE FUNCTION falha_de_teste() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN IF NEW.texto LIKE '%FALHADETESTE%' THEN RAISE EXCEPTION 'falha de teste'; END IF; RETURN NEW; END $$;
            CREATE TRIGGER falha_de_teste BEFORE INSERT ON trecho_fonte FOR EACH ROW EXECUTE FUNCTION falha_de_teste();
            """));
        try
        {
            var antes = await Linhas();
            var falha = await m.Admin.Subir("Falha", m.Categoria, Pdfs.Criar("Texto FALHADETESTE do regulamento."));
            Assert.Equal(HttpStatusCode.InternalServerError, falha.StatusCode);
            Assert.Equal(antes, await Linhas());
        }
        finally
        {
            await f.Db(m.I.Id, db => db.Database.ExecuteSqlRawAsync("DROP TRIGGER falha_de_teste ON trecho_fonte; DROP FUNCTION falha_de_teste();"));
        }
    }

    // C28
    [Fact]
    public async Task Recusas_do_upload()
    {
        var m = await Criar();
        var inativa = await f.Categoria(m.I, "Antiga", ativa: false);
        var deOutra = await f.Categoria(await f.Instituicao(), "De outra");
        var valido = Pdfs.Criar(Estagio);
        var existente = await Id(await m.Admin.Subir("Existente", m.Categoria, valido));
        var antes = await f.Db(m.I.Id, async db => (await db.Documentos.CountAsync(), await db.VersoesDocumento.CountAsync(), await db.TrechosFonte.CountAsync()));

        var recusas = new (string caso, HttpStatusCode esperado, Func<Task<HttpResponseMessage>> pedir)[]
        {
            ("sem %PDF", HttpStatusCode.UnsupportedMediaType, () => m.Admin.Subir("Doc", m.Categoria, Encoding.UTF8.GetBytes("não é pdf"))),
            ("20 MB + 1", HttpStatusCode.RequestEntityTooLarge, () => m.Admin.Subir("Doc", m.Categoria, Pdfs.ComTamanho(valido, 20 * 1024 * 1024 + 1))),
            ("sem texto", HttpStatusCode.BadRequest, () => m.Admin.Subir("Doc", m.Categoria, Pdfs.Criar(""))),
            ("sem título", HttpStatusCode.BadRequest, () => m.Admin.Subir(" ", m.Categoria, valido)),
            ("categoria inativa", HttpStatusCode.BadRequest, () => m.Admin.Subir("Doc", inativa.Id, valido)),
            ("categoria inexistente", HttpStatusCode.BadRequest, () => m.Admin.Subir("Doc", 999999, valido)),
            ("categoria de outra instituição", HttpStatusCode.BadRequest, () => m.Admin.Subir("Doc", deOutra.Id, valido)),
            ("versão sem %PDF", HttpStatusCode.UnsupportedMediaType, () => m.Admin.NovaVersao(existente, Encoding.UTF8.GetBytes("não é pdf"))),
            ("versão 20 MB + 1", HttpStatusCode.RequestEntityTooLarge, () => m.Admin.NovaVersao(existente, Pdfs.ComTamanho(valido, 20 * 1024 * 1024 + 1))),
            ("versão sem texto", HttpStatusCode.BadRequest, () => m.Admin.NovaVersao(existente, Pdfs.Criar(""))),
            ("título com 201 caracteres", HttpStatusCode.BadRequest, () => m.Admin.Subir(new string('t', 201), m.Categoria, valido)),
            ("sem categoria", HttpStatusCode.BadRequest, () => m.Admin.Subir("Doc", null, valido)),
            ("categoria não numérica", HttpStatusCode.BadRequest, () => m.Admin.PostAsync("/api/admin/documentos",
                new MultipartFormDataContent { { new StringContent("Doc"), "titulo" }, { new StringContent("abc"), "categoriaId" }, { new ByteArrayContent(valido), "arquivo", "r.pdf" } })),
            ("sem arquivo", HttpStatusCode.BadRequest, () => m.Admin.Subir("Doc", m.Categoria, null)),
            ("versão sem arquivo", HttpStatusCode.BadRequest, () => m.Admin.PostAsync($"/api/admin/documentos/{existente}/versoes", new MultipartFormDataContent { { new StringContent("x"), "outro" } })),
            ("PDF ilegível", HttpStatusCode.BadRequest, () => m.Admin.Subir("Doc", m.Categoria, Encoding.ASCII.GetBytes("%PDF-1.7\nisto não é um pdf de verdade"))),
        };
        foreach (var (caso, esperado, pedir) in recusas)
        {
            var r = await pedir();
            Assert.True(r.StatusCode == esperado, $"{caso}: {(int)r.StatusCode}");
            if (caso.EndsWith("sem texto")) Assert.Equal(DocumentoRotas.SemTexto, (await r.Json()).GetProperty("detail").GetString());
            if (caso == "PDF ilegível") Assert.Equal("Não foi possível ler o PDF.", (await r.Json()).GetProperty("detail").GetString());
            if (caso.Contains("título com")) Assert.Equal("Informe o título, com até 200 caracteres.", (await r.Json()).GetProperty("detail").GetString());
            if (caso.Contains("categoria não") || caso == "sem categoria") Assert.Equal("Escolha uma categoria ativa.", (await r.Json()).GetProperty("detail").GetString());
            if (caso.EndsWith("sem arquivo")) Assert.Equal("Envie o PDF no campo arquivo.", (await r.Json()).GetProperty("detail").GetString());
        }
        Assert.Equal(antes, await f.Db(m.I.Id, async db => (await db.Documentos.CountAsync(), await db.VersoesDocumento.CountAsync(), await db.TrechosFonte.CountAsync())));

        // exatamente 20 MB é aceito
        Assert.Equal(HttpStatusCode.Created, (await m.Admin.Subir("No limite", m.Categoria, Pdfs.ComTamanho(valido, 20 * 1024 * 1024))).StatusCode);
        // título com exatamente 200 caracteres é aceito
        Assert.Equal(HttpStatusCode.Created, (await m.Admin.Subir(new string('t', 200), m.Categoria, valido)).StatusCode);
    }

    // C29
    [Fact]
    public async Task Nova_versao()
    {
        var m = await Criar();
        var aluno = await f.AlunoLogado(m.I);
        var id = await Id(await m.Admin.Subir("Regulamento de estágio", m.Categoria, Pdfs.Criar(Estagio)));
        var v1 = await f.Db(m.I.Id, db => db.VersoesDocumento.Where(v => v.DocumentoId == id).Select(v => v.Id).SingleAsync());

        var r = await m.Admin.NovaVersao(id, Pdfs.Criar("O estagio supervisionado passou a exigir 360 horas a partir de 2027."));

        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        Assert.Equal(2, (await r.Json()).GetProperty("versao").GetProperty("numero").GetInt32());
        Assert.Equal(HttpStatusCode.OK, (await m.Admin.GetAsync($"/api/documentos/versoes/{v1}")).StatusCode);
        await Agendador.Executar();
        await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "quantas horas de estágio supervisionado?" });
        var buscados = IdsDasFontes(f.Llm.UltimoCorpo);
        Assert.Equal(await TrechosDaVersao(m.I, id, 2), buscados.Intersect(await TrechosDaVersao(m.I, id, 2)).ToList());
        Assert.Empty(buscados.Intersect(await TrechosDaVersao(m.I, id, 1)));
    }

    // C30
    [Fact]
    public async Task Arquivar()
    {
        var m = await Criar();
        var aluno = await f.AlunoLogado(m.I);
        var id = await Id(await m.Admin.Subir("Regulamento de estágio", m.Categoria, Pdfs.Criar(Estagio)));
        await Agendador.Executar();
        var trecho = (await TrechosDaVersao(m.I, id, 1)).Single();
        f.Llm.Devolver(Cita(trecho, "O estágio exige 300 horas.", TrechoEstagio));
        var conversa = (await (await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "horas de estágio" })).Json()).GetProperty("conversaId").GetInt64();
        Assert.Contains(trecho, IdsDasFontes(f.Llm.UltimoCorpo));

        var r = await m.Admin.PostAsync($"/api/admin/documentos/{id}/arquivar", null);

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Equal("ARQUIVADO", (await r.Json()).GetProperty("estado").GetString());
        await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "horas de estágio" });
        Assert.DoesNotContain(trecho, IdsDasFontes(f.Llm.UltimoCorpo));
        var j = await (await aluno.Cliente.GetAsync($"/api/conversas/{conversa}")).Json();
        Assert.Equal("O estágio exige 300 horas.", j.GetProperty("mensagens")[1].GetProperty("texto").GetString());
        Assert.Equal(HttpStatusCode.Conflict, (await m.Admin.PostAsync($"/api/admin/documentos/{id}/arquivar", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await m.Admin.NovaVersao(id, Pdfs.Criar(Estagio))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await m.Admin.PostAsync("/api/admin/documentos/999999/arquivar", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await m.Admin.NovaVersao(999999, Pdfs.Criar(Estagio))).StatusCode);
    }

    // Conversa transferida cuja resposta cita um trecho de documento e o trecho de um artigo.
    async Task<(Mundo m, Aluno aluno, Atendente atendente, string numero, long versao, byte[] pdf)> Transferido()
    {
        var m = await Criar();
        var aluno = await f.AlunoLogado(m.I);
        var triagem = await f.Db(m.I.Id, db => db.Setores.SingleAsync(s => s.Triagem));
        var atendente = await f.Atendente(m.I, triagem);
        var artigo = await f.Artigo(m.I, "Estágio obrigatório", "O estágio obrigatório precisa de termo de compromisso assinado.", categoriaId: (await f.Categoria(m.I, "Bolsas")).Id);
        var pdf = Pdfs.Criar(Estagio);
        var id = await Id(await m.Admin.Subir("Regulamento de estágio", m.Categoria, pdf, "regulamento-estagio.pdf"));
        await Agendador.Executar();
        var trecho = (await TrechosDaVersao(m.I, id, 1)).Single();
        f.Llm.Devolver(new
        {
            tipo = "resposta",
            texto = "O estágio exige 300 horas e termo de compromisso.",
            fonteIds = new[] { trecho, Semente.Fonte(artigo.Id) },
            trechos = new[] { new { fonteId = trecho, texto = TrechoEstagio }, new { fonteId = Semente.Fonte(artigo.Id), texto = "precisa de termo de compromisso assinado" } },
        });
        var conversa = (await (await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "estágio supervisionado horas" })).Json()).GetProperty("conversaId").GetInt64();
        var numero = (await (await aluno.Cliente.PostAsJsonAsync($"/api/conversas/{conversa}/transferir", new { })).Json()).GetProperty("numero").GetString()!;
        var versao = await f.Db(m.I.Id, db => db.VersoesDocumento.Where(v => v.DocumentoId == id).Select(v => v.Id).SingleAsync());
        return (m, aluno, atendente, numero, versao, pdf);
    }

    // C31
    [Fact]
    public async Task Fonte_documento_no_detalhe()
    {
        var (m, _, atendente, numero, versao, pdf) = await Transferido();

        var j = await (await atendente.Cliente.GetAsync($"/api/chamados/{numero}")).Json();

        var fontes = j.GetProperty("transcricao")[1].GetProperty("fontes").EnumerateArray().ToList();
        var doc = Assert.Single(fontes, x => x.GetProperty("tipo").GetString() == "DOCUMENTO");
        Assert.Equal(("Regulamento de estágio", 1, versao), (doc.GetProperty("titulo").GetString(), doc.GetProperty("numero").GetInt32(), doc.GetProperty("versaoDocumentoId").GetInt64()));
        Assert.Equal([TrechoEstagio], doc.GetProperty("trechos").EnumerateArray().Select(x => x.GetString()));
        var art = Assert.Single(fontes, x => x.GetProperty("tipo").GetString() == "ARTIGO");
        Assert.Equal(("Estágio obrigatório", 1), (art.GetProperty("titulo").GetString(), art.GetProperty("numero").GetInt32()));

        foreach (var c in new[] { atendente.Cliente, m.Admin })
        {
            var r = await c.GetAsync($"/api/documentos/versoes/{versao}");
            Assert.Equal(HttpStatusCode.OK, r.StatusCode);
            Assert.Equal("application/pdf", r.Content.Headers.ContentType?.MediaType);
            Assert.Equal(pdf, await r.Content.ReadAsByteArrayAsync());
        }
    }

    // C33
    [Fact]
    public async Task Categoria_do_documento_no_chamado()
    {
        var (m, _, _, numero, _, _) = await Transferido();
        // em Transferido a última citação é a do artigo (categoria "Bolsas"), citado depois do documento
        var ch = await f.Db(m.I.Id, async db => { var c = await db.Chamados.SingleAsync(x => x.Numero == numero); return (c.OrigemCategoria, await db.Categorias.Where(k => k.Id == c.CategoriaId).Select(k => k.Nome).SingleAsync()); });
        Assert.Equal(("ARTIGO", "Bolsas"), ch);

        // só o documento citado: categoria do documento
        var aluno = await f.AlunoLogado(m.I);
        var id = await f.Db(m.I.Id, db => db.Documentos.Select(d => d.Id).SingleAsync());
        var trecho = (await TrechosDaVersao(m.I, id, 1)).Single();
        f.Llm.Devolver(Cita(trecho, "O estágio exige 300 horas.", TrechoEstagio));
        var conversa = (await (await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "horas de estágio" })).Json()).GetProperty("conversaId").GetInt64();
        var outro = (await (await aluno.Cliente.PostAsJsonAsync($"/api/conversas/{conversa}/transferir", new { })).Json()).GetProperty("numero").GetString();
        var doDocumento = await f.Db(m.I.Id, async db => { var c = await db.Chamados.SingleAsync(x => x.Numero == outro); return (c.OrigemCategoria, await db.Categorias.Where(k => k.Id == c.CategoriaId).Select(k => k.Nome).SingleAsync()); });
        Assert.Equal(("ARTIGO", "Estágio"), doDocumento);
    }

    // C36
    [Fact]
    public async Task Documento_de_outra_instituicao_404()
    {
        var m = await Criar();
        var id = await Id(await m.Admin.Subir("Regulamento", m.Categoria, Pdfs.Criar(Estagio)));
        var versao = await f.Db(m.I.Id, db => db.VersoesDocumento.Where(v => v.DocumentoId == id).Select(v => v.Id).SingleAsync());
        var (_, demo) = await Admin.Criar(f);

        Assert.Equal(HttpStatusCode.NotFound, (await demo.NovaVersao(id, Pdfs.Criar(Estagio))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await demo.PostAsync($"/api/admin/documentos/{id}/arquivar", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await demo.GetAsync($"/api/documentos/versoes/{versao}")).StatusCode);
        var d = await f.Db(m.I.Id, db => db.Documentos.Include(x => x.Versoes).SingleAsync(x => x.Id == id));
        Assert.Equal(("ATIVO", 1), (d.Estado, d.Versoes.Count));
    }

    // C38
    [Fact]
    public async Task Listar_200()
    {
        var m = await Criar();
        await m.Admin.Subir("Regulamento de estágio", m.Categoria, Pdfs.Criar(Estagio, "pág 2"), "estagio.pdf");
        await m.Admin.Subir("Calendário acadêmico", m.Categoria, Pdfs.Criar("Aulas comecam em 2 de fevereiro."), "calendario.pdf");

        var r = await m.Admin.GetAsync("/api/admin/documentos");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var lista = (await r.Json()).EnumerateArray().ToList();
        Assert.Equal(["Calendário acadêmico", "Regulamento de estágio"], lista.Select(d => d.GetProperty("titulo").GetString()));
        var reg = lista[1];
        Assert.Equal(("Estágio", "ATIVO", "estagio.pdf", 2, "PENDENTE"),
            (reg.GetProperty("categoria").GetString(), reg.GetProperty("estado").GetString(), reg.GetProperty("versao").GetProperty("nomeArquivo").GetString(),
             reg.GetProperty("versao").GetProperty("paginas").GetInt32(), reg.GetProperty("indexacao").GetString()));

        // o calendário desiste depois de 5 tentativas; o regulamento é indexado pelo agendador
        await f.Db(m.I.Id, db => db.TrechosFonte.Where(t => t.VersaoDocumento!.Documento!.Titulo == "Calendário acadêmico").ExecuteUpdateAsync(s => s.SetProperty(t => t.Tentativas, 5)));
        await Agendador.Executar();
        var depois = (await (await m.Admin.GetAsync("/api/admin/documentos")).Json()).EnumerateArray().Select(d => d.GetProperty("indexacao").GetString());
        Assert.Equal(["FALHOU", "INDEXADO"], depois);
    }

    // C44
    [Fact]
    public async Task Erros_em_problem_json()
    {
        var m = await Criar();
        var id = await Id(await m.Admin.Subir("Regulamento", m.Categoria, Pdfs.Criar(Estagio)));
        await m.Admin.PostAsync($"/api/admin/documentos/{id}/arquivar", null);
        var aluno = await f.AlunoLogado(m.I);

        foreach (var (r, detail) in new[]
        {
            (await m.Admin.Subir(null, m.Categoria, Pdfs.Criar(Estagio)), "Informe o título, com até 200 caracteres."),
            (await m.Admin.Subir("Doc", m.Categoria, Pdfs.ComTamanho(Pdfs.Criar(Estagio), 20 * 1024 * 1024 + 1)), "O PDF passa de 20 MB."),
            (await m.Admin.Subir("Doc", m.Categoria, Encoding.UTF8.GetBytes("não é pdf")), "O arquivo não é PDF."),
            (await m.Admin.NovaVersao(999999, Pdfs.Criar(Estagio)), "Documento não encontrado."),
            (await m.Admin.NovaVersao(id, Pdfs.Criar(Estagio)), "O documento está arquivado."),
            (await m.Admin.PostAsync("/api/admin/documentos/999999/arquivar", null), "Documento não encontrado."),
            (await m.Admin.PostAsync($"/api/admin/documentos/{id}/arquivar", null), "O documento já está arquivado."),
            (await aluno.Cliente.GetAsync("/api/admin/documentos"), "Só administradores podem usar esta área."),
            (await aluno.Cliente.GetAsync("/api/documentos/versoes/1"), "Documento não encontrado."),
        })
        {
            Assert.Equal("application/problem+json", r.Content.Headers.ContentType?.MediaType);
            Assert.Equal(detail, (await r.Json()).GetProperty("detail").GetString());
        }
    }

    // C45
    [Fact]
    public async Task Detalhe_com_documento_segue_visibilidade()
    {
        var (m, aluno, _, numero, _, _) = await Transferido();
        var alheio = await f.Atendente(m.I, await f.Setor(m.I, "Financeiro"));

        Assert.Equal(HttpStatusCode.NotFound, (await alheio.Cliente.GetAsync($"/api/chamados/{numero}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await aluno.Cliente.GetAsync($"/api/chamados/{numero}")).StatusCode);
    }
}

// RAG C32: nada do documento chega ao aluno.
public class SigiloRagTests(OneFactory f) : IClassFixture<OneFactory>
{
    [Fact]
    public async Task Aluno_nao_recebe_dado_de_documento()
    {
        var (i, admin) = await Admin.Criar(f);
        var categoria = (await f.Categoria(i, "Estágio")).Id;
        var aluno = await f.AlunoLogado(i);
        const string texto = "A carga horaria minima do estagio supervisionado e de 300 horas, cumpridas no setimo semestre.";
        var id = (await (await admin.Subir("Regulamento secreto de estágio", categoria, Pdfs.Criar(texto), "regulamento-secreto.pdf")).Json()).GetProperty("id").GetInt64();
        await f.Services.GetRequiredService<Agendador>().Executar();
        var (trecho, versao) = await f.Db(i.Id, async db =>
        {
            var t = await db.TrechosFonte.SingleAsync(x => x.VersaoDocumento!.DocumentoId == id);
            return (t.Id, t.VersaoDocumentoId!.Value);
        });
        f.Llm.Devolver(new { tipo = "resposta", texto = "O estágio pede um mínimo de horas no sétimo semestre.", fonteIds = new[] { trecho }, trechos = new[] { new { fonteId = trecho, texto = "carga horaria minima do estagio supervisionado e de 300 horas" } } });

        var primeira = await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "estágio horas" });
        var conversa = (await primeira.Json()).GetProperty("conversaId").GetInt64();
        var seguinte = await aluno.Cliente.PostAsJsonAsync($"/api/conversas/{conversa}/mensagens", new { mensagem = "de novo" });
        var leitura = await aluno.Cliente.GetAsync($"/api/conversas/{conversa}");
        var numero = (await (await aluno.Cliente.PostAsJsonAsync($"/api/conversas/{conversa}/transferir", new { })).Json()).GetProperty("numero").GetString();
        var lista = await aluno.Cliente.GetAsync("/api/chamados?escopo=meus");
        var detalhe = await aluno.Cliente.GetAsync($"/api/chamados/{numero}");

        foreach (var r in new[] { primeira, seguinte, leitura, lista, detalhe })
        {
            Assert.True(r.IsSuccessStatusCode);
            var corpo = await r.Content.ReadAsStringAsync();
            foreach (var proibido in new[] { "Regulamento secreto de estágio", "regulamento-secreto.pdf", "300 horas", "trechoFonteId", "\"trechos\"", "\"fontes\"", "fonteId", "versaoDocumentoId", "documentoId" })
                Assert.DoesNotContain(proibido, corpo, StringComparison.OrdinalIgnoreCase);
        }
        Assert.Equal(HttpStatusCode.NotFound, (await aluno.Cliente.GetAsync($"/api/documentos/versoes/{versao}")).StatusCode);
    }
}
