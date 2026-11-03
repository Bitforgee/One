using System.Net;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

// GC.GetTotalAllocatedBytes (C11) conta o processo todo: esta classe roda sozinha, sem outras classes de teste em paralelo.
[CollectionDefinition("Armazenamento", DisableParallelization = true)]
public class ColecaoArmazenamento;

// arquivos-minio: os bytes de anexos e PDFs moram no bucket do MinIO do compose; o banco guarda chave, hash e tamanho.
[Collection("Armazenamento")]
public class ArmazenamentoTests(OneFactory f) : IClassFixture<OneFactory>
{
    static string Sha256(byte[] bytes) => Convert.ToHexStringLower(SHA256.HashData(bytes));

    static async Task<long> IdDoAnexo(HttpResponseMessage r) =>
        (await r.Json()).GetProperty("mensagens").EnumerateArray().Last().GetProperty("anexos")[0].GetProperty("id").GetInt64();

    static async Task<long> IdDoDocumento(HttpResponseMessage r) => (await r.Json()).GetProperty("id").GetInt64();

    async Task<(Balcao b, string numero, byte[] png, long id)> ComAnexo(int tamanho = 5000)
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        var png = Balcao.Arquivo(Balcao.Png, tamanho);
        var r = await Balcao.ComAnexos(b.A.Cliente, numero, "Veja a tela.", "PUBLICA", ("tela.png", png));
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        return (b, numero, png, await IdDoAnexo(r));
    }

    async Task<(Instituicao i, HttpClient admin, long categoria)> Mundo()
    {
        var (i, admin) = await Admin.Criar(f);
        return (i, admin, (await f.Categoria(i, "Estágio")).Id);
    }

    Task<List<VersaoDocumento>> Versoes(Instituicao i, long documentoId) =>
        f.Db(i.Id, db => db.VersoesDocumento.Where(v => v.DocumentoId == documentoId).OrderBy(v => v.Numero).ToListAsync());

    // C1
    [Fact]
    public async Task Anexo_vai_para_o_bucket_com_chave_hash_e_tamanho()
    {
        var antes = await f.Chaves();
        var (b, _, png, id) = await ComAnexo(5000);

        var anexo = await f.Db(b.Instituicao.Id, db => db.Anexos.SingleAsync(x => x.Id == id));
        Assert.Matches($"^{b.Instituicao.Id}/anexos/[0-9a-f]{{32}}$", anexo.Chave);
        Assert.Matches("^[0-9a-f]{64}$", anexo.Hash);
        Assert.Equal(Sha256(png), anexo.Hash);
        Assert.Equal(5000, anexo.Tamanho);
        Assert.Equal(png, await f.Objeto(anexo.Chave));
        Assert.Equal(antes.Append(anexo.Chave).Order(), await f.Chaves());
    }

    // C3
    [Fact]
    public async Task Detalhe_do_chamado_nao_expoe_chave_nem_hash()
    {
        var (b, numero, png, id) = await ComAnexo(5000);
        var detalhe = await b.Detalhe(b.ClienteAluno, numero);
        var anexo = detalhe.GetProperty("mensagens").EnumerateArray().Last().GetProperty("anexos")[0];

        Assert.Equal(["id", "nome", "tipo", "tamanho"], anexo.EnumerateObject().Select(p => p.Name));
        Assert.Equal(id, anexo.GetProperty("id").GetInt64());
        Assert.Equal("tela.png", anexo.GetProperty("nome").GetString());
        Assert.Equal("image/png", anexo.GetProperty("tipo").GetString());
        Assert.Equal(png.Length, anexo.GetProperty("tamanho").GetInt64());
        Assert.DoesNotContain("chave", detalhe.GetRawText(), StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("hash", detalhe.GetRawText(), StringComparison.OrdinalIgnoreCase);
    }

    // C4
    [Fact]
    public async Task Recusa_antes_da_gravacao_nao_deixa_objeto()
    {
        var b = await Balcao.Criar(f);
        var aberto = await b.Chamado();
        var fechado = await b.Chamado(EstadosChamado.Fechado);
        async Task<string> Estado() => string.Join(",", await f.Chaves()) + "|" + await f.Db(b.Instituicao.Id, db => db.Anexos.CountAsync());
        var antes = await Estado();

        var casos = new (string caso, HttpStatusCode esperado, Func<Task<HttpResponseMessage>> pedir)[]
        {
            ("nota com anexo", HttpStatusCode.BadRequest, () => Balcao.ComAnexos(b.A.Cliente, aberto, "Nota", "NOTA", ("a.png", Balcao.Arquivo(Balcao.Png, 100)))),
            ("tipo .exe", HttpStatusCode.UnsupportedMediaType, () => Balcao.ComAnexos(b.ClienteAluno, aberto, "Segue", "PUBLICA", ("a.exe", Balcao.Arquivo(Balcao.Exe, 100)))),
            ("10 MB + 1", HttpStatusCode.RequestEntityTooLarge, () => Balcao.ComAnexos(b.ClienteAluno, aberto, "Segue", "PUBLICA", ("a.png", Balcao.Arquivo(Balcao.Png, 10 * 1024 * 1024 + 1)))),
            ("estado que não aceita", HttpStatusCode.Conflict, () => Balcao.ComAnexos(b.ClienteAluno, fechado, "Segue", "PUBLICA", ("a.png", Balcao.Arquivo(Balcao.Png, 100)))),
        };
        foreach (var (caso, esperado, pedir) in casos)
        {
            var r = await pedir();
            Assert.True(r.StatusCode == esperado, $"{caso}: {(int)r.StatusCode}");
        }
        Assert.Equal(antes, await Estado());
    }

    // C7
    [Fact]
    public async Task Download_do_anexo_devolve_bytes_tipo_nome_e_content_length()
    {
        var (b, _, png, id) = await ComAnexo(5000);

        foreach (var c in new[] { b.ClienteAluno, b.B.Cliente })
        {
            var d = await c.GetAsync($"/api/anexos/{id}");
            Assert.Equal(HttpStatusCode.OK, d.StatusCode);
            Assert.Equal(png, await d.Content.ReadAsByteArrayAsync());
            // valores que o Results.File produzia na base (<base>)
            Assert.Equal("image/png", d.Content.Headers.ContentType?.ToString());
            Assert.Equal("attachment; filename=tela.png; filename*=UTF-8''tela.png", string.Join(",", d.Content.Headers.GetValues("Content-Disposition")));
            Assert.Equal(5000, d.Content.Headers.ContentLength);
            Assert.Equal(await f.Db(b.Instituicao.Id, db => db.Anexos.Where(x => x.Id == id).Select(x => x.Tamanho).SingleAsync()), d.Content.Headers.ContentLength);
        }
    }

    // C8
    [Fact]
    public async Task Download_negado_e_404_sem_abrir_objeto()
    {
        var (b, _, _, id) = await ComAnexo();
        var outraInstituicao = await Balcao.Criar(f);
        var outroAluno = await f.AlunoLogado(b.Instituicao);
        var leiturasAntes = f.LeiturasDeObjeto;

        foreach (var (caso, cliente, alvo) in new[]
        {
            ("inexistente", b.ClienteAluno, 999_999_999L),
            ("de outra instituição", outraInstituicao.A.Cliente, id),
            ("de chamado que o usuário não vê", outroAluno.Cliente, id),
        })
        {
            var r = await cliente.GetAsync($"/api/anexos/{alvo}");
            Assert.True(r.StatusCode == HttpStatusCode.NotFound, $"{caso}: {(int)r.StatusCode}");
            Assert.Equal("Anexo não encontrado.", (await r.Json()).GetProperty("detail").GetString());
        }
        Assert.Equal(leiturasAntes, f.LeiturasDeObjeto);
    }

    // C9
    [Fact]
    public async Task Download_usa_so_a_chave_da_linha()
    {
        var (b, _, png, id) = await ComAnexo();
        var alheio = await ComAnexo(3000);
        var chaveAlheia = await f.Db(alheio.b.Instituicao.Id, db => db.Anexos.Where(x => x.Id == alheio.id).Select(x => x.Chave).SingleAsync());

        var pedido = new HttpRequestMessage(HttpMethod.Get, $"/api/anexos/{id}?chave={Uri.EscapeDataString(chaveAlheia)}&key={Uri.EscapeDataString(chaveAlheia)}");
        pedido.Headers.Add("X-Chave", chaveAlheia);
        var d = await b.ClienteAluno.SendAsync(pedido);

        Assert.Equal(HttpStatusCode.OK, d.StatusCode);
        Assert.Equal(png, await d.Content.ReadAsByteArrayAsync());
    }

    // C10
    [Fact]
    public async Task Download_da_versao_devolve_pdf_e_application_pdf()
    {
        var (i, admin, categoria) = await Mundo();
        var pdf = Pdfs.Criar("Regulamento de estagio supervisionado.");
        var documento = await IdDoDocumento(await admin.Subir("Regulamento", categoria, pdf));
        var versao = (await Versoes(i, documento)).Single();

        var d = await admin.GetAsync($"/api/documentos/versoes/{versao.Id}");
        Assert.Equal(HttpStatusCode.OK, d.StatusCode);
        Assert.Equal(pdf, await d.Content.ReadAsByteArrayAsync());
        Assert.Equal("application/pdf", d.Content.Headers.ContentType?.ToString());
        Assert.Equal("attachment; filename=regulamento.pdf; filename*=UTF-8''regulamento.pdf", string.Join(",", d.Content.Headers.GetValues("Content-Disposition")));
        Assert.Equal(pdf.Length, d.Content.Headers.ContentLength);

        var aluno = await f.AlunoLogado(i);
        var negado = await aluno.Cliente.GetAsync($"/api/documentos/versoes/{versao.Id}");
        Assert.Equal(HttpStatusCode.NotFound, negado.StatusCode);
        Assert.Equal("Documento não encontrado.", (await negado.Json()).GetProperty("detail").GetString());
    }

    // C11
    [Fact]
    public async Task Download_de_10_MiB_nao_aloca_o_array_inteiro()
    {
        const int DezMiB = 10 * 1024 * 1024;
        var (b, _, png, id) = await ComAnexo(DezMiB);
        var buffer = new byte[64 * 1024];

        async Task<long> Baixar()
        {
            using var d = await b.ClienteAluno.GetAsync($"/api/anexos/{id}", HttpCompletionOption.ResponseHeadersRead);
            Assert.Equal(HttpStatusCode.OK, d.StatusCode);
            await using var corpo = await d.Content.ReadAsStreamAsync();
            long lidos = 0;
            int n;
            while ((n = await corpo.ReadAsync(buffer)) > 0) lidos += n;
            return lidos;
        }

        await Baixar(); // aquece o JIT e os pools
        var antes = GC.GetTotalAllocatedBytes(precise: true);
        var lidos = await Baixar();
        var alocado = GC.GetTotalAllocatedBytes(precise: true) - antes;

        Assert.Equal(png.Length, lidos);
        Assert.True(alocado < 5 * 1024 * 1024, $"alocou {alocado} bytes");
    }

    // C12
    [Fact]
    public async Task Pdf_novo_e_nova_versao_vao_para_o_bucket()
    {
        var (i, admin, categoria) = await Mundo();
        var v1 = Pdfs.Criar("Regulamento de estagio supervisionado.");
        var v2 = Pdfs.Criar("Primeira pagina da versao dois.", "Segunda pagina da versao dois.");

        var criado = await admin.Subir("Regulamento", categoria, v1);
        Assert.Equal(HttpStatusCode.Created, criado.StatusCode);
        var documento = await IdDoDocumento(criado);
        Assert.Equal(HttpStatusCode.Created, (await admin.NovaVersao(documento, v2)).StatusCode);

        var versoes = await Versoes(i, documento);
        Assert.Equal(2, versoes.Count);
        foreach (var (versao, bytes, nome, paginas) in new[] { (versoes[0], v1, "regulamento.pdf", 1), (versoes[1], v2, "regulamento-v2.pdf", 2) })
        {
            Assert.Matches($"^{i.Id}/documentos/[0-9a-f]{{32}}$", versao.Chave);
            Assert.Equal(Sha256(bytes), versao.Hash);
            Assert.Equal(bytes.Length, versao.Tamanho);
            Assert.Equal(nome, versao.NomeArquivo);
            Assert.Equal(paginas, versao.Paginas);
            Assert.NotEmpty(versao.Texto);
            Assert.Equal(bytes, await f.Objeto(versao.Chave));
        }
        Assert.Contains("Segunda pagina da versao dois.", versoes[1].Texto);
    }

    // C13
    [Fact]
    public async Task Pdf_recusado_nao_deixa_objeto()
    {
        var (i, admin, categoria) = await Mundo();
        var valido = Pdfs.Criar("Regulamento de estagio supervisionado.");
        var existente = await IdDoDocumento(await admin.Subir("Existente", categoria, valido));
        var ilegivel = Encoding.ASCII.GetBytes("%PDF-1.7\nisto não é um pdf de verdade");
        async Task<string> Estado() =>
            string.Join(",", await f.Chaves()) + "|" + await f.Db(i.Id, db => db.VersoesDocumento.CountAsync()) + await f.Db(i.Id, db => db.Documentos.CountAsync()) + await f.Db(i.Id, db => db.TrechosFonte.CountAsync());
        var antes = await Estado();

        var casos = new (string caso, HttpStatusCode esperado, Func<Task<HttpResponseMessage>> pedir)[]
        {
            ("documentos: 20 MB + 1", HttpStatusCode.RequestEntityTooLarge, () => admin.Subir("Doc", categoria, Pdfs.ComTamanho(valido, 20 * 1024 * 1024 + 1))),
            ("documentos: não é PDF", HttpStatusCode.UnsupportedMediaType, () => admin.Subir("Doc", categoria, Encoding.UTF8.GetBytes("não é pdf"))),
            ("documentos: sem texto", HttpStatusCode.BadRequest, () => admin.Subir("Doc", categoria, Pdfs.Criar(""))),
            ("documentos: ilegível", HttpStatusCode.BadRequest, () => admin.Subir("Doc", categoria, ilegivel)),
            ("versões: 20 MB + 1", HttpStatusCode.RequestEntityTooLarge, () => admin.NovaVersao(existente, Pdfs.ComTamanho(valido, 20 * 1024 * 1024 + 1))),
            ("versões: não é PDF", HttpStatusCode.UnsupportedMediaType, () => admin.NovaVersao(existente, Encoding.UTF8.GetBytes("não é pdf"))),
            ("versões: sem texto", HttpStatusCode.BadRequest, () => admin.NovaVersao(existente, Pdfs.Criar(""))),
            ("versões: ilegível", HttpStatusCode.BadRequest, () => admin.NovaVersao(existente, ilegivel)),
        };
        foreach (var (caso, esperado, pedir) in casos)
        {
            var r = await pedir();
            Assert.True(r.StatusCode == esperado, $"{caso}: {(int)r.StatusCode}");
        }
        Assert.Equal(antes, await Estado());
    }

    // C14
    [Fact]
    public async Task Nova_versao_mantem_o_objeto_anterior()
    {
        var (i, admin, categoria) = await Mundo();
        var v1 = Pdfs.Criar("Texto da versao um do regulamento.");
        var v2 = Pdfs.Criar("Texto da versao dois do regulamento.");
        var documento = await IdDoDocumento(await admin.Subir("Regulamento", categoria, v1));
        var primeira = (await Versoes(i, documento)).Single();

        Assert.Equal(HttpStatusCode.Created, (await admin.NovaVersao(documento, v2)).StatusCode);

        var versoes = await Versoes(i, documento);
        Assert.NotEqual(versoes[0].Chave, versoes[1].Chave);
        Assert.Equal(primeira.Chave, versoes[0].Chave);
        Assert.Equal(Sha256(v1), Sha256(await f.Objeto(versoes[0].Chave)));
        Assert.Equal(Sha256(v1), versoes[0].Hash);
        foreach (var (versao, bytes) in new[] { (versoes[0], v1), (versoes[1], v2) })
            Assert.Equal(bytes, await (await admin.GetAsync($"/api/documentos/versoes/{versao.Id}")).Content.ReadAsByteArrayAsync());
    }
}
