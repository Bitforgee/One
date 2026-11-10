using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class MoodleAdminTests(OneFactory f) : IClassFixture<OneFactory>
{
    const string Url = "/api/admin/moodle";

    public static JsonObject Corpo(string? emissor = MoodleFalso.Emissor, string? authUrl = MoodleFalso.AuthUrl, string? jwksUrl = MoodleFalso.JwksUrl) => new()
    {
        ["ativa"] = true, ["emissor"] = emissor, ["clientId"] = MoodleFalso.ClientId, ["deploymentId"] = MoodleFalso.DeploymentId,
        ["authUrl"] = authUrl, ["jwksUrl"] = jwksUrl,
    };

    async Task<(Instituicao, HttpClient)> Admin()
    {
        var i = await f.Instituicao();
        return (i, await f.Entrar(i, await f.Usuario(i, [Papeis.Administrador])));
    }

    Task<List<PlataformaMoodle>> Gravadas(Instituicao i) => f.Db(i.Id, db => db.PlataformasMoodle.AsNoTracking().ToListAsync());

    static async Task Recusa(HttpResponseMessage r, string campo)
    {
        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        Assert.True((await r.Json()).GetProperty("errors").TryGetProperty(campo, out _), campo);
    }

    [Fact]
    public async Task Put_grava_e_devolve_as_tres_urls()
    {
        var (i, c) = await Admin();

        var r = await c.PutAsJsonAsync(Url, Corpo());

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var j = await r.Json();
        Assert.Equal(["configurada", "ativa", "emissor", "clientId", "deploymentId", "authUrl", "jwksUrl", "urlLogin", "urlLancamento", "urlJwks"], j.EnumerateObject().Select(p => p.Name));
        Assert.True(j.GetProperty("ativa").GetBoolean());
        Assert.Equal(MoodleFalso.Emissor, j.GetProperty("emissor").GetString());
        Assert.Equal(MoodleFalso.ClientId, j.GetProperty("clientId").GetString());
        Assert.Equal(MoodleFalso.DeploymentId, j.GetProperty("deploymentId").GetString());
        Assert.Equal(MoodleFalso.AuthUrl, j.GetProperty("authUrl").GetString());
        Assert.Equal(MoodleFalso.JwksUrl, j.GetProperty("jwksUrl").GetString());
        Assert.Equal($"http://localhost:8080/api/moodle/{i.Slug}/login", j.GetProperty("urlLogin").GetString());
        Assert.Equal($"http://localhost:8080/api/moodle/{i.Slug}/lancamento", j.GetProperty("urlLancamento").GetString());
        Assert.Equal($"http://localhost:8080/api/moodle/{i.Slug}/jwks", j.GetProperty("urlJwks").GetString());
        var p = Assert.Single(await Gravadas(i));
        Assert.Equal((true, MoodleFalso.Emissor, MoodleFalso.ClientId, MoodleFalso.DeploymentId, MoodleFalso.AuthUrl, MoodleFalso.JwksUrl),
            (p.Ativa, p.Emissor, p.ClientId, p.DeploymentId, p.AuthUrl, p.JwksUrl));
    }

    [Theory]
    [InlineData("authUrl")]
    [InlineData("jwksUrl")]
    public async Task Url_sem_https_400(string campo)
    {
        var (i, c) = await Admin();
        var corpo = Corpo();
        corpo[campo] = "http://moodle.teste/x";
        await Recusa(await c.PutAsJsonAsync(Url, corpo), campo);

        corpo[campo] = "http://localhost:8081/x";
        Assert.Equal(HttpStatusCode.OK, (await c.PutAsJsonAsync(Url, corpo)).StatusCode);

        await using var producao = new OneFactoryProducao();
        await producao.InitializeAsync();
        var ip = await producao.Instituicao();
        var cp = await producao.Entrar(ip, await producao.Usuario(ip, [Papeis.Administrador]));
        await Recusa(await cp.PutAsJsonAsync(Url, corpo), campo);
        Assert.Empty(await producao.Db(ip.Id, db => db.PlataformasMoodle.ToListAsync()));
    }

    public static TheoryData<string, int> CamposELimites()
    {
        var d = new TheoryData<string, int>();
        foreach (var campo in new[] { "emissor", "clientId", "deploymentId", "authUrl", "jwksUrl" })
            foreach (var tamanho in new[] { 0, 501 }) d.Add(campo, tamanho);
        return d;
    }

    static string Texto(string campo, int tamanho) =>
        campo is "authUrl" or "jwksUrl" ? "https://moodle.teste/" + new string('a', Math.Max(0, tamanho - 21)) : new string('a', tamanho);

    [Theory]
    [MemberData(nameof(CamposELimites))]
    public async Task Campo_vazio_ou_longo_400(string campo, int tamanho)
    {
        var (i, c) = await Admin();
        var corpo = Corpo();
        corpo[campo] = tamanho == 0 ? "" : Texto(campo, tamanho);

        await Recusa(await c.PutAsJsonAsync(Url, corpo), campo);
        Assert.Empty(await Gravadas(i));

        corpo[campo] = Texto(campo, 500);
        Assert.Equal(500, corpo[campo]!.GetValue<string>().Length);
        Assert.Equal(HttpStatusCode.OK, (await c.PutAsJsonAsync(Url, corpo)).StatusCode);
    }

    [Fact]
    public async Task Segundo_put_atualiza_a_mesma_linha()
    {
        var (i, c) = await Admin();
        Assert.Equal(HttpStatusCode.OK, (await c.PutAsJsonAsync(Url, Corpo())).StatusCode);
        var segundo = Corpo(emissor: "https://outro-moodle.teste");
        segundo["ativa"] = false;

        Assert.Equal(HttpStatusCode.OK, (await c.PutAsJsonAsync(Url, segundo)).StatusCode);

        var p = Assert.Single(await Gravadas(i));
        Assert.Equal(("https://outro-moodle.teste", false), (p.Emissor, p.Ativa));
    }

    [Fact]
    public async Task Get_sem_plataforma_traz_as_urls()
    {
        var (i, c) = await Admin();

        var j = await (await c.GetAsync(Url)).Json();

        Assert.False(j.GetProperty("configurada").GetBoolean());
        Assert.False(j.GetProperty("ativa").GetBoolean());
        foreach (var campo in new[] { "emissor", "clientId", "deploymentId", "authUrl", "jwksUrl" }) Assert.Equal("", j.GetProperty(campo).GetString());
        Assert.Equal($"http://localhost:8080/api/moodle/{i.Slug}/login", j.GetProperty("urlLogin").GetString());
        Assert.Equal($"http://localhost:8080/api/moodle/{i.Slug}/lancamento", j.GetProperty("urlLancamento").GetString());
        Assert.Equal($"http://localhost:8080/api/moodle/{i.Slug}/jwks", j.GetProperty("urlJwks").GetString());

        await c.PutAsJsonAsync(Url, Corpo());
        var r = await c.GetAsync(Url);
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var depois = await r.Json();
        Assert.True(depois.GetProperty("configurada").GetBoolean());
        Assert.Equal(MoodleFalso.Emissor, depois.GetProperty("emissor").GetString());
    }

    [Fact]
    public async Task Sem_papel_de_admin_403_e_sem_sessao_401()
    {
        var i = await f.Instituicao();
        var clientes = new (string quem, HttpClient c)[]
        {
            ("aluno", (await f.AlunoLogado(i)).Cliente),
            ("atendente", await f.Entrar(i, await f.Usuario(i, [Papeis.Atendente]))),
            ("anonimo", f.Cliente()),
        };
        foreach (var (quem, c) in clientes)
            foreach (var r in new[] { await c.GetAsync(Url), await c.PutAsJsonAsync(Url, Corpo()) })
                Assert.True(r.StatusCode == (quem == "anonimo" ? HttpStatusCode.Unauthorized : HttpStatusCode.Forbidden), $"{quem}: {(int)r.StatusCode}");
        Assert.Empty(await Gravadas(i));
    }

    [Fact]
    public async Task Admin_de_outra_instituicao_nao_enxerga_nem_altera()
    {
        var (a, ca) = await Admin();
        var (b, cb) = await Admin();
        await ca.PutAsJsonAsync(Url, Corpo());

        Assert.False((await (await cb.GetAsync(Url)).Json()).GetProperty("configurada").GetBoolean());
        Assert.Equal(HttpStatusCode.OK, (await cb.PutAsJsonAsync(Url, Corpo(emissor: "https://moodle-b.teste"))).StatusCode);

        Assert.Equal(MoodleFalso.Emissor, Assert.Single(await Gravadas(a)).Emissor);
        Assert.Equal("https://moodle-b.teste", Assert.Single(await Gravadas(b)).Emissor);
    }

    [Fact]
    public async Task Dois_puts_simultaneos_um_200_e_um_409()
    {
        var (i, c) = await Admin();
        f.Gravacoes.Atraso = TimeSpan.FromMilliseconds(600);
        HttpResponseMessage[] respostas;
        try { respostas = await Task.WhenAll(c.PutAsJsonAsync(Url, Corpo()), c.PutAsJsonAsync(Url, Corpo(emissor: "https://outro.teste"))); }
        finally { f.Gravacoes.Atraso = TimeSpan.Zero; }

        Assert.Equal([HttpStatusCode.OK, HttpStatusCode.Conflict], respostas.Select(r => r.StatusCode).OrderBy(s => (int)s));
        Assert.Single(await Gravadas(i));
    }
}

public class OneFactoryProducao : OneFactory
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.UseEnvironment("Production");
    }
}
