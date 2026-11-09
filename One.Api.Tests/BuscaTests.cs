using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using One.Api.Assistente;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class IndexacaoTests(OneFactory f) : IClassFixture<OneFactory>
{
    Agendador Agendador => f.Services.GetRequiredService<Agendador>();

    static object Corpo(long categoria, string titulo = "Faltas não são abonadas", string resposta = "Faltas não são abonadas, nem com atestado médico.") =>
        new { titulo, perguntas = new[] { "posso abonar falta?" }, categoriaId = categoria, resposta, links = Array.Empty<string>() };

    async Task<(Instituicao i, HttpClient admin, long categoria)> Preparar()
    {
        var (i, admin) = await Admin.Criar(f);
        return (i, admin, (await f.Categoria(i, "Acadêmico")).Id);
    }

    static async Task<long> Criar(HttpClient admin, object corpo) => (await (await admin.PostAsJsonAsync("/api/admin/artigos", corpo)).Json()).GetProperty("id").GetInt64();

    [Fact]
    public async Task Ativar_e_editar_gravam_trecho_pendente()
    {
        var (i, admin, categoria) = await Preparar();
        var id = await Criar(admin, Corpo(categoria));
        Task<List<TrechoFonte>> Trechos() => f.Db(i.Id, db => db.TrechosFonte.Include(t => t.VersaoArtigo).Where(t => t.VersaoArtigo!.ArtigoId == id).OrderBy(t => t.Id).ToListAsync());
        Assert.Empty(await Trechos());

        Assert.Equal(HttpStatusCode.OK, (await admin.PostAsync($"/api/admin/artigos/{id}/ativar", null)).StatusCode);
        var t1 = Assert.Single(await Trechos());
        Assert.Equal(("Faltas não são abonadas\nposso abonar falta?\nFaltas não são abonadas, nem com atestado médico.", 1, (Pgvector.Vector?)null),
            (t1.Texto, t1.VersaoArtigo!.Numero, t1.Embedding));

        Assert.Equal(HttpStatusCode.OK, (await admin.PutAsJsonAsync($"/api/admin/artigos/{id}", Corpo(categoria, "Faltas e atestados"))).StatusCode);
        var t2 = (await Trechos()).Last();
        Assert.Equal((2, "Faltas e atestados\nposso abonar falta?\nFaltas não são abonadas, nem com atestado médico."), (t2.VersaoArtigo!.Numero, t2.Texto));

        var outro = await Criar(admin, Corpo(categoria, "FALHA-FORCADA"));
        await using var con = new Npgsql.NpgsqlConnection(f.ConnectionString);
        await con.OpenAsync();
        await new Npgsql.NpgsqlCommand("""
            CREATE FUNCTION falha_trecho() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'falha simulada'; END $$;
            CREATE TRIGGER falha_trecho BEFORE INSERT ON trecho_fonte FOR EACH ROW WHEN (NEW.texto LIKE 'FALHA-FORCADA%') EXECUTE FUNCTION falha_trecho();
            """, con).ExecuteNonQueryAsync();
        HttpResponseMessage r;
        try { r = await admin.PostAsync($"/api/admin/artigos/{outro}/ativar", null); }
        finally { await new Npgsql.NpgsqlCommand("DROP FUNCTION falha_trecho CASCADE", con).ExecuteNonQueryAsync(); }
        Assert.Equal(HttpStatusCode.InternalServerError, r.StatusCode);
        Assert.Equal(EstadosArtigo.Rascunho, await f.Db(i.Id, db => db.Artigos.Where(a => a.Id == outro).Select(a => a.Estado).SingleAsync()));
    }

    [Fact]
    public async Task Lotes_de_100_gravam_vetores()
    {
        await Agendador.Executar();
        var instituicoes = new[] { await f.Instituicao(), await f.Instituicao() };
        foreach (var i in instituicoes)
        {
            var artigo = await f.Artigo(i, "Rascunho", "x", estado: EstadosArtigo.Rascunho);
            await f.Db(i.Id, async db =>
            {
                var versao = await db.VersoesArtigo.Where(v => v.ArtigoId == artigo.Id).Select(v => v.Id).SingleAsync();
                db.TrechosFonte.AddRange(Enumerable.Range(0, 125).Select(n => new TrechoFonte { VersaoArtigoId = versao, Ordem = n, Texto = $"trecho {n}", ProximaTentativa = f.Relogio.GetUtcNow().UtcDateTime.AddDays(-1) }));
                await db.SaveChangesAsync();
            });
        }
        var antes = f.Llm.CorposEmbeddings.Count;

        await Agendador.Executar();

        var lotes = f.Llm.CorposEmbeddings.Skip(antes).Select(c => JsonDocument.Parse(c).RootElement.GetProperty("input").GetArrayLength()).ToList();
        Assert.Equal([100, 100, 50], lotes);
        Assert.All(f.Llm.CorposEmbeddings.Skip(antes).Select(c => JsonDocument.Parse(c).RootElement), c =>
            Assert.Equal(("text-embedding-3-small", "float"), (c.GetProperty("model").GetString(), c.GetProperty("encoding_format").GetString())));
        Assert.Equal(["https://llm.teste/v1/embeddings", "https://llm.teste/v1/embeddings", "https://llm.teste/v1/embeddings"],
            f.Llm.UrisEmbeddings.Skip(antes).Select(u => u.ToString()).ToList());
        foreach (var i in instituicoes)
        {
            var vetores = await f.Db(i.Id, db => db.TrechosFonte.Select(t => t.Embedding).ToListAsync());
            Assert.Equal(125, vetores.Count);
            Assert.All(vetores, v => Assert.Equal(1536, v!.ToArray().Length));
        }
    }

    [Fact]
    public async Task Falha_de_embeddings_tenta_5_vezes()
    {
        await Agendador.Executar();
        var (i, admin, categoria) = await Preparar();
        var id = await Criar(admin, Corpo(categoria));
        await admin.PostAsync($"/api/admin/artigos/{id}/ativar", null);
        f.Llm.ResponderEmbeddings = (_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.InternalServerError));
        try
        {
            for (var tentativa = 1; tentativa <= 5; tentativa++)
            {
                await Agendador.Executar();
                var t = await f.Db(i.Id, db => db.TrechosFonte.SingleAsync());
                Assert.Equal((tentativa, f.Relogio.GetUtcNow().UtcDateTime.AddMinutes(Math.Pow(2, tentativa)), (Pgvector.Vector?)null), (t.Tentativas, t.ProximaTentativa, t.Embedding));
                Assert.Contains(f.Logs.Entradas, l => l.Nivel == LogLevel.Warning && Equals(l.Campos.GetValueOrDefault("InstituicaoId"), i.Id) && Equals(l.Campos.GetValueOrDefault("Tentativas"), tentativa));
                f.Relogio.Advance(TimeSpan.FromMinutes(Math.Pow(2, tentativa)));
            }
            var chamadas = f.Llm.CorposEmbeddings.Count;
            f.Relogio.Advance(TimeSpan.FromHours(1));
            await Agendador.Executar();
            Assert.Equal(chamadas, f.Llm.CorposEmbeddings.Count);
        }
        finally { f.Llm.ResponderEmbeddings = null; }

        var lista = (await (await admin.GetAsync("/api/admin/artigos")).Json()).EnumerateArray().Single(a => a.GetProperty("id").GetInt64() == id);
        Assert.Equal("FALHOU", lista.GetProperty("indexacao").GetString());
    }

    [Fact]
    public async Task Indexacao_no_admin()
    {
        var (_, admin, categoria) = await Preparar();
        var id = await Criar(admin, Corpo(categoria));
        await admin.PostAsync($"/api/admin/artigos/{id}/ativar", null);
        async Task<string?> Indexacao()
        {
            var r = await admin.GetAsync("/api/admin/artigos");
            Assert.Equal(HttpStatusCode.OK, r.StatusCode);
            return (await r.Json()).EnumerateArray().Single(a => a.GetProperty("id").GetInt64() == id).GetProperty("indexacao").GetString();
        }

        Assert.Equal("PENDENTE", await Indexacao());
        await Agendador.Executar();
        Assert.Equal("INDEXADO", await Indexacao());
    }
}

