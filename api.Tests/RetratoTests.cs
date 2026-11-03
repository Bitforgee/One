using System.Net;
using System.Net.Http.Json;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

// vertical-slice-completa S1: a tabela de rotas e os corpos de erro gravados com o código da base (api.Tests/Retratos).
public class RetratoTests(OneFactory f) : IClassFixture<OneFactory>
{
    static string Retrato(string nome) => Path.Combine(ArquiteturaTests.Raiz(), "api.Tests", "Retratos", nome);

    static List<RouteEndpoint> Endpoints(OneFactory f) =>
        f.Services.GetRequiredService<EndpointDataSource>().Endpoints.OfType<RouteEndpoint>().ToList();

    static string Metodo(RouteEndpoint e) => e.Metadata.GetMetadata<HttpMethodMetadata>() is { } m ? string.Join(",", m.HttpMethods) : "*";

    static string Linha(RouteEndpoint e) =>
        $"{Metodo(e)} {e.RoutePattern.RawText} anonimo={e.Metadata.GetMetadata<IAllowAnonymous>() is not null} " +
        $"autorizacao={e.Metadata.GetOrderedMetadata<IAuthorizeData>().Any()} limite={e.Metadata.GetMetadata<EnableRateLimitingAttribute>()?.PolicyName ?? "-"}";

    // C3
    [Fact]
    public void Tabela_de_rotas_igual_a_da_base()
    {
        var endpoints = Endpoints(f);
        var viva = endpoints.Select(Linha).ToList();
        File.WriteAllLines(Path.Combine(AppContext.BaseDirectory, "rotas.viva.txt"), viva); // para comparar à mão quando falhar

        Assert.Equal(66, viva.Count);
        // os fallbacks têm a ordem int.MaxValue; o do MapFallbackToFile atende GET e HEAD
        var fallbacks = endpoints.Where(e => e.Order == int.MaxValue).Select(e => e.RoutePattern.RawText).ToList();
        Assert.Equal(["/api/{**resto}", "{*path:nonfile}"], fallbacks);
        Assert.Equal(63, endpoints.Count(e => e.Order != int.MaxValue && e.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods.Count == 1));
        Assert.Equal(["/api/auth/login", "/api/auth/primeiro-acesso", "/api/auth/definir-senha", "/api/auth/logout", "/api/instituicoes/{slug}"],
            endpoints.Where(e => e.Metadata.GetMetadata<IAllowAnonymous>() is not null).Select(e => e.RoutePattern.RawText));
        Assert.Equal(64, endpoints.Count(e => e.Metadata.GetOrderedMetadata<IAuthorizeData>().Any()));
        string[] Com(string politica) => [.. endpoints.Where(e => e.Metadata.GetMetadata<EnableRateLimitingAttribute>()?.PolicyName == politica).Select(e => e.RoutePattern.RawText!)];
        Assert.Equal(["/api/auth/login", "/api/auth/primeiro-acesso"], Com("auth"));
        Assert.Equal(["/api/conversas", "/api/conversas/{id:long}/mensagens", "/api/atendimento-direto"], Com("mensagens"));

        Assert.Equal(File.ReadAllLines(Retrato("rotas.txt")), viva);
    }

    // C5
    [Fact]
    public async Task Admin_403_com_detail_nas_29_rotas()
    {
        var i = await f.Instituicao();
        var setor = await f.Db(i.Id, db => db.Setores.SingleAsync());
        var clientes = new[] { (await f.AlunoLogado(i)).Cliente, (await f.Atendente(i, setor)).Cliente };
        var rotas = Endpoints(f).Where(e => e.RoutePattern.RawText!.StartsWith("/api/admin/"))
            .SelectMany(e => e.Metadata.GetMetadata<HttpMethodMetadata>()!.HttpMethods.Select(m => (m, e.RoutePattern.RawText!)))
            .ToList();
        Assert.Equal(29, rotas.Count);

        foreach (var c in clientes)
            foreach (var (metodo, padrao) in rotas)
            {
                var url = Regex.Replace(padrao, @"\{[^}]+\}", setor.Id.ToString());
                var r = await c.SendAsync(new HttpRequestMessage(new HttpMethod(metodo), url) { Content = metodo == "GET" ? null : JsonContent.Create(new { nome = "Intruso" }) });
                Assert.True(r.StatusCode == HttpStatusCode.Forbidden, $"{metodo} {padrao}: {(int)r.StatusCode}");
                Assert.Equal("Só administradores podem usar esta área.", (await r.Json()).GetProperty("detail").GetString());
            }
    }

    static string SemTraceId(string corpo) => Regex.Replace(corpo, @",?""traceId"":""[^""]*""", "");

