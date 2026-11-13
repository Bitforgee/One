using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class ProvedorTests(OneFactory f) : IClassFixture<OneFactory>
{
    const string SemBase = "Não encontrei isso nas orientações da instituição. Posso transferir você para um atendente.";

    bool Logou(long conversaId, string motivo) =>
        f.Logs.Entradas.Any(l => Equals(l.Campos.GetValueOrDefault("Motivo"), motivo) && Equals(l.Campos.GetValueOrDefault("ConversaId"), conversaId));

    [Fact]
    public async Task Log_tokens_com_cache_openai()
    {
        var c = await Cenario.Criar(f);
        f.Llm.Responder = _ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(JsonSerializer.Serialize(new
            {
                choices = new[] { new { message = new { role = "assistant", content = JsonSerializer.Serialize(c.RespostaBoletoValida()) } } },
                usage = new { prompt_tokens = 1200, completion_tokens = 80, prompt_tokens_details = new { cached_tokens = 1000 } },
            }), Encoding.UTF8, "application/json"),
        });

        await c.Primeira();

        var log = Assert.Single(f.Logs.Entradas, l => l.Mensagem.StartsWith("Chamada ao provedor de IA") && Equals(l.Campos.GetValueOrDefault("InstituicaoId"), c.Instituicao.Id));
        Assert.Equal((1000, 200, 80), ((int)log.Campos["EntradaComCache"]!, (int)log.Campos["EntradaSemCache"]!, (int)log.Campos["TokensSaida"]!));
    }

    [Fact]
    public async Task Falhas_do_chat_viram_sem_base()
    {
        var c = await Cenario.Criar(f);
        var casos = new (string motivo, Func<CancellationToken, Task<HttpResponseMessage>> responder)[]
        {
            ("provedor_http_429", _ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.TooManyRequests))),
            ("provedor_http_500", _ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.InternalServerError))),
            ("provedor_tempo_esgotado", async ct =>
            {
                f.Relogio.Advance(TimeSpan.FromSeconds(20));
                await Task.Delay(Timeout.Infinite, ct);
                return new HttpResponseMessage(HttpStatusCode.OK);
            }),
            ("provedor_json_invalido", _ => Task.FromResult(LlmFalso.Bruto("isto não é json"))),
        };
        foreach (var (motivo, responder) in casos)
        {
            f.Llm.Responder = responder;
            var (id, resposta) = await c.Primeira();
            Assert.Equal(("sem_base", SemBase), (resposta.GetProperty("tipo").GetString(), resposta.GetProperty("texto").GetString()));
            Assert.True(Logou(id, motivo), motivo);
        }
    }

    [Fact]
    public void Configuracao_padrao_openai()
    {
        var raiz = ArquiteturaTests.Raiz();
        var llm = JsonDocument.Parse(File.ReadAllText(Path.Combine(raiz, "One.Api", "appsettings.json"))).RootElement.GetProperty("Llm");
        Assert.Equal("https://api.openai.com/v1", llm.GetProperty("BaseUrl").GetString());
        Assert.Equal("gpt-6-luna", llm.GetProperty("Modelo").GetString());
        Assert.Equal("text-embedding-3-small", llm.GetProperty("ModeloEmbeddings").GetString());
        Assert.Matches(@"(?m)^\s+Llm__ChaveApi:", File.ReadAllText(Path.Combine(raiz, "docker-compose.yml")));
    }
}

public class ArquiteturaRagTests(OneFactory f) : IClassFixture<OneFactory>
{
    async Task<object?> Escalar(string sql)
    {
        await using var con = new Npgsql.NpgsqlConnection(f.ConnectionString);
        await con.OpenAsync();
        return await new Npgsql.NpgsqlCommand(sql, con).ExecuteScalarAsync();
    }