public class BuscaTests(OneFactory f) : IClassFixture<OneFactory>
{
    const string SemBase = "Não encontrei isso nas orientações da instituição. Posso transferir você para um atendente.";

    static List<JsonElement> Fontes(JsonElement corpoChat) =>
        JsonDocument.Parse(corpoChat.GetProperty("messages")[1].GetProperty("content").GetString()!["Fontes (JSON):\n".Length..]).RootElement.EnumerateArray().ToList();

    static List<long> IdsDasFontes(JsonElement corpoChat) => Fontes(corpoChat).Select(x => x.GetProperty("id").GetInt64()).ToList();

    bool Logou(long conversaId, string motivo) =>
        f.Logs.Entradas.Any(l => Equals(l.Campos.GetValueOrDefault("Motivo"), motivo) && Equals(l.Campos.GetValueOrDefault("ConversaId"), conversaId));

    static double Distancia(string a, string b)
    {
        var (x, y) = (LlmFalso.Vetor(a), LlmFalso.Vetor(b));
        return 1 - x.Zip(y, (p, q) => (double)p * q).Sum();
    }

    Task<TrechoFonte> Trecho(Instituicao i, long versaoArtigoId, string texto, bool comEmbedding = true) =>
        f.Db(i.Id, async db =>
        {
            var t = new TrechoFonte { VersaoArtigoId = versaoArtigoId, Ordem = 1, Texto = texto, ProximaTentativa = DateTime.UtcNow, Embedding = comEmbedding ? new Pgvector.Vector(LlmFalso.Vetor(texto)) : null };
            db.TrechosFonte.Add(t);
            await db.SaveChangesAsync();
            return t;
        });