    // C6: um pedido de cada status; o corpo sem traceId é comparado byte a byte com o gravado na base
    async Task<List<string>> Corpos()
    {
        var c = await Cenario.Criar(f);
        var (id, _) = await c.Primeira();
        await c.Cliente.PostAsync($"/api/conversas/{id}/encerrar", null);
        var atendente = await f.Entrar(c.Instituicao, await f.Usuario(c.Instituicao, [Papeis.Atendente]));
        var numero = (await (await c.Cliente.PostAsJsonAsync("/api/atendimento-direto", new { descricao = "oi" })).Json()).GetProperty("numero").GetString()!;

        var respostas = new List<(int, HttpResponseMessage)>
        {
            (400, await c.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "" })),
            (401, await f.Cliente().Login(c.Instituicao.Slug, c.Aluno.Usuario.Cpf, "senha-errada")),
            (403, await atendente.PostAsJsonAsync("/api/conversas", new { mensagem = "oi" })),
            (404, await f.Cliente().GetAsync("/api/instituicoes/nao-existe")),
            (409, await c.Cliente.PostAsync($"/api/conversas/{id}/encerrar", null)),
            (413, await Balcao.ComAnexos(c.Cliente, numero, "segue", "PUBLICA", ("a.pdf", Balcao.Arquivo(Balcao.Pdf, 10 * 1024 * 1024 + 1)))),
            (415, await Balcao.ComAnexos(c.Cliente, numero, "segue", "PUBLICA", ("a.pdf", Balcao.Arquivo(Balcao.Exe, 100)))),
        };

        await using var limitado = new OneFactoryComLimites();
        await limitado.InitializeAsync();
        var cliente = limitado.Cliente();
        HttpResponseMessage ultimo = null!;
        for (var n = 0; n < 6; n++) ultimo = await cliente.Login("qualquer", Semente.NovoCpf(), "x");
        respostas.Add((429, ultimo));

        using (f.MinioFora())
            respostas.Add((503, await Balcao.ComAnexos(c.Cliente, numero, "segue", "PUBLICA", ("a.png", Balcao.Arquivo(Balcao.Png, 100)))));

        var linhas = new List<string>();
        foreach (var (status, r) in respostas)
        {
            Assert.Equal(status, (int)r.StatusCode);
            linhas.Add($"{status} {SemTraceId(await r.Content.ReadAsStringAsync())}");
        }
        return linhas;
    }

    [Fact]
    public async Task Corpos_de_erro_iguais_aos_da_base()
    {
        var vivos = await Corpos();
        File.WriteAllLines(Path.Combine(AppContext.BaseDirectory, "erros.vivos.txt"), vivos); // para comparar à mão quando falhar

        var gravados = File.ReadAllLines(Retrato("erros.txt"));
        Assert.Equal(9, gravados.Length);
        Assert.Equal(gravados.Select(SemTraceId), vivos);
    }

    // dominio-e-contratos S1: os corpos de sucesso, o 400 da importação e as gravações do chamado, gravados com o código da base.

    // Só os ids gerados pelo banco (membros id e *Id numéricos), os números ONE-n e os instantes viram marcadores do mesmo tipo JSON.
    static string Normalizar(string corpo)
    {
        corpo = Regex.Replace(corpo, @"""(id|[a-z][A-Za-z]*Id)"":\d+", @"""$1"":0");
        corpo = Regex.Replace(corpo, @"ONE-\d+", "ONE-n");
        return Regex.Replace(corpo, @"""\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?""", @"""instante""");
    }

    // Banco novo: os ids que não são membro id/*Id (os setores do usuário) saem sempre iguais.
    static async Task<OneFactory> Nova()
    {
        var n = new OneFactory();
        await n.InitializeAsync();
        return n;
    }

    // Pessoa com nome, CPF e e-mail fixos: os nomes aparecem nos corpos e nas gravações.
    static async Task<Usuario> Pessoa(OneFactory n, Instituicao i, string nome, string cpf, string[] papeis, string? matricula = null, string? senha = Semente.Senha)
    {
        var u = await n.Usuario(i, papeis, senha, cpf, $"{cpf}@retrato.one", matricula);
        await n.Db(i.Id, db => db.Usuarios.Where(x => x.Id == u.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.Nome, nome)));
        return u;
    }

    static async Task<(HttpClient, long)> Equipe(OneFactory n, Instituicao i, string nome, string cpf, Setor setor)
    {
        var u = await Pessoa(n, i, nome, cpf, [Papeis.Atendente]);
        await n.Db(i.Id, async db =>
        {
            db.AtendenteSetores.Add(new AtendenteSetor { UsuarioId = u.Id, SetorId = setor.Id });
            await db.SaveChangesAsync();
        });
        return (await n.Entrar(i, u), u.Id);
    }

    static async Task<JsonElement> Ok(Task<HttpResponseMessage> pedido)
    {
        var r = await pedido;
        var corpo = await r.Content.ReadAsStringAsync();
        Assert.True(r.IsSuccessStatusCode, $"{r.RequestMessage?.Method} {r.RequestMessage?.RequestUri}: {(int)r.StatusCode} {corpo}");
        return corpo.Length == 0 ? default : JsonDocument.Parse(corpo).RootElement;
    }

    static async Task<string> Novo(HttpClient aluno, string descricao) =>
        (await Ok(aluno.PostAsJsonAsync("/api/atendimento-direto", new { descricao }))).GetProperty("numero").GetString()!;

    static Task<HttpResponseMessage> ComAnexo(HttpClient c, string numero, string texto, bool aguardaAluno, string nome, int tamanho) =>
        c.PostAsync($"/api/chamados/{numero}/mensagens", new MultipartFormDataContent
        {
            { new StringContent("PUBLICA"), "tipo" },
            { new StringContent(texto), "texto" },
            { new StringContent(aguardaAluno ? "true" : "false"), "aguardaAluno" },
            { new ByteArrayContent(Balcao.Arquivo(Balcao.Pdf, tamanho)), "anexos", nome },
        });

    // As 59 chamadas de C4, numa instituição com nomes, CPFs e textos fixos; cada linha: método, rota, ator, status e corpo normalizado.
    static async Task<List<string>> Sucessos(OneFactory n)
    {
        var linhas = new List<string>();
        async Task<JsonElement> R(string metodo, string rota, string ator, int status, Task<HttpResponseMessage> pedido)
        {
            var r = await pedido;
            var corpo = await r.Content.ReadAsStringAsync();
            Assert.True((int)r.StatusCode == status, $"{metodo} {rota} {ator}: {(int)r.StatusCode} {corpo}");
            linhas.Add($"{metodo} {rota} {ator} {status} {Normalizar(corpo)}");
            return JsonDocument.Parse(corpo).RootElement;
        }
        static long Id(JsonElement j) => j.GetProperty("id").GetInt64();

        var i = await n.Instituicao(slug: "retrato", nome: "Univag");
        var triagem = await n.Db(i.Id, db => db.Setores.SingleAsync());
        var boleto = await n.Artigo(i, "Como emitir o boleto do semestre", Cenario.RespostaBoleto, [Cenario.LinkBoleto, Cenario.LinkBiblioteca]);
        var ana = await Pessoa(n, i, "Ana Aluna", "11122233396", [Papeis.Aluno], "2026000001");
        await Pessoa(n, i, "Davi Novo", "44455566619", [Papeis.Aluno], "2026000004", senha: null);
        var (atendente, _) = await Equipe(n, i, "Beto Atendente", "22233344405", triagem);
        var admin = await n.Entrar(i, await Pessoa(n, i, "Carla Admin", "33344455508", [Papeis.Administrador]));
        var (anonimo, aluno) = (n.Cliente(), n.Cliente());

        // Acesso (4)
        await R("POST", "/api/auth/login", "aluno", 200, aluno.Login(i.Slug, ana.Cpf));
        await R("POST", "/api/auth/primeiro-acesso", "anonimo", 202, anonimo.PostAsJsonAsync("/api/auth/primeiro-acesso", new { instituicao = i.Slug, cpf = "44455566619" }));
        await R("GET", "/api/auth/me", "aluno", 200, aluno.GetAsync("/api/auth/me"));
        await R("GET", "/api/instituicoes/{slug}", "anonimo", 200, anonimo.GetAsync($"/api/instituicoes/{i.Slug}"));

        // Administração: cadastros (15)
        await R("GET", "/api/admin/setores", "admin", 200, admin.GetAsync("/api/admin/setores"));
        var financeiro = Id(await R("POST", "/api/admin/setores", "admin", 201, admin.PostAsJsonAsync("/api/admin/setores", new { nome = "Financeiro", triagem = false })));
        await R("PUT", "/api/admin/setores/{id}", "admin", 200, admin.PutAsJsonAsync($"/api/admin/setores/{financeiro}", new { nome = "Financeiro e Bolsas", triagem = false, ativo = true }));
        await R("GET", "/api/admin/categorias", "admin", 200, admin.GetAsync("/api/admin/categorias"));
        var categoria = Id(await R("POST", "/api/admin/categorias", "admin", 201, admin.PostAsJsonAsync("/api/admin/categorias", new { nome = "Boleto" })));
        await R("PUT", "/api/admin/categorias/{id}", "admin", 200, admin.PutAsJsonAsync($"/api/admin/categorias/{categoria}", new { nome = "Boletos", ativa = true }));
        await R("GET", "/api/admin/cursos", "admin", 200, admin.GetAsync("/api/admin/cursos"));
        var curso = Id(await R("POST", "/api/admin/cursos", "admin", 201, admin.PostAsJsonAsync("/api/admin/cursos", new { nome = "Direito", setorCoordenacaoId = financeiro })));
        await R("PUT", "/api/admin/cursos/{id}", "admin", 200, admin.PutAsJsonAsync($"/api/admin/cursos/{curso}", new { nome = "Direito Noturno", setorCoordenacaoId = financeiro }));
        await R("GET", "/api/admin/respostas-prontas", "admin", 200, admin.GetAsync("/api/admin/respostas-prontas"));
        var pronta = Id(await R("POST", "/api/admin/respostas-prontas", "admin", 201,
            admin.PostAsJsonAsync("/api/admin/respostas-prontas", new { setorId = triagem.Id, titulo = "Boleto", texto = "Use o Portal do Aluno." })));
        await R("PUT", "/api/admin/respostas-prontas/{id}", "admin", 200,
            admin.PutAsJsonAsync($"/api/admin/respostas-prontas/{pronta}", new { setorId = triagem.Id, titulo = "Segunda via do boleto", texto = "Use o Portal do Aluno, menu Financeiro." }));
        await R("GET", "/api/admin/regras", "admin", 200, admin.GetAsync("/api/admin/regras"));
        var regra = Id(await R("POST", "/api/admin/regras", "admin", 201, admin.PostAsJsonAsync("/api/admin/regras", new { categoriaId = categoria, destino = "SETOR", setorId = financeiro })));
        await R("PUT", "/api/admin/regras/{id}", "admin", 200, admin.PutAsJsonAsync($"/api/admin/regras/{regra}", new { categoriaId = categoria, destino = "COORDENACAO_CURSO" }));

        // Administração: usuários (4) e importação (1)
        await R("GET", "/api/admin/usuarios", "admin", 200, admin.GetAsync("/api/admin/usuarios"));
        var eva = Id(await R("POST", "/api/admin/usuarios", "admin", 201, admin.PostAsJsonAsync("/api/admin/usuarios",
            new { cpf = "55566677720", nome = "Eva Atendente", email = "eva@retrato.one", senhaTemporaria = "senha-temporaria", papeis = new[] { Papeis.Atendente }, setores = new[] { triagem.Id } })));
        await R("PUT", "/api/admin/usuarios/{id}", "admin", 200, admin.PutAsJsonAsync($"/api/admin/usuarios/{eva}",
            new { cpf = "55566677720", nome = "Eva Atendente Silva", email = "eva.silva@retrato.one", papeis = new[] { Papeis.Atendente }, setores = new[] { financeiro } }));
        await R("POST", "/api/admin/usuarios/{id}/desativar", "admin", 200, admin.PostAsync($"/api/admin/usuarios/{eva}/desativar", null));
        await R("POST", "/api/admin/matriculas/importacao", "admin", 200, admin.Importar(
            "cpf;nome;email;matricula;curso;semestre;situacao\n66677788830;Fabio Importado;fabio@retrato.one;2026000006;Análise e Desenvolvimento de Sistemas;2;ATIVA\n"));

        // Administração: artigos (5) e documentos (4)
        await R("GET", "/api/admin/artigos", "admin", 200, admin.GetAsync("/api/admin/artigos"));
        var artigo = new { titulo = "Trancamento de matrícula", perguntas = new[] { "Como tranco a matrícula?" }, categoriaId = categoria, resposta = "Peça o trancamento na secretaria.",
            links = new[] { "https://portal.exemplo/trancamento" }, visivelDe = "2026-11-01", visivelAte = "2026-12-31" };
        var artigoId = Id(await R("POST", "/api/admin/artigos", "admin", 201, admin.PostAsJsonAsync("/api/admin/artigos", artigo)));
        await R("PUT", "/api/admin/artigos/{id}", "admin", 200, admin.PutAsJsonAsync($"/api/admin/artigos/{artigoId}", artigo with { resposta = "Peça o trancamento na secretaria até o dia 30." }));
        await R("POST", "/api/admin/artigos/{id}/ativar", "admin", 200, admin.PostAsync($"/api/admin/artigos/{artigoId}/ativar", null));
        await R("POST", "/api/admin/artigos/{id}/arquivar", "admin", 200, admin.PostAsync($"/api/admin/artigos/{artigoId}/arquivar", null));
        var documento = Id(await R("POST", "/api/admin/documentos", "admin", 201, admin.Subir("Regulamento acadêmico", categoria, Pdfs.Criar("Regulamento academico, pagina um."))));
        await R("POST", "/api/admin/documentos/{id}/versoes", "admin", 201, admin.NovaVersao(documento, Pdfs.Criar("Regulamento academico, versao dois.", "Pagina dois.")));
        await R("GET", "/api/admin/documentos", "admin", 200, admin.GetAsync("/api/admin/documentos"));
        await R("POST", "/api/admin/documentos/{id}/arquivar", "admin", 200, admin.PostAsync($"/api/admin/documentos/{documento}/arquivar", null));

        // Assistente (7): a primeira resposta cita o artigo, a segunda não
        n.Llm.Devolver(Cenario.Resposta("Você encontra o boleto no Portal do Aluno, na área financeira.", [boleto.Id], (boleto.Id, Cenario.TrechoBoleto)));
        var conversa = (await R("POST", "/api/conversas", "aluno", 201, aluno.PostAsJsonAsync("/api/conversas", new { mensagem = "preciso do boleto" }))).GetProperty("conversaId").GetInt64();
        n.Llm.Devolver(new { tipo = "sem_base", texto = "" });
        await R("POST", "/api/conversas/{id}/mensagens", "aluno", 200, aluno.PostAsJsonAsync($"/api/conversas/{conversa}/mensagens", new { mensagem = "e qual é o prazo?" }));
        var t1 = (await R("POST", "/api/conversas/{id}/transferir", "aluno", 201, aluno.PostAsJsonAsync($"/api/conversas/{conversa}/transferir", new { }))).GetProperty("numero").GetString()!;
        await R("GET", "/api/conversas/{id}", "aluno", 200, aluno.GetAsync($"/api/conversas/{conversa}"));
        var avaliada = (await Ok(aluno.PostAsJsonAsync("/api/conversas", new { mensagem = "outra dúvida" }))).GetProperty("conversaId").GetInt64();
        await R("POST", "/api/conversas/{id}/avaliacao", "aluno", 200, aluno.PostAsJsonAsync($"/api/conversas/{avaliada}/avaliacao", new { resolveu = true }));
        var encerrada = (await Ok(aluno.PostAsJsonAsync("/api/conversas", new { mensagem = "mais uma dúvida" }))).GetProperty("conversaId").GetInt64();
        await R("POST", "/api/conversas/{id}/encerrar", "aluno", 200, aluno.PostAsync($"/api/conversas/{encerrada}/encerrar", null));
        var t2 = (await R("POST", "/api/atendimento-direto", "aluno", 201, aluno.PostAsJsonAsync("/api/atendimento-direto", new { descricao = "Preciso de ajuda com a matrícula" })))
            .GetProperty("numero").GetString()!;

        // Chamados (17) e conhecimento e indicadores (2)
        await R("GET", "/api/chamados/{numero}", "aluno", 200, aluno.GetAsync($"/api/chamados/{t1}"));
        await R("GET", "/api/chamados/{numero}", "atendente", 200, atendente.GetAsync($"/api/chamados/{t1}"));
        await R("GET", "/api/chamados?escopo=fila", "atendente", 200, atendente.GetAsync("/api/chamados?escopo=fila"));
        await R("GET", "/api/chamados?escopo=fila", "aluno", 200, aluno.GetAsync("/api/chamados?escopo=fila"));
        await R("GET", "/api/respostas-prontas?setorId={id}", "atendente", 200, atendente.GetAsync($"/api/respostas-prontas?setorId={triagem.Id}"));
        var versao = await n.Db(i.Id, db => db.VersoesArtigo.Where(v => v.ArtigoId == boleto.Id).Select(v => v.Id).SingleAsync());
        await R("GET", "/api/artigos/versoes/{id}", "atendente", 200, atendente.GetAsync($"/api/artigos/versoes/{versao}"));

        await R("POST", "/api/chamados/{numero}/mensagens", "aluno", 201, Balcao.Mensagem(aluno, t1, "Segue o comprovante."));
        await R("POST", "/api/chamados/{numero}/mensagens", "atendente", 201, Balcao.Mensagem(atendente, t1, "Vou verificar o boleto."));
        await R("POST", "/api/chamados/{numero}/mensagens", "atendente-nota", 201, Balcao.Mensagem(atendente, t1, "Aluno ligou também.", "NOTA"));
        await R("POST", "/api/chamados/{numero}/resolver", "atendente", 200, atendente.PostAsJsonAsync($"/api/chamados/{t1}/resolver", new { texto = "Boleto reemitido no portal." }));
        await R("POST", "/api/chamados/{numero}/rejeitar", "aluno", 200, aluno.PostAsJsonAsync($"/api/chamados/{t1}/rejeitar", new { motivo = "O boleto continua com erro." }));
        await Ok(atendente.PostAsJsonAsync($"/api/chamados/{t1}/resolver", new { texto = "Boleto corrigido." }));
        await R("POST", "/api/chamados/{numero}/confirmar", "aluno", 200, aluno.PostAsync($"/api/chamados/{t1}/confirmar", null));

        await R("POST", "/api/chamados/{numero}/assumir", "atendente", 200, atendente.PostAsync($"/api/chamados/{t2}/assumir", null));
        await R("POST", "/api/chamados/{numero}/reclassificar", "atendente", 200, atendente.PostAsJsonAsync($"/api/chamados/{t2}/reclassificar", new { categoriaId = categoria }));
        await R("POST", "/api/chamados/{numero}/encaminhar", "atendente", 200, atendente.PostAsJsonAsync($"/api/chamados/{t2}/encaminhar", new { setorId = financeiro, motivo = "É do financeiro." }));
        var t3 = await Novo(aluno, "Segunda via do boleto");
        await R("POST", "/api/chamados/{numero}/cancelar", "aluno", 200, aluno.PostAsJsonAsync($"/api/chamados/{t3}/cancelar", new { motivo = "Resolvi sozinho." }));
        var t4 = await Novo(aluno, "Boleto em dobro");
        await R("POST", "/api/chamados/{numero}/duplicado", "atendente", 200, atendente.PostAsJsonAsync($"/api/chamados/{t4}/duplicado", new { numeroOriginal = t3 }));
        await R("GET", "/api/chamados", "aluno", 200, aluno.GetAsync("/api/chamados"));
        await R("GET", "/api/indicadores?de={de}&ate={ate}", "admin", 200, admin.GetAsync("/api/indicadores?de=2026-11-01&ate=2026-11-30"));
        return linhas;
    }

    // C4
    [Fact]
    public async Task Corpos_de_sucesso_iguais_aos_da_base()
    {
        await using var n = await Nova();
        var vivos = await Sucessos(n);
        File.WriteAllLines(Path.Combine(AppContext.BaseDirectory, "sucessos.vivos.txt"), vivos); // para comparar à mão quando falhar

        var gravados = File.ReadAllLines(Retrato("sucessos.txt"));
        Assert.Equal(59, gravados.Length);
        Assert.Equal(gravados.Select(Normalizar), vivos);
    }

    // C5
    [Fact]
    public async Task Erros_da_importacao_iguais_aos_da_base()
    {
        var (_, admin) = await Admin.Criar(f);
        Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/api/admin/cursos", new { nome = "Direito" })).StatusCode);
        var r = await admin.Importar(string.Join("\n",
            "cpf;nome;email;matricula;curso;semestre;situacao",
            "123;Ana;ana@retrato.one;2026000001;Direito;3;ATIVA",
            "11122233396;;sem-arroba;2026000002;Direito;13;ATIVA",
            "22233344405;Bia;bia@retrato.one;;Medicina;2;TRANCADA",
            "33344455508;Caio;caio@retrato.one;2026000004;Direito;2",
            "44455566619;Duda;duda@retrato.one;2026000005;Direito;4;ATIVA") + "\n");
        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        Assert.Equal(4, (await r.Json()).GetProperty("erros").GetArrayLength());
        var vivo = $"400 {SemTraceId(await r.Content.ReadAsStringAsync())}";
        File.WriteAllText(Path.Combine(AppContext.BaseDirectory, "importacao.vivo.txt"), vivo); // para comparar à mão quando falhar

        var gravado = File.ReadAllLines(Retrato("importacao.txt"));
        Assert.Single(gravado);
        Assert.Equal(SemTraceId(gravado[0]), vivo);
    }

    static Task<(long Mensagem, long Evento)> Marcas(OneFactory n, Instituicao i, string numero) =>
        n.Db(i.Id, async db =>
        {
            var id = await db.Chamados.Where(c => c.Numero == numero).Select(c => c.Id).SingleAsync();
            return (await db.MensagensChamado.Where(m => m.ChamadoId == id).MaxAsync(m => (long?)m.Id) ?? 0,
                await db.EventosChamado.Where(e => e.ChamadoId == id).MaxAsync(e => (long?)e.Id) ?? 0);
        });

    static readonly JsonSerializerOptions Legivel = new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    // Uma linha de C6: as colunas do chamado (pessoas, setor e categorias por nome; datas em minutos relativos ao relógio) e as
    // mensagens e os eventos gravados depois das marcas, em ordem de Id.
    static Task<string> Linha(OneFactory n, Instituicao i, string caso, string numero, (long Mensagem, long Evento) antes) =>
        n.Db(i.Id, async db =>
        {
            var c = await db.Chamados.SingleAsync(x => x.Numero == numero);
            var pessoas = await db.Usuarios.ToDictionaryAsync(u => u.Id, u => u.Nome);
            var setores = await db.Setores.ToDictionaryAsync(s => s.Id, s => s.Nome);
            var categorias = await db.Categorias.ToDictionaryAsync(x => x.Id, x => x.Nome);
            var agora = n.Relogio.GetUtcNow().UtcDateTime;
            int? Minutos(DateTime? d) => d is { } x ? (int)Math.Round((x - agora).TotalMinutes) : null;
            string Nome(long? id) => id is { } x ? pessoas[x] : "Sistema";
            var mensagens = await db.MensagensChamado.Where(m => m.ChamadoId == c.Id && m.Id > antes.Mensagem).OrderBy(m => m.Id)
                .Select(m => new { m.Id, m.Tipo, m.AutorId, m.Texto }).ToListAsync();
            var ids = mensagens.Select(m => m.Id).ToList();
            var anexos = (await db.Anexos.Where(x => ids.Contains(x.MensagemChamadoId)).OrderBy(x => x.Id)
                .Select(x => new { x.MensagemChamadoId, x.Nome, x.Tipo, x.Tamanho }).ToListAsync()).ToLookup(x => x.MensagemChamadoId);
            var eventos = await db.EventosChamado.Where(e => e.ChamadoId == c.Id && e.Id > antes.Evento).OrderBy(e => e.Id)
                .Select(e => new { e.Tipo, e.AtorId, e.De, e.Para, e.Detalhe, e.CriadoEm }).ToListAsync();
            var linha = new
            {
                c.Estado,
                ResponsavelId = c.ResponsavelId is { } r ? pessoas[r] : null,
                SetorId = setores[c.SetorId],
                CategoriaId = categorias[c.CategoriaId],
                CategoriaOriginalId = categorias[c.CategoriaOriginalId],
                c.OrigemCategoria, c.Titulo, c.Resumo, c.Semestre, c.MotivoFechamento, c.Reaberturas, c.Encaminhamentos, c.NumeroOriginal,
                CriadoEm = Minutos(c.CriadoEm), ResolvidoEm = Minutos(c.ResolvidoEm), FechadoEm = Minutos(c.FechadoEm),
                AguardandoDesde = Minutos(c.AguardandoDesde), LembreteEm = Minutos(c.LembreteEm),
                Mensagens = mensagens.Select(m => new { m.Tipo, Autor = Nome(m.AutorId), m.Texto, Anexos = anexos[m.Id].Select(x => new { x.Nome, x.Tipo, x.Tamanho }) }),
                Eventos = eventos.Select(e => new { e.Tipo, Ator = Nome(e.AtorId), e.De, e.Para, e.Detalhe, CriadoEm = Minutos(e.CriadoEm) }),
            };
            return Regex.Replace($"{caso} {JsonSerializer.Serialize(linha, Legivel)}", @"ONE-\d+", "ONE-n");
        });

    // Os 21 casos de C6 (24 chamados); o estado de partida sai só de rotas, do Agendador e de ExecuteUpdate.
    static async Task<List<string>> Gravacoes(OneFactory n)
    {
        var i = await n.Instituicao(slug: "gravacoes", nome: "Univag");
        var triagem = await n.Db(i.Id, db => db.Setores.SingleAsync());
        var financeiro = await n.Setor(i, "Financeiro");
        var boleto = await n.Categoria(i, "Boleto");
        var aluno = await n.Entrar(i, await Pessoa(n, i, "Ana Aluna", "11122233396", [Papeis.Aluno], "2026000001"));
        var (a, _) = await Equipe(n, i, "Atendente A", "22233344405", triagem);
        var (b, _) = await Equipe(n, i, "Atendente B", "33344455508", triagem);
        var (c, cId) = await Equipe(n, i, "Atendente C", "44455566619", triagem);
        var (d, dId) = await Equipe(n, i, "Atendente D", "55566677720", triagem);
        var admin = await n.Entrar(i, await Pessoa(n, i, "Admin", "66677788830", [Papeis.Administrador]));
        var linhas = new List<string>();

        Task Assumir(HttpClient x, string numero) => Ok(x.PostAsync($"/api/chamados/{numero}/assumir", null));
        Task Aguardar(HttpClient x, string numero) => Ok(Balcao.Mensagem(x, numero, "Envie o comprovante, por favor.", aguardaAluno: true));
        Task Resolver(HttpClient x, string numero) => Ok(x.PostAsJsonAsync($"/api/chamados/{numero}/resolver", new { texto = "Boleto reemitido." }));
        Task Confirmar(string numero) => Ok(aluno.PostAsync($"/api/chamados/{numero}/confirmar", null));
        async Task Caso(string caso, string numero, Func<Task<HttpResponseMessage>> acao)
        {
            var antes = await Marcas(n, i, numero);
            await Ok(acao());
            linhas.Add(await Linha(n, i, caso, numero, antes));
        }
        Task<HttpResponseMessage> Acao(HttpClient x, string numero, string acao, object corpo) => x.PostAsJsonAsync($"/api/chamados/{numero}/{acao}", corpo);

        // G7 e G21 precisam do LembreteEm gravado pelo Agendador: AGUARDANDO_ALUNO há 4 dias
        var g7 = await Novo(aluno, "Pedido G7");
        await Assumir(a, g7);
        await Aguardar(a, g7);
        var g21 = new[] { await Novo(aluno, "Pedido G21 em atendimento"), await Novo(aluno, "Pedido G21 aguardando"), await Novo(aluno, "Pedido G21 resolvido"), await Novo(aluno, "Pedido G21 fechado") };
        foreach (var x in g21) await Assumir(d, x);
        await Aguardar(d, g21[1]);
        await Resolver(d, g21[2]);
        await Resolver(d, g21[3]);
        await Confirmar(g21[3]);
        foreach (var x in new[] { g7, g21[1] })
            await n.Db(i.Id, db => db.Chamados.Where(ch => ch.Numero == x).ExecuteUpdateAsync(s => s.SetProperty(ch => ch.AguardandoDesde, ch => ch.AguardandoDesde - TimeSpan.FromDays(4))));
        await n.Services.GetRequiredService<Agendador>().Executar();

        var conversa = (await Ok(aluno.PostAsJsonAsync("/api/conversas", new { mensagem = "Quero a segunda via do boleto" }))).GetProperty("conversaId").GetInt64();
        var g1 = (await Ok(aluno.PostAsJsonAsync($"/api/conversas/{conversa}/transferir", new { }))).GetProperty("numero").GetString()!;
        linhas.Add(await Linha(n, i, "G1", g1, (0, 0)));
        linhas.Add(await Linha(n, i, "G2", await Novo(aluno, "Pedido G2"), (0, 0)));

        var g3 = await Novo(aluno, "Pedido G3");
        await Caso("G3", g3, () => Balcao.Mensagem(aluno, g3, "Mensagem G3"));
        var g4 = await Novo(aluno, "Pedido G4");
        await Assumir(a, g4);
        await Aguardar(a, g4);
        await Caso("G4", g4, () => ComAnexo(aluno, g4, "Segue o comprovante G4", false, "comprovante.pdf", 1000));
        var g5 = await Novo(aluno, "Pedido G5");
        await Assumir(a, g5);
        await Resolver(a, g5);
        await Caso("G5", g5, () => Balcao.Mensagem(aluno, g5, "Ainda não resolveu G5"));

        var g6 = await Novo(aluno, "Pedido G6");
        await Caso("G6", g6, () => ComAnexo(a, g6, "Resposta G6", true, "orientacao.pdf", 2000));
        await Caso("G7", g7, () => Balcao.Mensagem(a, g7, "Ainda aguardo o comprovante G7", aguardaAluno: true));
        var g8 = await Novo(aluno, "Pedido G8");
        await Assumir(a, g8);
        await Caso("G8", g8, () => Balcao.Mensagem(a, g8, "Nota G8", "NOTA"));

        var g9 = await Novo(aluno, "Pedido G9");
        await Caso("G9", g9, () => a.PostAsync($"/api/chamados/{g9}/assumir", null));
        var g10 = await Novo(aluno, "Pedido G10");
        await Assumir(a, g10);
        await Aguardar(a, g10);
        await Caso("G10", g10, () => b.PostAsync($"/api/chamados/{g10}/assumir", null));
        var g11 = await Novo(aluno, "Pedido G11");
        await Caso("G11", g11, () => Acao(a, g11, "resolver", new { texto = "Resolvido G11" }));
        var g12 = await Novo(aluno, "Pedido G12");
        await Assumir(a, g12);
        await Resolver(a, g12);
        await Caso("G12", g12, () => aluno.PostAsync($"/api/chamados/{g12}/confirmar", null));

        var g13 = await Novo(aluno, "Pedido G13");
        await Assumir(a, g13);
        await Resolver(a, g13);
        await Caso("G13", g13, () => Acao(aluno, g13, "rejeitar", new { motivo = "Rejeito G13" }));
        var g14 = await Novo(aluno, "Pedido G14");
        await Assumir(c, g14);
        await Resolver(c, g14);
        await n.Db(i.Id, db => db.Usuarios.Where(u => u.Id == cId).ExecuteUpdateAsync(s => s.SetProperty(u => u.Ativo, false)));
        await Caso("G14", g14, () => Acao(aluno, g14, "rejeitar", new { motivo = "Rejeito G14" }));
        var g15 = await Novo(aluno, "Pedido G15");
        await Assumir(a, g15);
        await Aguardar(a, g15);
        await Caso("G15", g15, () => Acao(aluno, g15, "cancelar", new { motivo = "Cancelo G15" }));
        var g16 = await Novo(aluno, "Pedido G16");
        // "sem corpo": o JSON null liga o corpo nulo (Corpo?.Motivo); um POST sem Content-Type cai no fallback 404 na base
        await Caso("G16", g16, () => aluno.PostAsync($"/api/chamados/{g16}/cancelar", new StringContent("null", System.Text.Encoding.UTF8, "application/json")));

        var g17 = await Novo(aluno, "Pedido G17");
        await Assumir(a, g17);
        await Aguardar(a, g17);
        await Caso("G17", g17, () => Acao(a, g17, "encaminhar", new { setorId = financeiro.Id, motivo = "Encaminho G17" }));
        var g18 = await Novo(aluno, "Pedido G18");
        await Caso("G18", g18, () => Acao(a, g18, "encaminhar", new { setorId = financeiro.Id, motivo = "Encaminho G18" }));
        var g19 = await Novo(aluno, "Pedido G19");
        await Assumir(a, g19);
        await Resolver(a, g19);
        await Caso("G19", g19, () => Acao(a, g19, "reclassificar", new { categoriaId = boleto.Id }));
        var g20 = await Novo(aluno, "Pedido G20");
        await Assumir(a, g20);
        await Caso("G20", g20, () => Acao(a, g20, "duplicado", new { numeroOriginal = g3 }));

        var marcas = new List<(long, long)>();
        foreach (var x in g21) marcas.Add(await Marcas(n, i, x));
        await Ok(admin.PostAsync($"/api/admin/usuarios/{dId}/desativar", null));
        for (var k = 0; k < g21.Length; k++) linhas.Add(await Linha(n, i, $"G21.{k + 1}", g21[k], marcas[k]));
        return linhas;
    }

    // C6
    [Fact]
    public async Task Gravacoes_do_chamado_iguais_as_da_base()
    {
        await using var n = await Nova();
        var vivas = await Gravacoes(n);
        File.WriteAllLines(Path.Combine(AppContext.BaseDirectory, "gravacoes.vivas.txt"), vivas); // para comparar à mão quando falhar

        var gravadas = File.ReadAllLines(Retrato("gravacoes.txt"));
        Assert.Equal(24, gravadas.Length);
        Assert.Equal(gravadas, vivas);
    }
}