    [Fact]
    public async Task Pgvector_e_indice_hnsw()
    {
        Assert.Equal("vector", await Escalar("SELECT extname FROM pg_extension WHERE extname = 'vector'"));
        Assert.Equal("vector(1536)", await Escalar("SELECT format_type(atttypid, atttypmod) FROM pg_attribute WHERE attrelid = 'trecho_fonte'::regclass AND attname = 'embedding'"));
        var indice = (string?)await Escalar("SELECT indexdef FROM pg_indexes WHERE tablename = 'trecho_fonte' AND indexdef LIKE '%embedding%'");
        Assert.Contains("USING hnsw", indice);
        Assert.Contains("vector_cosine_ops", indice);
        using var desenho = new One.Api.Dados.OneDbDesignTime().CreateDbContext([]);
        foreach (var ctx in new Microsoft.EntityFrameworkCore.DbContext[] { desenho, f.Services.CreateScope().ServiceProvider.GetRequiredService<One.Api.Dados.OneDb>() })
            Assert.NotNull(Microsoft.EntityFrameworkCore.Infrastructure.AccessorExtensions.GetService<Microsoft.EntityFrameworkCore.Storage.IRelationalTypeMappingSource>(ctx).FindMapping(typeof(Pgvector.Vector)));
    }

    [Fact]
    public async Task Check_constraints()
    {
        var i = await f.Instituicao();
        var artigo = await f.Artigo(i, "Boleto", "O boleto fica no portal.");
        var versao = await f.Db(i.Id, db => db.VersoesArtigo.Where(v => v.ArtigoId == artigo.Id).Select(v => v.Id).SingleAsync());
        var mensagem = await f.Db(i.Id, async db =>
        {
            var aluno = await f.Usuario(i, [One.Api.Dados.Usuarios.Papeis.Aluno]);
            var c = One.Api.Dados.Conversas.Conversa.Iniciar(aluno.Id, DateTime.UtcNow);
            c.Registrar(MensagemConversa.DoAssistente(new() { Texto = "x", TipoFinal = "sem_base", CriadaEm = DateTime.UtcNow }));
            db.Conversas.Add(c);
            await db.SaveChangesAsync();
            return c.Mensagens[0].Id;
        });
        var documento = await f.Db(i.Id, async db =>
        {
            var d = Documento.Criar("Regulamento", (await db.Categorias.FirstAsync()).Id,
                new VersaoDocumento { Numero = 1, NomeArquivo = "r.pdf", Chave = $"1/documentos/{Guid.NewGuid():N}", Hash = new string('a', 64), Tamanho = 1, Texto = "t", Paginas = 1, CriadaEm = DateTime.UtcNow });
            db.Documentos.Add(d);
            await db.SaveChangesAsync();
            return d.Versoes.Single().Id;
        });

        foreach (var (sql, restricao) in new[]
        {
            ($"INSERT INTO trecho_fonte (instituicao_id, versao_artigo_id, versao_documento_id, ordem, texto, tentativas, proxima_tentativa) VALUES ({i.Id}, {versao}, {documento}, 0, 't', 0, now())", "ck_trecho_fonte_uma_versao"),
            ($"INSERT INTO trecho_fonte (instituicao_id, ordem, texto, tentativas, proxima_tentativa) VALUES ({i.Id}, 0, 't', 0, now())", "ck_trecho_fonte_uma_versao"),
            ($"INSERT INTO citacao_artigo (instituicao_id, mensagem_conversa_id, trechos) VALUES ({i.Id}, {mensagem}, ARRAY['x'])", "ck_citacao_artigo_fonte"),
        })
        {
            var e = await Assert.ThrowsAsync<Npgsql.PostgresException>(() => Escalar(sql));
            Assert.Equal(restricao, e.ConstraintName);
        }
    }

    [Fact]
    public void Decisoes_registradas()
    {
        var linhas = File.ReadAllLines(Path.Combine(ArquiteturaTests.Raiz(), ".specs", "STATE.md"));
        string Linha(string ad) => Assert.Single(linhas, l => l.StartsWith($"| {ad} |"));
        Assert.Contains("| superseded by AD-015 |", Linha("AD-006"));
        Assert.Contains("OpenAI", Linha("AD-015"));
        Assert.EndsWith("| active | 2026-11-02 |", Linha("AD-015"));
        Assert.Contains("chunks", Linha("AD-016"));
        Assert.EndsWith("| active | 2026-11-02 |", Linha("AD-016"));
    }

    [Fact]
    public void Sem_framework_de_agentes()
    {
        var raiz = ArquiteturaTests.Raiz();
        var projeto = File.ReadAllText(Path.Combine(raiz, "One.Api", "One.Api.csproj"));
        Assert.DoesNotContain("Microsoft.Agents.AI", projeto);
        Assert.DoesNotContain("Microsoft.Extensions.AI", projeto);
        foreach (var arquivo in new[] { "Assistente.cs", "Embeddings.cs" })
            Assert.Contains("CreateClient(\"llm\")", File.ReadAllText(Path.Combine(raiz, "One.Api", "Assistente", arquivo)));
    }
}

