using System.Net;
using System.Web;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class MoodleInicioTests(OneFactory f) : IClassFixture<OneFactory>
{
    static string Consulta(string iss = MoodleFalso.Emissor, string client = MoodleFalso.ClientId) =>
        $"?iss={Uri.EscapeDataString(iss)}&login_hint=hint-1&target_link_uri={Uri.EscapeDataString("https://one.teste/x")}&lti_message_hint=msg-1&client_id={Uri.EscapeDataString(client)}";

    static IEnumerable<KeyValuePair<string, string>> Campos() =>
    [
        new("iss", MoodleFalso.Emissor), new("login_hint", "hint-1"), new("target_link_uri", "https://one.teste/x"),
        new("lti_message_hint", "msg-1"), new("client_id", MoodleFalso.ClientId),
    ];

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Login_redireciona_ao_auth_url_e_grava_o_estado(bool post)
    {
        var i = await f.Instituicao();
        await f.PlataformaMoodle(i);
        var c = f.Cliente();

        var r = post
            ? await c.PostAsync($"/api/moodle/{i.Slug}/login", new FormUrlEncodedContent(Campos()))
            : await c.GetAsync($"/api/moodle/{i.Slug}/login{Consulta()}");
        Assert.Equal(HttpStatusCode.Redirect, r.StatusCode);
        var destino = r.Headers.Location!;
        Assert.StartsWith(MoodleFalso.AuthUrl + "?", destino.OriginalString);
        var q = HttpUtility.ParseQueryString(destino.Query);
        Assert.Equal("openid", q["scope"]);
        Assert.Equal("id_token", q["response_type"]);
        Assert.Equal("form_post", q["response_mode"]);
        Assert.Equal("none", q["prompt"]);
        Assert.Equal(MoodleFalso.ClientId, q["client_id"]);
        Assert.Equal("hint-1", q["login_hint"]);
        Assert.Equal("msg-1", q["lti_message_hint"]);
        Assert.Equal($"http://localhost:8080/api/moodle/{i.Slug}/lancamento", q["redirect_uri"]);
        Assert.True(q["state"]!.Length >= 22);
        Assert.True(q["nonce"]!.Length >= 22);

        var gravados = await f.Db(i.Id, db => db.LtiLancamentos.AsNoTracking().ToListAsync());
        var l = Assert.Single(gravados);
        Assert.Equal(q["state"], l.State);
        Assert.Equal(q["nonce"], l.Nonce);
        Assert.Equal(f.Relogio.GetUtcNow().UtcDateTime.AddMinutes(10), l.ExpiraEm);
        Assert.Null(l.UsadoEm);
    }

    [Theory]
    [InlineData("iss")]
    [InlineData("client")]
    [InlineData("inativa")]
    [InlineData("sem-plataforma")]
    [InlineData("sem-login-hint")]
    public async Task Login_recusa_com_400(string caso)
    {
        var i = await f.Instituicao();
        if (caso != "sem-plataforma") await f.PlataformaMoodle(i, ativa: caso != "inativa");
        var url = caso switch
        {
            "iss" => Consulta(iss: "https://outro.teste"),
            "client" => Consulta(client: "outro-cliente"),
            "sem-login-hint" => Consulta().Replace("&login_hint=hint-1", ""),
            _ => Consulta(),
        };

        var r = await f.Cliente().GetAsync($"/api/moodle/{i.Slug}/login{url}");

        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        Assert.Empty(await f.Db(i.Id, db => db.LtiLancamentos.ToListAsync()));
    }

    [Fact]
    public async Task Slug_inexistente_ou_inativo_404()
    {
        var inativa = await f.Instituicao();
        await f.PlataformaMoodle(inativa);
        await f.Db(null, db => db.Instituicoes.Where(x => x.Id == inativa.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.Ativa, false)));
        var c = f.Cliente();

        foreach (var slug in new[] { "nao-existe-" + Semente.NovoSlug(), inativa.Slug })
        {
            Assert.Equal(HttpStatusCode.NotFound, (await c.GetAsync($"/api/moodle/{slug}/login{Consulta()}")).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await c.Lancar(slug, "x.y.z", "estado")).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await c.GetAsync($"/api/moodle/{slug}/jwks")).StatusCode);
        }
    }
}

