using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Instituicoes.Plataforma;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class PlataformaTests(OneFactory f) : IClassFixture<OneFactory>
{
    const string SoOperador = "Só operadores da plataforma podem usar esta área.";
    const string Lista = "/api/plataforma/instituicoes";

    record Operando(Instituicao Instituicao, Usuario Usuario, HttpClient Cliente);

    async Task<Operando> UmOperador()
    {
        var i = await f.Instituicao();
        var u = await f.Usuario(i, [Papeis.Administrador, Papeis.Operador]);
        return new(i, u, await f.Entrar(i, u));
    }

    static object Corpo(string slug = "demo", string nome = "Faculdade Demo", string fuso = "America/Cuiaba", string cpf = "", string adminNome = "Dona Admin", string email = "admin@demo.edu.br") =>
        new { slug, nome, fuso, admin = new { cpf, nome = adminNome, email } };

    static Dictionary<string, object> CorpoMap(string slug, string cpf) =>
        new() { ["slug"] = slug, ["nome"] = "Faculdade Demo", ["fuso"] = "America/Cuiaba", ["admin"] = new { cpf, nome = "Dona Admin", email = "admin@demo.edu.br" } };

    static MultipartFormDataContent Arquivo(byte[] bytes)
    {
        var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(bytes), "arquivo", "carga.json");
        return form;
    }

    static MultipartFormDataContent Arquivo(string json) => Arquivo(System.Text.Encoding.UTF8.GetBytes(json));

    static string CargaJson() => JsonSerializer.Serialize(new
    {
        setores = new[] { new { nome = "Financeiro" }, new { nome = "Coordenação ADS" } },
        cursos = new[] { new { nome = "ADS", coordenacao = "Coordenação ADS" } },
        categorias = new[] { new { nome = "Boleto" }, new { nome = "Notas" } },
        regras = new object[] { new { categoria = "Boleto", setor = "Financeiro" }, new { categoria = "Notas", coordenacaoDoCurso = true } },
        artigos = new[]
        {
            new { titulo = "Como emitir o boleto do semestre", perguntas = new[] { "Onde tiro o boleto?" }, categoria = "Boleto", resposta = "O boleto fica no Portal do Aluno, menu Financeiro.", links = new[] { "https://portal.univag.edu.br" } },
            new { titulo = "Faltas não são abonadas", perguntas = new[] { "Posso abonar falta?" }, categoria = "Notas", resposta = "Faltas não são abonadas, nem com atestado.", links = Array.Empty<string>() },
            new { titulo = "Segunda via", perguntas = new[] { "Perdi o boleto" }, categoria = "Boleto", resposta = "Gere a segunda via no Portal do Aluno.", links = Array.Empty<string>() },
        },
    });


    static HttpRequestMessage Pedido(HttpMethod metodo, string url, bool corpoJson = false) =>
        new(metodo, url) { Content = corpoJson ? JsonContent.Create(new { slug = "x" }) : metodo == HttpMethod.Post ? Arquivo("{}") : null };

    static IEnumerable<HttpRequestMessage> SeisRotas() =>
    [
        Pedido(HttpMethod.Get, Lista),
        Pedido(HttpMethod.Post, Lista, corpoJson: true),
        Pedido(HttpMethod.Post, $"{Lista}/qualquer/carga"),
        Pedido(HttpMethod.Post, $"{Lista}/qualquer/desativar"),
        Pedido(HttpMethod.Post, $"{Lista}/qualquer/reativar"),
        Pedido(HttpMethod.Post, $"{Lista}/qualquer/reenviar-acesso"),
    ];

    [Fact]
    public async Task Rotas_403_sem_operador_e_401_sem_sessao()
    {
        var i = await f.Instituicao();
        var setor = await f.Db(i.Id, db => db.Setores.SingleAsync());
        var admin = await f.Usuario(i, [Papeis.Administrador]);
        var clientes = new[] { await f.Entrar(i, admin), (await f.Atendente(i, setor)).Cliente, (await f.AlunoLogado(i)).Cliente };

        var feitos = 0;
        foreach (var c in clientes)
            foreach (var pedido in SeisRotas())
            {
                var r = await c.SendAsync(pedido);
                Assert.True(r.StatusCode == HttpStatusCode.Forbidden, $"{pedido.Method} {pedido.RequestUri}: {(int)r.StatusCode}");
                Assert.Equal(SoOperador, (await r.Json()).GetProperty("detail").GetString());
                feitos++;
            }
        Assert.Equal(18, feitos);

        foreach (var pedido in SeisRotas())
        {
            var r = await f.Cliente().SendAsync(pedido);
            Assert.True(r.StatusCode == HttpStatusCode.Unauthorized, $"{pedido.Method} {pedido.RequestUri}: {(int)r.StatusCode}");
            feitos++;
        }
        Assert.Equal(24, feitos);
    }


    [Fact]
    public async Task Editar_usuario_preserva_operador()
    {
        var i = await f.Instituicao();
        var setor = await f.Db(i.Id, db => db.Setores.SingleAsync());
        var admin = await f.Entrar(i, await f.Usuario(i, [Papeis.Administrador]));
        var alvo = await f.Usuario(i, [Papeis.Administrador, Papeis.Operador]);
        Task<List<string>> PapeisDe() => f.Db(i.Id, db => db.UsuarioPapeis.Where(p => p.UsuarioId == alvo.Id).Select(p => p.Papel).OrderBy(p => p).ToListAsync());

        var r = await admin.PutAsJsonAsync($"/api/admin/usuarios/{alvo.Id}", new { cpf = alvo.Cpf.Valor, nome = alvo.Nome, email = alvo.Email, papeis = new[] { Papeis.Administrador } });
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Equal(["ADMINISTRADOR", "OPERADOR"], await PapeisDe());

        r = await admin.PutAsJsonAsync($"/api/admin/usuarios/{alvo.Id}", new { cpf = alvo.Cpf.Valor, nome = alvo.Nome, email = alvo.Email, papeis = new[] { Papeis.Atendente }, setores = new[] { setor.Id } });
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Equal(["ATENDENTE", "OPERADOR"], await PapeisDe());
    }

    [Fact]
    public async Task Tela_usuarios_nao_da_operador()
    {
        var i = await f.Instituicao();
        var admin = await f.Entrar(i, await f.Usuario(i, [Papeis.Administrador]));
        var alvo = await f.Usuario(i, [Papeis.Atendente]);
        var antes = await f.Db(i.Id, db => db.UsuarioPapeis.CountAsync());

        foreach (var papeis in new[] { new[] { "OPERADOR" }, ["ADMINISTRADOR", "OPERADOR"] })
        {
            var cpf = Semente.NovoCpf();
            var criar = await admin.PostAsJsonAsync("/api/admin/usuarios", new { cpf, nome = "Novo", email = $"{Guid.NewGuid():N}@teste.one", senhaTemporaria = "temporaria-1", papeis });
            var editar = await admin.PutAsJsonAsync($"/api/admin/usuarios/{alvo.Id}", new { cpf = alvo.Cpf.Valor, nome = alvo.Nome, email = alvo.Email, papeis });
            foreach (var r in new[] { criar, editar })
            {
                Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
                Assert.Equal("Escolha ao menos um papel.", (await r.Json()).GetProperty("errors").GetProperty("papeis")[0].GetString());
            }
            Assert.False(await f.Db(i.Id, db => db.Usuarios.AnyAsync(u => u.Cpf == Cpf.Ler(cpf))));
        }
        Assert.Equal(antes, await f.Db(i.Id, db => db.UsuarioPapeis.CountAsync()));
    }


    [Fact]
    public async Task Listar_todas_ativas_primeiro()
    {
        var op = await UmOperador();
        await f.Db(op.Instituicao.Id, db => db.Instituicoes.Where(x => x.Id == op.Instituicao.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.Nome, "Operadora Central")));
        var a = await f.Instituicao(nome: "Alfa Faculdade");
        var b = await f.Instituicao(nome: "Beta Faculdade");
        var c = await f.Instituicao(nome: "Aardvark Inativa");
        await f.Db(null, db => db.Instituicoes.Where(x => x.Id == c.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.Ativa, false)));
        await f.Usuario(a, [Papeis.Administrador]);
        await f.Usuario(a, [Papeis.Administrador]);
        var inativo = await f.Usuario(a, [Papeis.Administrador]);
        await f.Db(a.Id, db => db.Usuarios.Where(u => u.Id == inativo.Id).ExecuteUpdateAsync(s => s.SetProperty(u => u.Ativo, false)));
        await f.Usuario(a, [Papeis.Atendente]);

        var r = await op.Cliente.GetAsync(Lista);

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var minhas = new[] { a.Slug, b.Slug, op.Instituicao.Slug, c.Slug };
        var itens = (await r.Json()).EnumerateArray().Where(x => minhas.Contains(x.GetProperty("slug").GetString())).ToList();
        Assert.Equal(minhas, itens.Select(x => x.GetProperty("slug").GetString()));
        Assert.All(itens, x => Assert.Equal(["slug", "nome", "fuso", "ativa", "criadaEm", "administradores"], x.EnumerateObject().Select(p => p.Name)));
        Assert.Equal([true, true, true, false], itens.Select(x => x.GetProperty("ativa").GetBoolean()));
        Assert.Equal([2, 0, 1, 0], itens.Select(x => x.GetProperty("administradores").GetInt32()));
        Assert.Equal("America/Cuiaba", itens[0].GetProperty("fuso").GetString());
    }


    [Fact]
    public async Task Criar_instituicao_201()
    {
        var op = await UmOperador();
        var cpf = Semente.NovoCpf();
        var mascarado = $"{cpf[..3]}.{cpf[3..6]}.{cpf[6..9]}-{cpf[9..]}";

        var r = await op.Cliente.PostAsJsonAsync(Lista, Corpo(cpf: mascarado));

        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        Assert.Equal("/api/plataforma/instituicoes/demo", r.Headers.Location!.OriginalString);
        var j = await r.Json();
        Assert.Equal(("demo", "Faculdade Demo", "America/Cuiaba", true, 1), (j.GetProperty("slug").GetString(), j.GetProperty("nome").GetString(), j.GetProperty("fuso").GetString(), j.GetProperty("ativa").GetBoolean(), j.GetProperty("administradores").GetInt32()));
        var demo = await f.Db(null, db => db.Instituicoes.SingleAsync(x => x.Slug == "demo"));
        await f.Db(demo.Id, async db =>
        {
            var setor = await db.Setores.SingleAsync();
            Assert.Equal(("Triagem", true), (setor.Nome, setor.Triagem));
            var categoria = await db.Categorias.SingleAsync();
            Assert.Equal(("Não classificado", true), (categoria.Nome, categoria.Padrao));
            var admin = await db.Usuarios.Include(u => u.Papeis).SingleAsync();
            Assert.Equal((cpf, "Dona Admin", "admin@demo.edu.br"), (admin.Cpf.Valor, admin.Nome, admin.Email));
            Assert.Equal([Papeis.Administrador], admin.Papeis.Select(p => p.Papel));
            Assert.Equal(admin.Id, (await db.Tokens.SingleAsync()).UsuarioId);
        });
    }

    [Fact]
    public async Task Criar_grava_o_email_na_mesma_transacao()
    {
        var op = await UmOperador();
        var cpf = Semente.NovoCpf();
        var r = await op.Cliente.PostAsJsonAsync(Lista, Corpo(slug: "demo-email", nome: "Faculdade Demo", cpf: cpf, email: "admin@demo-email.edu.br"));
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);

        var demo = await f.Db(null, db => db.Instituicoes.SingleAsync(x => x.Slug == "demo-email"));
        var email = await f.Db(demo.Id, db => db.EmailsSaida.SingleAsync());
        Assert.Equal(("admin@demo-email.edu.br", "[Faculdade Demo] Crie sua senha"), (email.Destinatario, email.Assunto));
        var token = Regex.Match(email.Corpo, @"/demo-email/definir-senha\?token=(\S+)").Groups[1].Value;
        Assert.NotEqual("", token);
        var registro = await f.Db(demo.Id, db => db.Tokens.SingleAsync(t => t.Hash == Tokens.Hash(token)));
        Assert.True(registro.ExpiraEm > f.Relogio.GetUtcNow().UtcDateTime);

        f.Commit.Falhar = true;
        try { await op.Cliente.PostAsJsonAsync(Lista, Corpo(slug: "demo-falha", cpf: Semente.NovoCpf(), email: "admin@demo-falha.edu.br")); }
        catch (Exception) { }
        finally { f.Commit.Falhar = false; }
        Assert.False(await f.Db(null, db => db.Instituicoes.AnyAsync(x => x.Slug == "demo-falha")));
        Assert.False(await f.Db(null, db => db.EmailsSaida.IgnoreQueryFilters().AnyAsync(e => e.Destinatario == "admin@demo-falha.edu.br")));
    }

    [Fact]
    public async Task Falha_ao_gravar_o_email_nao_cria_a_instituicao()
    {
        var op = await UmOperador();
        f.Gravacoes.FalharAoGravarEmail = true;
        try { await op.Cliente.PostAsJsonAsync(Lista, Corpo(slug: "demo-sem-email", cpf: Semente.NovoCpf(), email: "admin@demo-sem-email.edu.br")); }
        catch (Exception) { }
        finally { f.Gravacoes.FalharAoGravarEmail = false; }

        Assert.False(await f.Db(null, db => db.Instituicoes.AnyAsync(x => x.Slug == "demo-sem-email")));
        Assert.False(await f.Db(null, db => db.Usuarios.IgnoreQueryFilters().AnyAsync(u => u.Email == "admin@demo-sem-email.edu.br")));
    }

    [Theory]
    [InlineData("slug", "ab")]
    [InlineData("slug", "Demo")]
    [InlineData("nome", "")]
    [InlineData("fuso", "Brasil/Cuiaba")]
    [InlineData("admin.cpf", "111.111.111-11")]
    [InlineData("admin.nome", "")]
    [InlineData("admin.email", "x")]
    public async Task Criar_invalido_400(string campo, string valor)
    {
        var op = await UmOperador();
        var corpo = CorpoMap(Semente.NovoSlug(), Semente.NovoCpf());
        var admin = new Dictionary<string, string?> { ["cpf"] = Semente.NovoCpf(), ["nome"] = "Dona Admin", ["email"] = "admin@demo.edu.br" };
        if (campo.StartsWith("admin.")) { admin[campo[6..]] = valor; corpo["admin"] = admin; }
        else corpo[campo] = valor;
        var antes = await f.Db(null, db => db.Instituicoes.CountAsync());

        var r = await op.Cliente.PostAsJsonAsync(Lista, corpo);

        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        Assert.Equal([campo], (await r.Json()).GetProperty("errors").EnumerateObject().Select(p => p.Name));
        Assert.Equal(antes, await f.Db(null, db => db.Instituicoes.CountAsync()));
    }

    [Fact]
    public async Task Slug_repetido_409()
    {
        var op = await UmOperador();
        var ativa = await f.Instituicao();
        var inativa = await f.Instituicao();
        await f.Db(null, db => db.Instituicoes.Where(x => x.Id == inativa.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.Ativa, false)));
        var antes = await f.Db(null, db => db.Instituicoes.CountAsync());

        foreach (var existente in new[] { ativa, inativa })
        {
            var r = await op.Cliente.PostAsJsonAsync(Lista, CorpoMap(existente.Slug, Semente.NovoCpf()));
            Assert.Equal(HttpStatusCode.Conflict, r.StatusCode);
            Assert.Equal("Esse endereço já está em uso.", (await r.Json()).GetProperty("detail").GetString());
        }
        Assert.Equal(antes, await f.Db(null, db => db.Instituicoes.CountAsync()));
    }


    [Fact]
    public async Task Carga_pela_rota_grava_na_instituicao_do_slug()
    {
        var op = await UmOperador();
        var alvo = await f.Instituicao();
        var caminho = Path.Combine(Path.GetTempPath(), $"carga-{Guid.NewGuid():N}.json");
        await File.WriteAllTextAsync(caminho, CargaJson());
        var comparada = await f.Instituicao();
        var (saida, erro) = (new StringWriter(), new StringWriter());
        Assert.Equal(0, await InstituicaoComando.Executar(f.Services, ["carga", "--slug", comparada.Slug, "--arquivo", caminho], saida, erro));
        var doComando = saida.ToString().Split('\n', StringSplitOptions.RemoveEmptyEntries).Select(l => l.Trim().Split(": ")).ToDictionary(p => p[0], p => int.Parse(p[1]));

        var r = await op.Cliente.PostAsync($"{Lista}/{alvo.Slug}/carga", Arquivo(CargaJson()));

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var j = await r.Json();
        Assert.Equal(["setores", "cursos", "categorias", "regras", "artigos"], j.EnumerateObject().Select(p => p.Name));
        Assert.Equal(doComando, j.EnumerateObject().ToDictionary(p => p.Name, p => p.Value.GetInt32()));
        Assert.Equal(new Dictionary<string, int> { ["setores"] = 2, ["cursos"] = 1, ["categorias"] = 2, ["regras"] = 2, ["artigos"] = 3 }, doComando);
        await f.Db(alvo.Id, async db =>
        {
            Assert.Equal(["Coordenação ADS", "Financeiro", "Triagem"], (await db.Setores.Select(s => s.Nome).ToListAsync()).Order());
            Assert.Equal(3, await db.Artigos.CountAsync());
        });
        await f.Db(op.Instituicao.Id, async db =>
        {
            Assert.Equal(["Triagem"], await db.Setores.Select(s => s.Nome).ToListAsync());
            Assert.Equal(0, await db.Artigos.CountAsync());
        });
    }

    [Fact]
    public async Task Carga_invalida_400_413_404()
    {
        var op = await UmOperador();
        var alvo = await f.Instituicao();
        Task<int[]> Contagens() => f.Db(alvo.Id, async db => new[] { await db.Setores.CountAsync(), await db.Categorias.CountAsync(), await db.Fluxos.CountAsync(), await db.Artigos.CountAsync() });
        var antes = await Contagens();
        const string regraSemCategoria = "{\"setores\":[{\"nome\":\"S\"}],\"regras\":[{\"categoria\":\"Nenhuma\",\"coordenacaoDoCurso\":true}]}";

        foreach (var json in new[] { "{", regraSemCategoria })
        {
            var r = await op.Cliente.PostAsync($"{Lista}/{alvo.Slug}/carga", Arquivo(json));
            Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
            var erros = (await r.Json()).GetProperty("errors").EnumerateObject().SelectMany(p => p.Value.EnumerateArray()).Select(e => e.GetString()).ToList();
            Assert.NotEmpty(erros);
            if (json != "{") Assert.Contains(erros, e => e!.StartsWith("regras[0].categoria"));
        }

        var grande = await op.Cliente.PostAsync($"{Lista}/{alvo.Slug}/carga", Arquivo(new byte[2 * 1024 * 1024 + 1]));
        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, grande.StatusCode);

        var inexistente = await op.Cliente.PostAsync($"{Lista}/nao-existe/carga", Arquivo(CargaJson()));
        Assert.Equal(HttpStatusCode.NotFound, inexistente.StatusCode);
        Assert.Equal("Instituição não encontrada.", (await inexistente.Json()).GetProperty("detail").GetString());
        Assert.Equal(antes, await Contagens());
    }


    [Fact]
    public async Task Desativar_bloqueia_login_e_sessao()
    {
        var op = await UmOperador();
        var demo = await f.Instituicao();
        var adminDemo = await f.Usuario(demo, [Papeis.Administrador]);
        var clienteAdmin = await f.Entrar(demo, adminDemo);
        var base_ = await f.Cliente().Login("nao-existe", adminDemo.Cpf.Valor);
        Assert.Equal(HttpStatusCode.OK, (await clienteAdmin.GetAsync("/api/auth/me")).StatusCode);

        var r = await op.Cliente.PostAsync($"{Lista}/{demo.Slug}/desativar", null);

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var j = await r.Json();
        Assert.Equal((demo.Slug, false), (j.GetProperty("slug").GetString(), j.GetProperty("ativa").GetBoolean()));
        Assert.Equal(HttpStatusCode.NotFound, (await f.Cliente().GetAsync($"/api/instituicoes/{demo.Slug}")).StatusCode);
        var login = await f.Cliente().Login(demo.Slug, adminDemo.Cpf.Valor);
        Assert.Equal(base_.StatusCode, login.StatusCode);
        Assert.Equal((await base_.Json()).GetProperty("detail").GetString(), (await login.Json()).GetProperty("detail").GetString());
        Assert.Equal(HttpStatusCode.Unauthorized, (await clienteAdmin.GetAsync("/api/auth/me")).StatusCode);
        Assert.False((await f.Db(null, db => db.Instituicoes.SingleAsync(x => x.Id == demo.Id))).Ativa);
    }

    [Fact]
    public async Task Desativar_bloqueia_primeiro_acesso()
    {
        var op = await UmOperador();
        var demo = await f.Instituicao();
        var adminDemo = await f.Usuario(demo, [Papeis.Administrador]);
        Task<int> Tokens() => f.Db(demo.Id, db => db.Tokens.CountAsync());
        Task<int> Emails() => f.Db(demo.Id, db => db.EmailsSaida.CountAsync());
        await f.Cliente().PostAsJsonAsync("/api/auth/primeiro-acesso", new { instituicao = demo.Slug, cpf = adminDemo.Cpf.Valor });
        Assert.Equal(1, await Tokens());

        await op.Cliente.PostAsync($"{Lista}/{demo.Slug}/desativar", null);
        await f.Cliente().PostAsJsonAsync("/api/auth/primeiro-acesso", new { instituicao = demo.Slug, cpf = adminDemo.Cpf.Valor });

        Assert.Equal((1, 0), (await Tokens(), await Emails()));
    }

    [Fact]
    public async Task Nao_desativa_a_propria()
    {
        var op = await UmOperador();

        var r = await op.Cliente.PostAsync($"{Lista}/{op.Instituicao.Slug}/desativar", null);

        Assert.Equal(HttpStatusCode.Conflict, r.StatusCode);
        Assert.Equal("Você não pode desativar a instituição em que está.", (await r.Json()).GetProperty("detail").GetString());
        Assert.True((await f.Db(null, db => db.Instituicoes.SingleAsync(x => x.Id == op.Instituicao.Id))).Ativa);
    }

    [Fact]
    public async Task Reativar_volta_o_login()
    {
        var op = await UmOperador();
        var demo = await f.Instituicao();
        var adminDemo = await f.Usuario(demo, [Papeis.Administrador]);
        await op.Cliente.PostAsync($"{Lista}/{demo.Slug}/desativar", null);
        Assert.NotEqual(HttpStatusCode.OK, (await f.Cliente().Login(demo.Slug, adminDemo.Cpf.Valor)).StatusCode);

        var r = await op.Cliente.PostAsync($"{Lista}/{demo.Slug}/reativar", null);

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var j = await r.Json();
        Assert.Equal((demo.Slug, true), (j.GetProperty("slug").GetString(), j.GetProperty("ativa").GetBoolean()));
        Assert.Equal(HttpStatusCode.OK, (await f.Cliente().Login(demo.Slug, adminDemo.Cpf.Valor)).StatusCode);
    }


    [Fact]
    public async Task Reenviar_acesso_para_admins_ativos()
    {
        var op = await UmOperador();
        var demo = await f.Instituicao(nome: "Faculdade Demo");
        var um = await f.Usuario(demo, [Papeis.Administrador], senha: null);
        var dois = await f.Usuario(demo, [Papeis.Administrador, Papeis.Atendente]);
        var inativo = await f.Usuario(demo, [Papeis.Administrador]);
        await f.Db(demo.Id, db => db.Usuarios.Where(u => u.Id == inativo.Id).ExecuteUpdateAsync(s => s.SetProperty(u => u.Ativo, false)));
        var tokensAntes = await f.Db(demo.Id, db => db.Tokens.CountAsync());

        var r = await op.Cliente.PostAsync($"{Lista}/{demo.Slug}/reenviar-acesso", null);

        Assert.Equal(HttpStatusCode.Accepted, r.StatusCode);
        Assert.Equal(2, (await r.Json()).GetProperty("enviados").GetInt32());
        await f.Db(demo.Id, async db =>
        {
            Assert.Equal(tokensAntes + 2, await db.Tokens.CountAsync());
            var emails = await db.EmailsSaida.ToListAsync();
            Assert.Equal(new[] { um.Email, dois.Email }.Order(), emails.Select(e => e.Destinatario).Order());
            foreach (var (email, usuario) in new[] { (emails.Single(e => e.Destinatario == um.Email), um), (emails.Single(e => e.Destinatario == dois.Email), dois) })
            {
                Assert.Equal("[Faculdade Demo] Crie sua senha", email.Assunto);
                var token = Regex.Match(email.Corpo, $@"/{demo.Slug}/definir-senha\?token=(\S+)").Groups[1].Value;
                Assert.Equal(usuario.Id, (await db.Tokens.SingleAsync(t => t.Hash == Tokens.Hash(token))).UsuarioId);
            }
        });
    }

    [Fact]
    public async Task Reenviar_sem_admin_ou_desativada_409()
    {
        var op = await UmOperador();
        var semAdmin = await f.Instituicao();
        var soAtendente = await f.Usuario(semAdmin, [Papeis.Atendente]);
        var desativada = await f.Instituicao();
        await f.Usuario(desativada, [Papeis.Administrador]);
        await f.Db(null, db => db.Instituicoes.Where(x => x.Id == desativada.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.Ativa, false)));
        Task<int[]> Contagens() => f.Db(null, async db => new[] { await db.Tokens.IgnoreQueryFilters().CountAsync(), await db.EmailsSaida.IgnoreQueryFilters().CountAsync() });
        var antes = await Contagens();

        var r = await op.Cliente.PostAsync($"{Lista}/{semAdmin.Slug}/reenviar-acesso", null);
        Assert.Equal(HttpStatusCode.Conflict, r.StatusCode);
        Assert.Equal("Esta instituição não tem administrador ativo para receber o acesso.", (await r.Json()).GetProperty("detail").GetString());

        r = await op.Cliente.PostAsync($"{Lista}/{desativada.Slug}/reenviar-acesso", null);
        Assert.Equal(HttpStatusCode.Conflict, r.StatusCode);
        Assert.Equal("A instituição está desativada.", (await r.Json()).GetProperty("detail").GetString());
        Assert.Equal(antes, await Contagens());
        Assert.NotNull(soAtendente);
    }

    [Fact]
    public async Task Slug_inexistente_404()
    {
        var op = await UmOperador();
        var pedidos = new[] { "carga", "desativar", "reativar", "reenviar-acesso" };

        foreach (var acao in pedidos)
        {
            var r = await op.Cliente.PostAsync($"{Lista}/nao-existe/{acao}", acao == "carga" ? Arquivo(CargaJson()) : null);
            Assert.Equal(HttpStatusCode.NotFound, r.StatusCode);
            Assert.Equal("Instituição não encontrada.", (await r.Json()).GetProperty("detail").GetString());
        }
    }


    [Fact]
    public void InstituicaoAtual_so_onde_ja_era_e_na_plataforma()
    {
        var api = Path.Combine(ArquiteturaTests.Raiz(), "One.Api");
        var sep = Path.DirectorySeparatorChar;
        var atribui = new Regex(@"\bInstituicaoAtual\s*=(?!=)");
        var fora = Directory.EnumerateFiles(api, "*.cs", SearchOption.AllDirectories)
            .Where(p => !p.Contains($"{sep}bin{sep}") && !p.Contains($"{sep}obj{sep}"))
            .Select(p => Path.GetRelativePath(api, p).Replace(sep, '/'))
            .OrderBy(p => p, StringComparer.Ordinal)
            .Where(p => !p.StartsWith("Acesso/") && p is not ("Sessao.cs" or "Agendador.cs" or "Instituicoes/Plataforma/Criacao.cs" or "Instituicoes/Plataforma/ReenviarAcesso.cs" or "Instituicoes/Carga/ImportarCargaInstituicao.cs" or "Instituicoes/Aparencia/BaixarImagemInstituicao.cs" or "Instituicoes/Carga/ManifestoInstituicao.cs" or "Instituicoes/Carga/ComandoCarga.cs" or "Instituicoes/Plataforma/ComandoOperador.cs" or "Assistente/Busca/ComandoAvaliarBusca.cs"))
            .Where(p => atribui.IsMatch(File.ReadAllText(Path.Combine(api, p))));
        Assert.Equal(["Chamados/TempoReal/TempoRealHub.cs", "Mcp/AutenticacaoMcp.cs", "Mcp/ContextoMcp.cs"], fora);
    }
}