public class ImutabilidadeRagTests(OneFactory f) : IClassFixture<OneFactory>
{
    [Fact]
    public async Task Trechos_e_versoes_append_only()
    {
        var c = await Cenario.Criar(f);
        f.Llm.Devolver(c.RespostaBoletoValida());
        await c.Primeira();
        var i = c.Instituicao;
        await f.Db(i.Id, async db =>
        {
            var d = Documento.Criar("Regulamento", (await db.Categorias.FirstAsync()).Id,
                new VersaoDocumento { Numero = 1, NomeArquivo = "r.pdf", Chave = $"1/documentos/{Guid.NewGuid():N}", Hash = new string('a', 64), Tamanho = 1, Texto = "t", Paginas = 1, CriadaEm = DateTime.UtcNow });
            db.Documentos.Add(d);
            await db.SaveChangesAsync();
            db.TrechosFonte.Add(new TrechoFonte { VersaoDocumentoId = d.Versoes.Single().Id, Texto = "pendente", ProximaTentativa = DateTime.UtcNow });
            await db.SaveChangesAsync();
        });
        var indexado = Semente.Fonte(c.Boleto.Id);

        await using var con = new Npgsql.NpgsqlConnection(f.ConnectionString);
        await con.OpenAsync();
        async Task<string> Foto(string tabela) => (string)(await new Npgsql.NpgsqlCommand($"SELECT string_agg(t::text, '|' ORDER BY id) FROM {tabela} t", con).ExecuteScalarAsync())!;
        const string SoEmbedding = "trecho_fonte: só o embedding vazio e as tentativas podem mudar";
        foreach (var (tabela, sql, motivo) in new[]
        {
            ("versao_documento", "UPDATE versao_documento SET nome_arquivo = 'outro.pdf'", "tabela versao_documento é append-only"),
            ("versao_documento", "DELETE FROM versao_documento", "tabela versao_documento é append-only"),
            ("citacao_artigo", "UPDATE citacao_artigo SET trechos = ARRAY['outro']", "tabela citacao_artigo é append-only"),
            ("citacao_artigo", "DELETE FROM citacao_artigo", "tabela citacao_artigo é append-only"),
            ("trecho_fonte", "DELETE FROM trecho_fonte WHERE texto = 'pendente'", "trecho_fonte não aceita DELETE"),
            ("trecho_fonte", "UPDATE trecho_fonte SET texto = 'outro'", SoEmbedding),
            ("trecho_fonte", $"UPDATE trecho_fonte SET embedding = (SELECT embedding FROM trecho_fonte WHERE id = {Semente.Fonte(c.Faltas.Id)}) WHERE id = {indexado}", SoEmbedding),
        })
        {
            var antes = await Foto(tabela);
            var e = await Assert.ThrowsAsync<Npgsql.PostgresException>(() => new Npgsql.NpgsqlCommand(sql, con).ExecuteNonQueryAsync());
            Assert.Equal(("P0001", motivo), (e.SqlState, e.MessageText));
            Assert.Equal(antes, await Foto(tabela));
        }

        var repetida = await Assert.ThrowsAsync<Npgsql.PostgresException>(() => new Npgsql.NpgsqlCommand(
            "INSERT INTO versao_documento (instituicao_id, documento_id, numero, nome_arquivo, chave, hash, tamanho, texto, paginas, criada_em) SELECT instituicao_id, documento_id, numero, nome_arquivo, chave || 'x', hash, tamanho, texto, paginas, criada_em FROM versao_documento", con).ExecuteNonQueryAsync());
        Assert.Equal(("23505", "ix_versao_documento_documento_id_numero"), (repetida.SqlState, repetida.ConstraintName));

        var gravados = await new Npgsql.NpgsqlCommand($"UPDATE trecho_fonte SET embedding = (SELECT embedding FROM trecho_fonte WHERE id = {indexado}) WHERE texto = 'pendente'", con).ExecuteNonQueryAsync();
        Assert.Equal(1, gravados);
    }
}
