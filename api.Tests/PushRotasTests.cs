using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class PushRotasTests(OneFactory f) : IClassFixture<OneFactory>
{
    static object Corpo(string? endpoint, string? p256dh = "chave-p256dh", string? auth = "chave-auth") =>
        new { endpoint, chaves = new { p256dh, auth } };

    static Task<HttpResponseMessage> Delete(HttpClient c, string? endpoint) =>
        c.DeleteAsync("/api/push/subscricao" + (endpoint is null ? "" : "?endpoint=" + Uri.EscapeDataString(endpoint)));

    static async Task AssertProblema(HttpResponseMessage r)
    {
        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        var j = await r.Json();
        Assert.Equal(400, j.GetProperty("status").GetInt32());
        Assert.Equal("Requisição inválida", j.GetProperty("title").GetString());
        Assert.NotEqual("", j.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Chave_200_com_a_chave_configurada()
    {
        var a = await f.AlunoLogado();
        var r = await a.Cliente.GetAsync("/api/push/chave");
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var j = await r.Json();
        Assert.Equal(["chavePublica"], j.EnumerateObject().Select(p => p.Name));
        Assert.Equal(OneFactory.Vapid.PublicKey, j.GetProperty("chavePublica").GetString());
    }

    [Fact]
    public async Task Sem_par_completo_404_nas_duas_rotas()
    {
        var a = await f.AlunoLogado();
        foreach (var (publica, privada) in new[] { ("", ""), (OneFactory.Vapid.PublicKey, ""), ("", OneFactory.Vapid.PrivateKey) })
        {
            await using var fx = f.WithWebHostBuilder(b => { b.UseSetting("Push:ChavePublica", publica); b.UseSetting("Push:ChavePrivada", privada); });
            var c = await fx.EntrarEm(a);
            Assert.Equal(HttpStatusCode.NotFound, (await c.GetAsync("/api/push/chave")).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await c.PostAsJsonAsync("/api/push/subscricao", Corpo(PushSemente.Endpoint()))).StatusCode);
        }
        Assert.Empty(await f.Subscricoes(q => q.Where(s => s.UsuarioId == a.Usuario.Id)));
    }

    [Fact]
    public async Task Sem_assunto_o_push_fica_desligado()
    {
        var a = await f.AlunoLogado();
        await using var fx = f.WithWebHostBuilder(b => b.UseSetting("Push:Assunto", ""));
        var c = await fx.EntrarEm(a);
        Assert.Equal(HttpStatusCode.NotFound, (await c.GetAsync("/api/push/chave")).StatusCode);
    }

    [Fact]
    public async Task Delete_204_mesmo_sem_chaves()
    {
        var a = await f.AlunoLogado();
        await using var fx = f.WithWebHostBuilder(b => { b.UseSetting("Push:ChavePublica", ""); b.UseSetting("Push:ChavePrivada", ""); });
        var c = await fx.EntrarEm(a);
        Assert.Equal(HttpStatusCode.NoContent, (await Delete(c, PushSemente.Endpoint())).StatusCode);
    }

    [Fact]
    public async Task Post_204_grava_usuario_e_instituicao_do_cookie()
    {
        var a = await f.AlunoLogado();
        var endpoint = PushSemente.Endpoint();
        var r = await a.Cliente.PostAsJsonAsync("/api/push/subscricao", Corpo(endpoint, "BP256", "BAUTH"));
        Assert.Equal(HttpStatusCode.NoContent, r.StatusCode);
        Assert.Equal("", await r.Content.ReadAsStringAsync());
        var s = Assert.Single(await f.Subscricoes(q => q.Where(x => x.Endpoint == endpoint)));
        Assert.Equal((a.Usuario.Id, a.Instituicao.Id, "BP256", "BAUTH"), (s.UsuarioId, s.InstituicaoId, s.P256dh, s.Auth));
    }

    [Fact]
    public async Task Post_400_nas_entradas_invalidas()
    {
        var a = await f.AlunoLogado();
        var entradas = new object[]
        {
            Corpo("http://push.teste/x"),
            Corpo("https://push.teste/" + new string('a', 2049 - 19)),
            new { chaves = new { p256dh = "a", auth = "b" } },
            Corpo(PushSemente.Endpoint(), null, "b"),
            Corpo(PushSemente.Endpoint(), "a", null),
            new { endpoint = PushSemente.Endpoint() },
        };
        foreach (var e in entradas) await AssertProblema(await a.Cliente.PostAsJsonAsync("/api/push/subscricao", e));
        Assert.Empty(await f.Subscricoes(q => q.Where(x => x.UsuarioId == a.Usuario.Id)));
    }

    [Fact]
    public async Task Post_204_com_endpoint_de_2048_caracteres()
    {
        var a = await f.AlunoLogado();
        var endpoint = "https://push.teste/" + new string('a', 2048 - 19);
        Assert.Equal(2048, endpoint.Length);
        Assert.Equal(HttpStatusCode.NoContent, (await a.Cliente.PostAsJsonAsync("/api/push/subscricao", Corpo(endpoint))).StatusCode);
        Assert.Single(await f.Subscricoes(q => q.Where(x => x.UsuarioId == a.Usuario.Id)));
    }

    [Fact]
    public async Task Post_de_endpoint_existente_move_a_linha()
    {
        var a = await f.AlunoLogado();
        var colega = await f.AlunoLogado(a.Instituicao);
        var outra = await f.AlunoLogado();
        var endpoint = PushSemente.Endpoint();

        await a.Cliente.PostAsJsonAsync("/api/push/subscricao", Corpo(endpoint, "p-1", "a-1"));
        Assert.Equal(HttpStatusCode.NoContent, (await a.Cliente.PostAsJsonAsync("/api/push/subscricao", Corpo(endpoint, "p-2", "a-2"))).StatusCode);
        var s = Assert.Single(await f.Subscricoes(q => q.Where(x => x.Endpoint == endpoint)));
        Assert.Equal((a.Usuario.Id, a.Instituicao.Id, "p-2", "a-2"), (s.UsuarioId, s.InstituicaoId, s.P256dh, s.Auth));

        Assert.Equal(HttpStatusCode.NoContent, (await colega.Cliente.PostAsJsonAsync("/api/push/subscricao", Corpo(endpoint, "p-3", "a-3"))).StatusCode);
        s = Assert.Single(await f.Subscricoes(q => q.Where(x => x.Endpoint == endpoint)));
        Assert.Equal((colega.Usuario.Id, a.Instituicao.Id, "p-3", "a-3"), (s.UsuarioId, s.InstituicaoId, s.P256dh, s.Auth));

        Assert.Equal(HttpStatusCode.NoContent, (await outra.Cliente.PostAsJsonAsync("/api/push/subscricao", Corpo(endpoint, "p-4", "a-4"))).StatusCode);
        s = Assert.Single(await f.Subscricoes(q => q.Where(x => x.Endpoint == endpoint)));
        Assert.Equal((outra.Usuario.Id, outra.Instituicao.Id, "p-4", "a-4"), (s.UsuarioId, s.InstituicaoId, s.P256dh, s.Auth));
    }

    [Fact]
    public async Task Post_11a_subscricao_apaga_a_mais_antiga()
    {
        var a = await f.AlunoLogado();
        var outro = await f.AlunoLogado(a.Instituicao);
        await f.Subscrever(outro.Instituicao, outro.Usuario);
        var e = Enumerable.Range(1, 11).Select(n => PushSemente.Endpoint("-" + n)).ToArray();
        for (var n = 0; n < 10; n++)
        {
            f.Relogio.Advance(TimeSpan.FromMinutes(1));
            Assert.Equal(HttpStatusCode.NoContent, (await a.Cliente.PostAsJsonAsync("/api/push/subscricao", Corpo(e[n]))).StatusCode);
        }
        Assert.Equal(e[..10].Order(), (await f.Subscricoes(q => q.Where(x => x.UsuarioId == a.Usuario.Id))).Select(x => x.Endpoint).Order()); // com 10, nada cai

        f.Relogio.Advance(TimeSpan.FromMinutes(1)); // um novo POST do mais antigo o torna o mais recente
        await a.Cliente.PostAsJsonAsync("/api/push/subscricao", Corpo(e[0]));
        f.Relogio.Advance(TimeSpan.FromMinutes(1));
        await a.Cliente.PostAsJsonAsync("/api/push/subscricao", Corpo(e[10]));

        var ficaram = (await f.Subscricoes(q => q.Where(x => x.UsuarioId == a.Usuario.Id))).Select(x => x.Endpoint).ToList();
        Assert.Equal(10, ficaram.Count);
        Assert.DoesNotContain(e[1], ficaram);
        Assert.Contains(e[0], ficaram);
        Assert.Contains(e[10], ficaram);
        Assert.Single(await f.Subscricoes(q => q.Where(x => x.UsuarioId == outro.Usuario.Id)));
    }

    [Fact]
    public async Task Delete_204_nos_quatro_casos()
    {
        var a = await f.AlunoLogado();
        var colega = await f.AlunoLogado(a.Instituicao);
        var outra = await f.AlunoLogado();
        var meu = (await f.Subscrever(a.Instituicao, a.Usuario)).Endpoint;
        var doColega = (await f.Subscrever(colega.Instituicao, colega.Usuario)).Endpoint;
        var daOutra = (await f.Subscrever(outra.Instituicao, outra.Usuario)).Endpoint;

        foreach (var e in new[] { meu, PushSemente.Endpoint(), doColega, daOutra })
            Assert.Equal(HttpStatusCode.NoContent, (await Delete(a.Cliente, e)).StatusCode);

        Assert.Empty(await f.Subscricoes(q => q.Where(x => x.Endpoint == meu)));
        Assert.Single(await f.Subscricoes(q => q.Where(x => x.Endpoint == doColega)));
        Assert.Single(await f.Subscricoes(q => q.Where(x => x.Endpoint == daOutra)));
    }

    [Fact]
    public async Task Delete_400_sem_endpoint()
    {
        var a = await f.AlunoLogado();
        var meu = await f.Subscrever(a.Instituicao, a.Usuario);
        await AssertProblema(await Delete(a.Cliente, null));
        await AssertProblema(await Delete(a.Cliente, ""));
        Assert.Single(await f.Subscricoes(q => q.Where(x => x.Endpoint == meu.Endpoint)));
    }

    [Fact]
    public async Task Sem_cookie_401_nas_tres_rotas()
    {
        var c = f.Cliente();
        Assert.Equal(HttpStatusCode.Unauthorized, (await c.GetAsync("/api/push/chave")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await c.PostAsJsonAsync("/api/push/subscricao", Corpo(PushSemente.Endpoint()))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Delete(c, PushSemente.Endpoint())).StatusCode);
    }
}