    async Task<long> Conversa(Aluno a, string mensagem) =>
        (await (await a.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem })).Json()).GetProperty("conversaId").GetInt64();

    [Fact]
    public async Task Chat_recebe_os_5_mais_proximos()
    {
        var i = await f.Instituicao();
        var aluno = await f.AlunoLogado(i);
        var palavras = new[] { "alfa", "beta", "gama", "delta", "epsilon", "zeta" };
        for (var k = 0; k <= 6; k++)
            await f.Artigo(i, $"Artigo {k}", string.Join(" ", palavras.Take(k).Append($"exclusivo{k}")));
        const string pergunta = "alfa beta gama delta epsilon zeta";
        var esperados = (await f.Db(i.Id, db => db.TrechosFonte.Select(t => new { t.Id, t.Texto }).ToListAsync()))
            .OrderBy(t => Distancia(t.Texto, pergunta)).ThenBy(t => t.Id).Take(5).Select(t => t.Id).ToList();

        await Conversa(aluno, pergunta);

        Assert.Equal(esperados, IdsDasFontes(f.Llm.UltimoCorpo));
    }

    [Fact]
    public async Task Consulta_com_as_ultimas_3_mensagens()
    {
        var c = await Cenario.Criar(f);
        f.Llm.Devolver(new { tipo = "pergunta", texto = "Pode detalhar?" });
        var id = await Conversa(c.Aluno, "primeira mensagem");
        foreach (var m in new[] { "segunda mensagem", "terceira mensagem", "quarta mensagem" })
            await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = m });
        var entrada = JsonDocument.Parse(f.Llm.CorposEmbeddings[^1]).RootElement.GetProperty("input")[0].GetString();
        Assert.Equal("segunda mensagem\nterceira mensagem\nquarta mensagem", entrada);

        var outra = await Conversa(c.Aluno, "preciso do boleto");
        await c.Cliente.PostAsJsonAsync($"/api/conversas/{outra}/mensagens", new { mensagem = "sim" });
        Assert.Equal(Semente.Fonte(c.Boleto.Id), IdsDasFontes(f.Llm.UltimoCorpo)[0]);
    }

    [Fact]
    public async Task Consulta_de_embedding_mascarada()
    {
        var c = await Cenario.Criar(f);

        await Conversa(c.Aluno, "boleto da matrícula 2000567890, cpf 123.456.789-09, email aluno@x.com");

        var entrada = JsonDocument.Parse(f.Llm.CorposEmbeddings[^1]).RootElement.GetProperty("input")[0].GetString()!;
        Assert.Equal("boleto da matrícula [número removido], cpf [número removido], email [e-mail removido]", entrada);
    }

    [Fact]
    public async Task So_trechos_buscaveis()
    {
        var i = await f.Instituicao();
        var outra = await f.Instituicao();
        var aluno = await f.AlunoLogado(i);
        const string pergunta = "renovacao de bolsa integral";
        var hoje = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(f.Relogio.GetUtcNow().UtcDateTime, TimeZoneInfo.FindSystemTimeZoneById("America/Cuiaba")));
        var proibidos = new List<long>();
        async Task<long> Versao(Artigo a) => await f.Db(a.InstituicaoId, db => db.VersoesArtigo.Where(v => v.ArtigoId == a.Id).Select(v => v.Id).SingleAsync());

        var rascunho = await f.Artigo(i, "R", "x", estado: EstadosArtigo.Rascunho);
        proibidos.Add((await Trecho(i, await Versao(rascunho), pergunta)).Id);
        var arquivado = await f.Artigo(i, "A", pergunta);
        await f.Db(i.Id, db => db.Artigos.Where(a => a.Id == arquivado.Id).ExecuteUpdateAsync(s => s.SetProperty(a => a.Estado, EstadosArtigo.Arquivado)));
        proibidos.Add(Semente.Fonte(arquivado.Id));
        foreach (var (de, ate) in new[] { ((DateOnly?)null, (DateOnly?)hoje.AddDays(-1)), (hoje.AddDays(1), null) })
        {
            var fora = await f.Artigo(i, "V", pergunta);
            await f.Db(i.Id, db => db.Artigos.Where(a => a.Id == fora.Id).ExecuteUpdateAsync(s => s.SetProperty(a => a.VisivelDe, de).SetProperty(a => a.VisivelAte, ate)));
            proibidos.Add(Semente.Fonte(fora.Id));
        }
        var antigo = await f.Artigo(i, "Antigo", pergunta);
        await f.Db(i.Id, async db =>
        {
            var v2 = new VersaoArtigo { ArtigoId = antigo.Id, Numero = 2, Titulo = "Antigo", Perguntas = ["?"], Resposta = "texto sem relação", CriadaEm = DateTime.UtcNow };
            db.VersoesArtigo.Add(v2);
            await db.SaveChangesAsync();
        });
        proibidos.Add(Semente.Fonte(antigo.Id));
        var semEmbedding = await f.Artigo(i, "S", "y");
        proibidos.Add((await Trecho(i, await Versao(semEmbedding), pergunta, comEmbedding: false)).Id);
        var deOutra = await f.Artigo(outra, "O", pergunta);
        proibidos.Add(Semente.Fonte(deOutra.Id));
        var valido = await f.Artigo(i, "Valido", "assunto sem nenhuma palavra em comum");

        await Conversa(aluno, pergunta);

        var ids = IdsDasFontes(f.Llm.UltimoCorpo);
        Assert.Contains(Semente.Fonte(valido.Id), ids);
        Assert.Empty(ids.Intersect(proibidos));
    }

    [Fact]
    public async Task Arquivar_tira_da_busca()
    {
        var c = await Cenario.Criar(f);
        var admin = await f.Entrar(c.Instituicao, await f.Usuario(c.Instituicao, [Papeis.Administrador]));
        f.Llm.Devolver(c.RespostaBoletoValida());
        var (id, _) = await c.Primeira();
        Assert.Contains(Semente.Fonte(c.Boleto.Id), IdsDasFontes(f.Llm.UltimoCorpo));

        Assert.Equal(HttpStatusCode.OK, (await admin.PostAsync($"/api/admin/artigos/{c.Boleto.Id}/arquivar", null)).StatusCode);
        await c.Primeira();

        Assert.DoesNotContain(Semente.Fonte(c.Boleto.Id), IdsDasFontes(f.Llm.UltimoCorpo));
        var conversa = await (await c.Cliente.GetAsync($"/api/conversas/{id}")).Json();
        Assert.Equal("Você encontra o boleto no Portal do Aluno, na área financeira.", conversa.GetProperty("mensagens")[1].GetProperty("texto").GetString());
    }

    [Fact]
    public async Task Sem_trechos_indexados()
    {
        var (i, admin) = await Admin.Criar(f);
        var aluno = await f.AlunoLogado(i);
        var categoria = (await f.Categoria(i, "Acadêmico")).Id;
        var artigo = (await (await admin.PostAsJsonAsync("/api/admin/artigos", new { titulo = "Boleto", perguntas = new[] { "boleto?" }, categoriaId = categoria, resposta = "O boleto fica no Portal do Aluno, menu Financeiro.", links = Array.Empty<string>() })).Json()).GetProperty("id").GetInt64();
        await admin.PostAsync($"/api/admin/artigos/{artigo}/ativar", null);
        f.Llm.Devolver(Cenario.Resposta("O boleto fica no portal.", [artigo], (artigo, "fica no Portal do Aluno, menu Financeiro")));

        var r = await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "boleto" });

        Assert.Empty(Fontes(f.Llm.UltimoCorpo));
        Assert.Equal("sem_base", (await r.Json()).GetProperty("resposta").GetProperty("tipo").GetString());
    }

    [Fact]
    public async Task Fonte_fora_dos_buscados_sem_base()
    {
        var i = await f.Instituicao();
        var aluno = await f.AlunoLogado(i);
        for (var k = 0; k < 5; k++) await f.Artigo(i, $"Matrícula {k}", $"rematricula semestre prazo {k}");
        var longe = await f.Artigo(i, "Distante", "Estacionamento do campus fica aberto das sete às vinte e duas horas.");
        f.Llm.Devolver(Cenario.Resposta("O estacionamento abre às sete.", [longe.Id], (longe.Id, "Estacionamento do campus fica aberto")));

        var r = await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "rematricula semestre prazo" });

        Assert.DoesNotContain(Semente.Fonte(longe.Id), IdsDasFontes(f.Llm.UltimoCorpo));
        var j = await r.Json();
        Assert.Equal("sem_base", j.GetProperty("resposta").GetProperty("tipo").GetString());
        Assert.True(Logou(j.GetProperty("conversaId").GetInt64(), "fonte_invalida"));
    }

    [Fact]
    public async Task Conferencia_contra_o_trecho_de_fonte()
    {
        var c = await Cenario.Criar(f);
        var casos = new (object saida, string tipo, string? motivo)[]
        {
            (Cenario.Resposta("Veja no portal.", [c.Boleto.Id], (c.Boleto.Id, "Como emitir o boleto do semestre")), "resposta", null),
            (Cenario.Resposta("Boleto vence no dia 15.", [c.Boleto.Id], (c.Boleto.Id, "O prazo de pagamento é o dia 15 de cada mês.")), "sem_base", "trecho_invalido"),
            (Cenario.Resposta("Veja https://falso.exemplo agora.", [c.Boleto.Id], (c.Boleto.Id, Cenario.TrechoBoleto)), "sem_base", "link_invalido"),
        };
        foreach (var (saida, tipo, motivo) in casos)
        {
            f.Llm.Devolver(saida);
            var (id, resposta) = await c.Primeira();
            Assert.Equal(tipo, resposta.GetProperty("tipo").GetString());
            if (motivo is not null) Assert.True(Logou(id, motivo), motivo);
        }
    }

    [Fact]
    public async Task Grava_buscados_e_citacoes()
    {
        var c = await Cenario.Criar(f);
        f.Llm.Devolver(c.RespostaBoletoValida());
        var (id, _) = await c.Primeira();
        var enviados = IdsDasFontes(f.Llm.UltimoCorpo);

        var m = await f.Db(c.Instituicao.Id, db => db.MensagensConversa.Include(x => x.Citacoes).SingleAsync(x => x.ConversaId == id && x.Autor == "ASSISTENTE"));
        Assert.Equal(enviados, m.TrechosBuscados);
        var citacao = Assert.Single(m.Citacoes);
        Assert.Equal((Semente.Fonte(c.Boleto.Id), (long?)null), (citacao.TrechoFonteId!.Value, citacao.VersaoArtigoId));

        var vazio = await f.AlunoLogado(await f.Instituicao());
        var semFontes = await Conversa(vazio, "boleto");
        var gravada = await f.Db(vazio.Instituicao.Id, db => db.MensagensConversa.SingleAsync(x => x.ConversaId == semFontes && x.Autor == "ASSISTENTE"));
        Assert.Equal([], gravada.TrechosBuscados);
    }

    [Fact]
    public async Task Embedding_da_consulta_falha_sem_base()
    {
        var c = await Cenario.Criar(f);
        var chats = f.Llm.Corpos.Count;
        f.Llm.ResponderEmbeddings = (_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.InternalServerError));
        try
        {
            var (id, resposta) = await c.Primeira();
            Assert.Equal(("sem_base", SemBase), (resposta.GetProperty("tipo").GetString(), resposta.GetProperty("texto").GetString()));
            Assert.Equal(chats, f.Llm.Corpos.Count);
            Assert.True(Logou(id, "busca_indisponivel"));
        }
        finally { f.Llm.ResponderEmbeddings = null; }
    }

    [Fact]
    public async Task Log_da_busca_sem_texto()
    {
        var c = await Cenario.Criar(f);
        const string segredo = "mensagem-unica-que-nao-pode-ir-ao-log-da-busca";

        var id = await Conversa(c.Aluno, segredo);

        var log = Assert.Single(f.Logs.Entradas, l => l.Mensagem.StartsWith("Busca de fontes") && Equals(l.Campos.GetValueOrDefault("ConversaId"), id));
        Assert.Equal(c.Instituicao.Id, log.Campos["InstituicaoId"]);
        Assert.Equal(string.Join(",", IdsDasFontes(f.Llm.UltimoCorpo)), log.Campos["Trechos"]);
        Assert.Equal(IdsDasFontes(f.Llm.UltimoCorpo).Count, ((string)log.Campos["Distancias"]!).Split(',').Length);
        Assert.True(log.Campos.ContainsKey("DuracaoMs"));
        Assert.DoesNotContain(f.Logs.Entradas, l => l.Mensagem.Contains(segredo) || l.Campos.Values.Any(v => v?.ToString()?.Contains(segredo) == true));
    }
}
