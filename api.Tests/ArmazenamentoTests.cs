using System.Net;
using System.Security.Cryptography;
using System.Text;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.DependencyInjection;
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

    // C7 (rodada 1): o Content-Length que vai no fio, lido com ResponseHeadersRead (GetAsync calcula do corpo em memória)
    [Fact]
    public async Task Content_length_do_anexo_e_da_versao_vai_no_cabecalho()
    {
        var (b, _, _, id) = await ComAnexo(5000);
        using var anexo = await b.ClienteAluno.GetAsync($"/api/anexos/{id}", HttpCompletionOption.ResponseHeadersRead);
        Assert.Equal(5000, anexo.Content.Headers.ContentLength);

        var (i, admin, categoria) = await Mundo();
        var pdf = Pdfs.Criar("Regulamento de estagio supervisionado.");
        var versao = (await Versoes(i, await IdDoDocumento(await admin.Subir("Regulamento", categoria, pdf)))).Single();
        using var d = await admin.GetAsync($"/api/documentos/versoes/{versao.Id}", HttpCompletionOption.ResponseHeadersRead);
        Assert.Equal(pdf.Length, d.Content.Headers.ContentLength);
    }

    // C8 (rodada 1): o contador enxerga a leitura pela URL assinada, senão "zero leituras" seria vazio
    [Fact]
    public async Task Contador_de_leituras_ve_o_download_pela_url_assinada()
    {
        var (b, _, _, id) = await ComAnexo();
        var antes = f.LeiturasDeObjeto;
        Assert.Equal(HttpStatusCode.OK, (await b.ClienteAluno.GetAsync($"/api/anexos/{id}")).StatusCode);
        Assert.Equal(antes + 1, f.LeiturasDeObjeto);
    }

    // AC 13 (rodada 1): erro de serviço do bucket (S3 responde com erro) vira 503, não só porta fechada
    [Fact]
    public async Task Erro_do_bucket_responde_503_e_nada_fica()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        var antes = string.Join(",", await f.Chaves()) + "|" + await f.Db(b.Instituicao.Id, db => db.Anexos.CountAsync());
        var s3 = (AmazonS3Client)f.Services.GetRequiredService<IAmazonS3>();
        void Troca(object? _, Amazon.Runtime.RequestEventArgs e)
        {
            // o MinIO recusa a gravação com um erro de serviço (AmazonS3Exception): o resumo MD5 declarado não confere
            if (e is Amazon.Runtime.WebServiceRequestEventArgs { Request: PutObjectRequest } w) w.Headers["Content-MD5"] = "AAAAAAAAAAAAAAAAAAAAAA==";
        }
        s3.BeforeRequestEvent += Troca;
        HttpResponseMessage r;
        try { r = await Balcao.ComAnexos(b.A.Cliente, numero, "Veja a tela.", "PUBLICA", ("tela.png", Balcao.Arquivo(Balcao.Png, 100))); }
        finally { s3.BeforeRequestEvent -= Troca; }

        await Indisponivel(r, "erro de serviço do bucket");
        Assert.Equal(antes, string.Join(",", await f.Chaves()) + "|" + await f.Db(b.Instituicao.Id, db => db.Anexos.CountAsync()));
    }

    // C4/C13 (rodada 1): a recusa de estado vem antes da gravação, nenhum objeto órfão
    [Fact]
    public async Task Rejeitar_resolucao_vencida_com_anexo_nao_deixa_objeto()
    {
        var b = await Balcao.Criar(f);
        var vencido = await b.Chamado(EstadosChamado.Resolvido);
        await b.Recuar(vencido, TimeSpan.FromDays(7) + TimeSpan.FromMinutes(1));
        var antes = await f.Chaves();

        var r = await Balcao.ComAnexos(b.ClienteAluno, vencido, "Não resolveu.", "PUBLICA", ("tela.png", Balcao.Arquivo(Balcao.Png, 100)));

        Assert.Equal(HttpStatusCode.Conflict, r.StatusCode);
        Assert.Equal(antes, await f.Chaves());
    }

    // verificação rodada 2 (N4): a rejeição aceita dentro do prazo grava o objeto do anexo que a linha aponta
    [Fact]
    public async Task Rejeitar_resolucao_no_prazo_com_anexo_grava_o_objeto()
    {
        var b = await Balcao.Criar(f);
        var resolvido = await b.Chamado(EstadosChamado.Resolvido);
        var antes = await f.Chaves();
        var png = Balcao.Arquivo(Balcao.Png, 100);

        var r = await Balcao.ComAnexos(b.ClienteAluno, resolvido, "Não resolveu.", "PUBLICA", ("tela.png", png));

        Assert.True(r.IsSuccessStatusCode, $"{(int)r.StatusCode}");
        var anexo = await f.Db(b.Instituicao.Id, db => db.Anexos.OrderByDescending(x => x.Id).FirstAsync());
        Assert.Equal([anexo.Chave], (await f.Chaves()).Except(antes));
        Assert.Equal(png, await f.Objeto(anexo.Chave));
    }

    [Fact]
    public async Task Nova_versao_de_documento_arquivado_nao_deixa_objeto()
    {
        var (_, admin, categoria) = await Mundo();
        var id = await IdDoDocumento(await admin.Subir("Regulamento", categoria, Pdfs.Criar("Regulamento de estagio supervisionado.")));
        Assert.Equal(HttpStatusCode.OK, (await admin.PostAsync($"/api/admin/documentos/{id}/arquivar", null)).StatusCode);
        var antes = await f.Chaves();

        var r = await admin.NovaVersao(id, Pdfs.Criar("Segunda versao do regulamento."));

        Assert.Equal(HttpStatusCode.Conflict, r.StatusCode);
        Assert.Equal(antes, await f.Chaves());
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

    const string Fora = "Armazenamento de arquivos indisponível.";

    static async Task Indisponivel(HttpResponseMessage r, string onde)
    {
        Assert.True(r.StatusCode == HttpStatusCode.ServiceUnavailable, $"{onde}: {(int)r.StatusCode}");
        Assert.Equal("application/problem+json", r.Content.Headers.ContentType?.MediaType);
        Assert.Equal(Fora, (await r.Json()).GetProperty("detail").GetString());
    }

    // C15
    [Fact]
    public async Task Envio_com_armazenamento_fora_responde_503_e_nada_no_banco()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        var (i, admin, categoria) = await Mundo();
        var documento = await IdDoDocumento(await admin.Subir("Existente", categoria, Pdfs.Criar("Regulamento de estagio supervisionado.")));
        async Task<string> Contagens() =>
            string.Join(",", await f.Db(null, async db => new[]
            {
                await db.MensagensChamado.IgnoreQueryFilters().CountAsync(), await db.EventosChamado.IgnoreQueryFilters().CountAsync(), await db.Anexos.IgnoreQueryFilters().CountAsync(),
                await db.Documentos.IgnoreQueryFilters().CountAsync(), await db.VersoesDocumento.IgnoreQueryFilters().CountAsync(), await db.TrechosFonte.IgnoreQueryFilters().CountAsync(),
            })) + "|" + string.Join(",", await f.Chaves());
        var antes = await Contagens();

        using (f.MinioFora())
        {
            await Indisponivel(await Balcao.ComAnexos(b.A.Cliente, numero, "Veja a tela.", "PUBLICA", ("tela.png", Balcao.Arquivo(Balcao.Png, 100))), "mensagens");
            await Indisponivel(await admin.Subir("Novo", categoria, Pdfs.Criar("Outro regulamento do curso.")), "documentos");
            await Indisponivel(await admin.NovaVersao(documento, Pdfs.Criar("Segunda versao do regulamento.")), "versoes");
        }
        Assert.Equal(antes, await Contagens());
    }

    // C16
    [Fact]
    public async Task Leitura_com_armazenamento_fora_ou_objeto_ausente_responde_503()
    {
        var (b, _, _, anexoId) = await ComAnexo();
        var (i, admin, categoria) = await Mundo();
        var versaoId = (await Versoes(i, await IdDoDocumento(await admin.Subir("Regulamento", categoria, Pdfs.Criar("Regulamento de estagio supervisionado."))))).Single().Id;

        using (f.MinioFora())
        {
            await Indisponivel(await b.ClienteAluno.GetAsync($"/api/anexos/{anexoId}"), "anexo, porta fechada");
            await Indisponivel(await admin.GetAsync($"/api/documentos/versoes/{versaoId}"), "versão, porta fechada");
        }

        // o bucket é versionado: apagar o objeto põe uma marca e a leitura da chave passa a dar 404 (a linha é append-only)
        using var s3 = OneFactory.ClienteS3();
        foreach (var chave in await f.Db(null, async db => new[]
        {
            await db.Anexos.IgnoreQueryFilters().Where(x => x.Id == anexoId).Select(x => x.Chave).SingleAsync(),
            await db.VersoesDocumento.IgnoreQueryFilters().Where(x => x.Id == versaoId).Select(x => x.Chave).SingleAsync(),
        }))
            await s3.DeleteObjectAsync(f.Bucket, chave);
        await Indisponivel(await b.ClienteAluno.GetAsync($"/api/anexos/{anexoId}"), "anexo, objeto ausente");
        await Indisponivel(await admin.GetAsync($"/api/documentos/versoes/{versaoId}"), "versão, objeto ausente");
    }

    // C17
    [Fact]
    public async Task Conflito_no_banco_apos_gravar_deixa_objeto_orfao()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(EstadosChamado.AguardandoAluno);
        var antes = await f.Chaves();
        var s3 = (AmazonS3Client)f.Services.GetRequiredService<IAmazonS3>();
        // logo depois do PutObject, outra sessão altera o chamado: o SaveChanges da API vê a versão velha
        void Concorrente(object? _, Amazon.Runtime.ResponseEventArgs e)
        {
            if (e is Amazon.Runtime.WebServiceResponseEventArgs { Response: PutObjectResponse })
                f.Db(b.Instituicao.Id, async db =>
                {
                    var c = await db.Chamados.SingleAsync(x => x.Numero == numero);
                    db.Entry(c).Property(x => x.ResponsavelId).CurrentValue = c.ResponsavelId == b.B.Usuario.Id ? b.A.Usuario.Id : b.B.Usuario.Id;
                    await db.SaveChangesAsync();
                }).GetAwaiter().GetResult();
        }
        s3.AfterResponseEvent += Concorrente;
        HttpResponseMessage r;
        try { r = await Balcao.ComAnexos(b.ClienteAluno, numero, "Veja a tela.", "PUBLICA", ("tela.png", Balcao.Arquivo(Balcao.Png, 100))); }
        finally { s3.AfterResponseEvent -= Concorrente; }

        Assert.Equal(HttpStatusCode.Conflict, r.StatusCode);
        Assert.Equal(Problemas.AlteradoPorOutro, (await r.Json()).GetProperty("detail").GetString());
        var novas = (await f.Chaves()).Except(antes).ToList();
        Assert.Single(novas);
        Assert.False(await f.Db(null, db => db.Anexos.IgnoreQueryFilters().AnyAsync(x => x.Chave == novas[0])));
    }

    // C18
    [Fact]
    public async Task Preparar_sem_minio_falha_a_subida_citando_endpoint_e_bucket()
    {
        using var s3 = new AmazonS3Client(new Amazon.Runtime.BasicAWSCredentials("one", "one-minio-dev"), new AmazonS3Config { ServiceURL = "http://localhost:1", ForcePathStyle = true });
        var e = await Assert.ThrowsAsync<InvalidOperationException>(() => new Armazenamento(s3, "bucket-fora").Preparar());
        Assert.Contains("http://localhost:1", e.Message);
        Assert.Contains("bucket-fora", e.Message);

        await using var fechada = new OneFactoryMinioFechado();
        var subida = Assert.ThrowsAny<Exception>(() => fechada.Services);
        Assert.Contains("http://localhost:1", subida.ToString());
        Assert.Contains(fechada.Bucket, subida.ToString());
    }

    // C19
    [Fact]
    public async Task Preparar_cria_bucket_e_liga_versionamento_e_e_idempotente()
    {
        var bucket = "one-prep-" + Guid.NewGuid().ToString("N")[..12];
        using var s3 = OneFactory.ClienteS3();
        try
        {
            var armazenamento = new Armazenamento(s3, bucket);
            Assert.DoesNotContain(bucket, (await s3.ListBucketsAsync()).Buckets.Select(x => x.BucketName));
            for (var vez = 1; vez <= 2; vez++)
            {
                await armazenamento.Preparar();
                Assert.Equal(VersionStatus.Enabled, (await s3.GetBucketVersioningAsync(bucket)).VersioningConfig.Status);
            }
        }
        finally { await s3.DeleteBucketAsync(bucket); }
    }

    // C21
    [Fact]
    public async Task Duas_gravacoes_do_mesmo_conteudo_geram_chaves_diferentes()
    {
        using var s3 = OneFactory.ClienteS3();
        var armazenamento = new Armazenamento(s3, f.Bucket);
        var bytes = Balcao.Arquivo(Balcao.Png, 300);

        var (primeira, hash1) = await armazenamento.Gravar(7, "anexos", bytes);
        var (segunda, hash2) = await armazenamento.Gravar(7, "anexos", bytes);

        Assert.NotEqual(primeira, segunda);
        Assert.Equal(hash1, hash2);
        Assert.Contains(primeira, await f.Chaves());
        Assert.Contains(segunda, await f.Chaves());
        Assert.Equal(bytes, await f.Objeto(primeira));
        Assert.Equal(bytes, await f.Objeto(segunda));
    }
}

public class OneFactoryMinioFechado : OneFactory
{
    protected override int PortaMinio => 1;
}
