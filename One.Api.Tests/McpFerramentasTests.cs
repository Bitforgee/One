using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using One.Api.Dados;
using One.Api.Dados.Documentos;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class McpFerramentasTests(OneFactory f) : IClassFixture<OneFactory>
{
    const string Periodo = "de=2026-11-01&ate=2026-11-30";

    async Task<(Balcao Balcao, string Token)> Mundo()
    {
        var b = await Balcao.Criar(f);
        return (b, await f.NovoTokenMcp(b.Instituicao, b.A.Usuario));
    }

    async Task<Setor> SetorDeLideranca(Instituicao i)
    {
        await f.Usuario(i, [Papeis.Aluno]);
        return await f.Db(i.Id, async db =>
        {
            var curso = await db.Cursos.FirstAsync();
            var s = Setor.Criar("Líderes do 3º semestre", null, null, curso.Id, 3);
            db.Setores.Add(s);
            await db.SaveChangesAsync();
            return s;
        });
    }

    static JsonNode? SemNulos(JsonNode? no) => no switch
    {
        JsonObject o => new JsonObject(o.Where(p => p.Value is not null).Select(p => KeyValuePair.Create(p.Key, SemNulos(p.Value)))),
        JsonArray a => new JsonArray(a.Select(x => SemNulos(x)).ToArray()),
        _ => no?.DeepClone(),
    };

    static JsonNode? Normal(JsonElement j) => SemNulos(JsonNode.Parse(j.GetRawText()));

    async Task<JsonElement> Rota(HttpClient c, string url)
    {
        var r = await c.GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        return await r.Json();
    }

    [Fact]
    public async Task Listar_chamados_igual_a_rota_e_corta_em_50()
    {
        var (b, token) = await Mundo();
        for (var n = 0; n < 52; n++) await b.Chamado();
        var daRota = (await Rota(b.A.Cliente, "/api/chamados?escopo=fila")).EnumerateArray().ToList();
        Assert.Equal(52, daRota.Count);

        var fila = await f.Chamar(b.Instituicao.Slug, token, "listar_chamados");

        Assert.False(fila.Erro, fila.Texto);
        var j = fila.Json();
        Assert.Equal(52, j.GetProperty("total").GetInt32());
        var itens = j.GetProperty("itens").EnumerateArray().ToList();
        Assert.Equal(50, itens.Count);
        Assert.Equal(daRota.Take(50).Select(x => x.GetProperty("numero").GetString()), itens.Select(x => x.GetProperty("numero").GetString()));
        Assert.Equal(daRota[0].GetProperty("categoria").GetString(), itens[0].GetProperty("categoria").GetString());
        Assert.Equal(daRota[0].GetProperty("dias").GetInt32(), itens[0].GetProperty("dias").GetInt32());

        var duplo = await f.Usuario(b.Instituicao, [Papeis.Atendente, Papeis.Aluno]);
        var cliente = await f.Entrar(b.Instituicao, duplo);
        Assert.Equal(HttpStatusCode.Created, (await cliente.PostAsJsonAsync("/api/atendimento-direto", new { descricao = "Chamado aberto por quem também atende" })).StatusCode);
        var meus = (await Rota(cliente, "/api/chamados")).EnumerateArray().Select(x => x.GetProperty("numero").GetString()).ToList();
        Assert.Single(meus);
        var daFerramenta = await f.Chamar(b.Instituicao.Slug, await f.NovoTokenMcp(b.Instituicao, duplo), "listar_chamados", new { escopo = "meus" });
        Assert.Equal(meus, daFerramenta.Json().GetProperty("itens").EnumerateArray().Select(x => x.GetProperty("numero").GetString()));
    }

    [Fact]
    public async Task Listar_chamados_filtra_por_estado()
    {
        var (b, token) = await Mundo();
        var aberto = await b.Chamado();
        var emAtendimento = await b.Chamado(EstadosChamado.EmAtendimento);

        var r = await f.Chamar(b.Instituicao.Slug, token, "listar_chamados", new { estado = "EM_ATENDIMENTO" });

        Assert.False(r.Erro, r.Texto);
        var numeros = r.Json().GetProperty("itens").EnumerateArray().Select(x => x.GetProperty("numero").GetString()).ToList();
        Assert.Equal([emAtendimento], numeros);
        Assert.DoesNotContain(aberto, numeros);
    }

    [Fact]
    public async Task Listar_chamados_recusa_argumento_invalido()
    {
        var (b, token) = await Mundo();

        var escopo = await f.Chamar(b.Instituicao.Slug, token, "listar_chamados", new { escopo = "todos" });
        var estado = await f.Chamar(b.Instituicao.Slug, token, "listar_chamados", new { estado = "INEXISTENTE" });

        Assert.True(escopo.Erro);
        Assert.Contains("fila", escopo.Texto);
        Assert.Contains("meus", escopo.Texto);
        Assert.True(estado.Erro);
        foreach (var valido in new[] { "ABERTO", "EM_ATENDIMENTO", "AGUARDANDO_ALUNO", "RESOLVIDO", "FECHADO" }) Assert.Contains(valido, estado.Texto);
    }

    [Fact]
    public async Task Ver_chamado_igual_a_rota_sem_anexo_nem_matricula()
    {
        var (b, token) = await Mundo();
        var numero = await b.Chamado();
        Assert.True((await b.A.Cliente.PostAsync($"/api/chamados/{numero}/assumir", null)).IsSuccessStatusCode);
        Assert.True((await Balcao.Mensagem(b.A.Cliente, numero, "Resposta pública da equipe")).IsSuccessStatusCode);
        Assert.True((await Balcao.Mensagem(b.A.Cliente, numero, "Nota interna da equipe", tipo: "NOTA")).IsSuccessStatusCode);
        Assert.True((await Balcao.ComAnexos(b.A.Cliente, numero, "Segue o comprovante", "PUBLICA", ("comprovante-secreto.png", Balcao.Arquivo(Balcao.Png, 200)))).IsSuccessStatusCode);
        var matricula = await f.Db(b.Instituicao.Id, db => db.Matriculas.Where(m => m.UsuarioId == b.Aluno.Usuario.Id).Select(m => m.Numero).SingleAsync());

        var daRota = await Rota(b.A.Cliente, $"/api/chamados/{numero}");
        var r = await f.Chamar(b.Instituicao.Slug, token, "ver_chamado", new { numero });

        Assert.False(r.Erro, r.Texto);
        var j = r.Json();
        string[] permitidas = ["numero", "titulo", "estado", "categoria", "setor", "responsavel", "solicitante", "curso", "semestre", "criadoEm", "resolvidoEm", "resumo", "mensagens", "eventos"];
        var chaves = j.EnumerateObject().Select(p => p.Name).ToList();
        Assert.Empty(chaves.Except(permitidas));
        Assert.Empty(permitidas.Except(["resolvidoEm", "resumo"]).Except(chaves));        Assert.Equal(numero, j.GetProperty("numero").GetString());
        Assert.Equal(daRota.GetProperty("solicitante").GetString(), j.GetProperty("solicitante").GetString());
        Assert.Equal(daRota.GetProperty("matricula").GetProperty("curso").GetString(), j.GetProperty("curso").GetString());
        var mensagens = j.GetProperty("mensagens").EnumerateArray().Select(m => (m.GetProperty("tipo").GetString(), m.GetProperty("texto").GetString())).ToList();
        Assert.Equal(daRota.GetProperty("mensagens").EnumerateArray().Select(m => (m.GetProperty("tipo").GetString(), m.GetProperty("texto").GetString())), mensagens);
        Assert.Contains(("NOTA", "Nota interna da equipe"), mensagens);
        var eventos = j.GetProperty("eventos").EnumerateArray().Select(e => (e.GetProperty("tipo").GetString(), e.GetProperty("ator").GetString())).ToList();
        Assert.Equal(daRota.GetProperty("eventos").EnumerateArray().Select(e => (e.GetProperty("tipo").GetString(), e.GetProperty("ator").GetString())), eventos);
        Assert.NotEmpty(eventos);
        Assert.DoesNotContain(matricula, r.Texto);
        Assert.DoesNotContain("comprovante-secreto", r.Texto);
        Assert.DoesNotContain("anexos", r.Texto);

        var lideranca = await SetorDeLideranca(b.Instituicao);
        var lider = await f.Atendente(b.Instituicao, lideranca);
        await f.Db(b.Instituicao.Id, db => db.Chamados.Where(c => c.Numero == numero).ExecuteUpdateAsync(s => s.SetProperty(c => c.SetorId, lideranca.Id)));
        var daRotaDoLider = await Rota(lider.Cliente, $"/api/chamados/{numero}");
        var doLider = await f.Chamar(b.Instituicao.Slug, await f.NovoTokenMcp(b.Instituicao, lider.Usuario), "ver_chamado", new { numero });
        Assert.False(doLider.Erro, doLider.Texto);
        Assert.Equal(daRotaDoLider.GetProperty("mensagens").EnumerateArray().Select(m => m.GetProperty("texto").GetString()), doLider.Json().GetProperty("mensagens").EnumerateArray().Select(m => m.GetProperty("texto").GetString()));
        Assert.DoesNotContain(matricula, doLider.Texto);
    }

    [Fact]
    public async Task Ver_chamado_nao_vaza_existencia()
    {
        var (b, token) = await Mundo();
        var proprio = await b.Chamado();
        var outro = await Balcao.Criar(f);
        await outro.Chamado();
        await outro.Chamado();
        var deOutra = await outro.Chamado();
        Assert.Equal("ONE-3", deOutra);
        var alheioAoSetor = await b.Chamado();
        await f.Db(b.Instituicao.Id, db => db.Chamados.Where(c => c.Numero == alheioAoSetor).ExecuteUpdateAsync(s => s.SetProperty(c => c.SetorId, b.Outro.Id)));

        Assert.False((await f.Chamar(b.Instituicao.Slug, token, "ver_chamado", new { numero = proprio })).Erro);
        foreach (var numero in new[] { "ONE-99999", deOutra, alheioAoSetor })
        {
            var r = await f.Chamar(b.Instituicao.Slug, token, "ver_chamado", new { numero });
            Assert.True(r.Erro, numero);
            Assert.Equal("Chamado não encontrado.", r.Texto);
        }
    }

    async Task SemearDocumento(Instituicao i, string titulo, string texto) =>
        await f.Db(i.Id, async db =>
        {
            var versao = new VersaoDocumento { Numero = 1, NomeArquivo = "d.pdf", Chave = $"{i.Id}/documentos/{Guid.NewGuid():N}", Hash = new string('a', 64), Tamanho = 1, Texto = texto, Paginas = 1, CriadaEm = f.Relogio.GetUtcNow().UtcDateTime };
            db.Documentos.Add(Documento.Criar(titulo, (await db.Categorias.FirstAsync()).Id, versao));
            await db.SaveChangesAsync();
            db.TrechosFonte.Add(new TrechoFonte { VersaoDocumento = versao, Ordem = 0, Texto = texto, ProximaTentativa = f.Relogio.GetUtcNow().UtcDateTime, Embedding = new Pgvector.Vector(LlmFalso.Vetor(texto)) });
            await db.SaveChangesAsync();
        });

    [Fact]
    public async Task Buscar_conhecimento_so_ativos_da_instituicao()
    {
        var i = await f.Instituicao();
        var j = await f.Instituicao();
        var token = await f.NovoTokenMcp(i, await f.Usuario(i, [Papeis.Atendente]));
        await f.Artigo(i, "Boleto vencido", "Como pagar o boleto vencido pelo portal.", links: ["https://univag.test/boleto"]);
        var arquivado = await f.Artigo(i, "Boleto vencido arquivado", "Texto antigo sobre boleto vencido.");
        await f.Db(i.Id, async db =>
        {
            var a = await db.Artigos.Include(x => x.Versoes).SingleAsync(x => x.Id == arquivado.Id);
            a.Arquivar();
            await db.SaveChangesAsync();
        });
        await SemearDocumento(i, "Calendário acadêmico", "Calendário acadêmico do semestre letivo e feriados.");
        await f.Artigo(j, "Boleto vencido de outra instituição", "Como pagar o boleto vencido pelo portal.");

        var dois = await f.Chamar(i.Slug, token, "buscar_conhecimento", new { consulta = "boleto vencido", limite = 2 });

        Assert.False(dois.Erro, dois.Texto);
        var fontes = dois.Json().GetProperty("fontes").EnumerateArray().ToList();
        Assert.Equal(["Boleto vencido", "Calendário acadêmico"], fontes.Select(x => x.GetProperty("titulo").GetString()));
        Assert.Equal(["ARTIGO", "DOCUMENTO"], fontes.Select(x => x.GetProperty("tipo").GetString()));
        Assert.Equal(["https://univag.test/boleto"], fontes[0].GetProperty("links").EnumerateArray().Select(x => x.GetString()));
        Assert.Contains("boleto vencido", fontes[0].GetProperty("texto").GetString());
        Assert.DoesNotContain("arquivado", dois.Texto);
        Assert.DoesNotContain("outra instituição", dois.Texto);

        await f.Chamar(i.Slug, token, "buscar_conhecimento", new { consulta = "boleto de aluno@teste.one" });
        var enviado = f.Llm.CorposEmbeddings[^1];
        Assert.DoesNotContain("aluno@teste.one", enviado);
        Assert.Contains("[e-mail removido]", enviado);

        for (var n = 1; n <= 6; n++) await f.Artigo(i, $"Boleto vencido parte {n}", $"Detalhe {n} do boleto vencido.");
        var padrao = await f.Chamar(i.Slug, token, "buscar_conhecimento", new { consulta = "boleto vencido" });
        Assert.Equal(5, padrao.Json().GetProperty("fontes").GetArrayLength());
    }

    [Fact]
    public async Task Buscar_conhecimento_recusa_so_lideranca()
    {
        var i = await f.Instituicao();
        var lider = await f.Atendente(i, await SetorDeLideranca(i));
        var token = await f.NovoTokenMcp(i, lider.Usuario);

        var r = await f.Chamar(i.Slug, token, "buscar_conhecimento", new { consulta = "boleto" });

        Assert.True(r.Erro);
        Assert.Equal("Seu papel não tem acesso à base de conhecimento.", r.Texto);
    }

    [Fact]
    public async Task Buscar_conhecimento_quando_embedding_falha()
    {
        var i = await f.Instituicao();
        var token = await f.NovoTokenMcp(i, await f.Usuario(i, [Papeis.Atendente]));
        f.Llm.ResponderEmbeddings = (_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.InternalServerError));
        try
        {
            var r = await f.Chamar(i.Slug, token, "buscar_conhecimento", new { consulta = "boleto" });

            Assert.True(r.Erro);
            Assert.Equal("A busca está indisponível agora. Tente de novo em instantes.", r.Texto);
        }
        finally
        {
            f.Llm.ResponderEmbeddings = null;
        }
    }

    [Fact]
    public async Task Buscar_conhecimento_valida_os_limites()
    {
        var i = await f.Instituicao();
        var token = await f.NovoTokenMcp(i, await f.Usuario(i, [Papeis.Atendente]));
        var recusas = new (string consulta, int? limite, string cita)[]
        {
            ("", null, "500"), (new string('a', 501), null, "500"), ("boleto", 0, "10"), ("boleto", 11, "10"),
        };
        foreach (var (consulta, limite, cita) in recusas)
        {
            var r = await f.Chamar(i.Slug, token, "buscar_conhecimento", new { consulta, limite });
            Assert.True(r.Erro, $"{consulta.Length}/{limite}");
            Assert.Contains(cita, r.Texto);
        }
        foreach (var (consulta, limite) in new[] { ("a", 1), (new string('a', 500), 10) })
            Assert.False((await f.Chamar(i.Slug, token, "buscar_conhecimento", new { consulta, limite })).Erro);
    }

    [Fact]
    public async Task Ver_indicadores_igual_a_rota()
    {
        var (b, tokenA) = await Mundo();
        await b.Chamado();
        var admin = await f.Usuario(b.Instituicao, [Papeis.Administrador]);
        var clienteAdmin = await f.Entrar(b.Instituicao, admin);
        var tokenAdmin = await f.NovoTokenMcp(b.Instituicao, admin);

        foreach (var (cliente, token, setor) in new[] { (b.A.Cliente, tokenA, (long?)null), (b.A.Cliente, tokenA, b.Triagem.Id), (clienteAdmin, tokenAdmin, null), (clienteAdmin, tokenAdmin, b.Triagem.Id) })
        {
            var daRota = await Rota(cliente, $"/api/indicadores?{Periodo}" + (setor is null ? "" : $"&setorId={setor}"));
            Assert.True(daRota.GetProperty("chamadosAbertos").GetInt32() > 0);

            var r = await f.Chamar(b.Instituicao.Slug, token, "ver_indicadores", new { de = "2026-11-01", ate = "2026-11-30", setorId = setor });

            Assert.False(r.Erro, r.Texto);
            Assert.True(JsonNode.DeepEquals(Normal(daRota), Normal(r.Json())), $"{r.Texto}\n{daRota}");
        }
    }

    [Fact]
    public async Task Ver_indicadores_repete_os_erros_da_rota()
    {
        var (b, token) = await Mundo();
        var lider = await f.Atendente(b.Instituicao, await SetorDeLideranca(b.Instituicao));
        var tokenLider = await f.NovoTokenMcp(b.Instituicao, lider.Usuario);
        var casos = new (HttpClient cliente, string token, string consulta, object args)[]
        {
            (b.A.Cliente, token, "de=2026-11-30&ate=2026-11-01", new { de = "2026-11-30", ate = "2026-11-01" }),
            (b.A.Cliente, token, "ate=2026-11-01", new { ate = "2026-11-01" }),
            (b.A.Cliente, token, $"{Periodo}&setorId={b.Outro.Id}", new { de = "2026-11-01", ate = "2026-11-30", setorId = b.Outro.Id }),
            (lider.Cliente, tokenLider, Periodo, new { de = "2026-11-01", ate = "2026-11-30" }),
        };
        foreach (var (cliente, t, consulta, args) in casos)
        {
            var rota = await cliente.GetAsync($"/api/indicadores?{consulta}");
            Assert.True((int)rota.StatusCode is 400 or 403, consulta);
            var detalhe = (await rota.Json()).GetProperty("detail").GetString();

            var r = await f.Chamar(b.Instituicao.Slug, t, "ver_indicadores", args);

            Assert.True(r.Erro, consulta);
            Assert.Equal(detalhe, r.Texto);
        }
        Assert.Contains("Este setor não é seu.", (await f.Chamar(b.Instituicao.Slug, token, "ver_indicadores", casos[2].args)).Texto);
    }

    async Task<List<string>> Foto()
    {
        var tabelas = await f.Db(null, db => db.Database.SqlQueryRaw<string>("SELECT table_name AS \"Value\" FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> '__EFMigrationsHistory' ORDER BY 1").ToListAsync());
        var foto = new List<string>();
        foreach (var t in tabelas)
        {
            var origem = t == "token_mcp" ? "(SELECT id, instituicao_id, usuario_id, nome, hash, final, criado_em, expira_em, revogado_em FROM token_mcp)" : $"\"{t}\"";
            var sql = $"SELECT '{t}:' || count(*) || ':' || coalesce(md5(string_agg(x::text, '|' ORDER BY x::text)), '') AS \"Value\" FROM {origem} x";
            foto.Add(await f.Db(null, db => db.Database.SqlQueryRaw<string>(sql).SingleAsync()));
        }
        return foto;
    }

    [Fact]
    public async Task Ferramentas_nao_gravam_nada()
    {
        var (b, token) = await Mundo();
        var numero = await b.Chamado();
        await f.Artigo(b.Instituicao, "Boleto", "Como pagar o boleto.");
        var antes = await Foto();

        var chamadas = new (string nome, object args)[]
        {
            ("listar_chamados", new { }), ("listar_chamados", new { escopo = "nada" }), ("ver_chamado", new { numero }), ("ver_chamado", new { numero = "ONE-99999" }),
            ("buscar_conhecimento", new { consulta = "boleto" }), ("buscar_conhecimento", new { consulta = "" }),
            ("ver_indicadores", new { de = "2026-11-01", ate = "2026-11-30" }), ("ver_indicadores", new { de = "2026-11-30", ate = "2026-11-01" }),
        };
        foreach (var (nome, args) in chamadas) await f.Chamar(b.Instituicao.Slug, token, nome, args);

        Assert.Equal(antes, await Foto());
    }

    [Fact]
    public async Task Registra_ferramenta_usuario_e_resultado_sem_conteudo()
    {
        var i = await f.Instituicao();
        var u = await f.Usuario(i, [Papeis.Atendente]);
        var token = await f.NovoTokenMcp(i, u);
        await f.Artigo(i, "Titulo-resultado-qwe", "Resposta sobre marcador-unico-xyz no portal.");
        var antes = f.Logs.Entradas.Count;

        var ok = await f.Chamar(i.Slug, token, "buscar_conhecimento", new { consulta = "marcador-unico-xyz" });
        var erro = await f.Chamar(i.Slug, token, "buscar_conhecimento", new { consulta = "" });

        Assert.False(ok.Erro, ok.Texto);
        Assert.True(erro.Erro);
        Assert.Contains("Titulo-resultado-qwe", ok.Texto);
        var novas = f.Logs.Entradas.Skip(antes).ToList();
        var daFerramenta = novas.Where(l => l.Categoria.EndsWith("FerramentasMcp")).ToList();
        Assert.Equal(2, daFerramenta.Count);
        Assert.All(daFerramenta, l =>
        {
            Assert.Equal(LogLevel.Information, l.Nivel);
            Assert.Contains("buscar_conhecimento", l.Mensagem);
            Assert.Contains($"{u.Id}", l.Mensagem);
            Assert.Contains($"{i.Id}", l.Mensagem);
        });
        Assert.EndsWith("ok", daFerramenta[0].Mensagem);
        Assert.EndsWith("erro", daFerramenta[1].Mensagem);
        Assert.DoesNotContain(novas, l => l.Mensagem.Contains("marcador-unico-xyz") || l.Mensagem.Contains("Titulo-resultado-qwe"));
    }
}
