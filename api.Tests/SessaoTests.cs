using System.Net;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class SessaoTests(OneFactory f) : IClassFixture<OneFactory>
{
    static readonly string[] Publicas = ["/api/instituicoes/{slug}", "/api/auth/login", "/api/auth/primeiro-acesso", "/api/auth/definir-senha", "/api/auth/logout", "/api/instituicoes/{slug}/imagens/{tipo}", "/api/instituicoes/{slug}/manifest.webmanifest"];
    static readonly string[] LivresDaTroca = ["/api/auth/login", "/api/auth/logout", "/api/auth/me", "/api/auth/senha"];

    // Todas as rotas /api registradas, lidas do próprio app: rota nova entra no teste sem editar a lista.
    List<(string metodo, string padrao)> Rotas() =>
        f.Services.GetRequiredService<EndpointDataSource>().Endpoints.OfType<RouteEndpoint>()
            .Where(e => e.RoutePattern.RawText!.StartsWith("/api/") && !e.RoutePattern.RawText.Contains("{**"))
            .SelectMany(e => (e.Metadata.GetMetadata<Microsoft.AspNetCore.Routing.HttpMethodMetadata>()?.HttpMethods ?? ["GET"]).Select(m => (m, e.RoutePattern.RawText!)))
            .ToList();

    static HttpRequestMessage Pedido(string metodo, string padrao) =>
        new(new HttpMethod(metodo), Regex.Replace(Regex.Replace(padrao, @"\{numero[^}]*\}", "ONE-1"), @"\{[^}]+\}", "1"))
        {
            Content = metodo is "GET" or "DELETE" ? null : JsonContent.Create(new { }),
        };

    [Fact]
    public async Task Sem_cookie_401_em_toda_rota_privada()
    {
        var privadas = Rotas().Where(r => !Publicas.Contains(r.padrao)).ToList();
        Assert.Equal(70, privadas.Count); // RAG C37: mais as 5 de documentos; tempo-real-signalr: mais o negotiate e o WebSocket do hub (sem método declarado, o upgrade é GET)

        foreach (var (metodo, padrao) in privadas)
        {
            var r = await f.Cliente().SendAsync(Pedido(metodo, padrao));
            Assert.True(r.StatusCode == HttpStatusCode.Unauthorized, $"{metodo} {padrao}: {(int)r.StatusCode}");
        }
    }

    [Fact]
    public async Task Logout_204_expira_cookie()
    {
        var aluno = await f.AlunoLogado();
        foreach (var c in new[] { aluno.Cliente, f.Cliente() })
        {
            var r = await c.PostAsync("/api/auth/logout", null);
            Assert.Equal(HttpStatusCode.NoContent, r.StatusCode);
            var cookie = Assert.Single(r.Headers.GetValues("Set-Cookie"), x => x.StartsWith("one.auth="));
            var expira = DateTimeOffset.Parse(Regex.Match(cookie, "expires=([^;]+)", RegexOptions.IgnoreCase).Groups[1].Value);
            Assert.True(expira < DateTimeOffset.UtcNow);
        }
        Assert.Equal(HttpStatusCode.Unauthorized, (await aluno.Cliente.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Me_200_com_matriculas()
    {
        var i = await f.Instituicao(nome: "Univag");
        var u = await f.Usuario(i, [Papeis.Aluno], cpf: "12345678909", matricula: "2000567890");
        await f.Db(i.Id, async db =>
        {
            db.Matriculas.Add(new Matricula { UsuarioId = u.Id, CursoId = (await db.Cursos.FirstAsync()).Id, Numero = "2000567891", Semestre = 1, Situacao = "INATIVA" });
            await db.SaveChangesAsync();
        });
        var c = await f.Entrar(i, u);

        var r = await c.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var j = await r.Json();
        Assert.Equal("***.456.789-**", j.GetProperty("cpfMascarado").GetString());
        Assert.Equal([Papeis.Aluno], j.GetProperty("papeis").EnumerateArray().Select(p => p.GetString()));
        Assert.False(j.GetProperty("deveTrocarSenha").GetBoolean());
        Assert.Equal("Univag", j.GetProperty("instituicao").GetProperty("nome").GetString());
        Assert.Equal(i.Slug, j.GetProperty("instituicao").GetProperty("slug").GetString());
        var matriculas = j.GetProperty("matriculas").EnumerateArray().ToList();
        Assert.Equal(["2000567890", "2000567891"], matriculas.Select(m => m.GetProperty("numero").GetString()));
        Assert.Equal("Análise e Desenvolvimento de Sistemas", matriculas[0].GetProperty("curso").GetString());
        Assert.Equal(["ATIVA", "INATIVA"], matriculas.Select(m => m.GetProperty("situacao").GetString()));
    }

    [Fact]
    public async Task Deve_trocar_senha_403_fora_de_4_rotas()
    {
        var i = await f.Instituicao();
        var u = await f.Usuario(i, [Papeis.Aluno, Papeis.Atendente, Papeis.Administrador], deveTrocarSenha: true);
        var c = await f.Entrar(i, u);

        foreach (var (metodo, padrao) in Rotas().Where(r => !LivresDaTroca.Contains(r.padrao)))
        {
            var r = await c.SendAsync(Pedido(metodo, padrao));
            Assert.True(r.StatusCode == HttpStatusCode.Forbidden, $"{metodo} {padrao}: {(int)r.StatusCode}");
        }
        Assert.Equal(HttpStatusCode.OK, (await c.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await c.PostAsJsonAsync("/api/auth/senha", new { senhaAtual = Semente.Senha, novaSenha = "nova-senha-1" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await c.GetAsync($"/api/instituicoes/{i.Slug}")).StatusCode);
    }

    [Fact]
    public async Task Conta_desativada_401_na_proxima_requisicao()
    {
        var aluno = await f.AlunoLogado();
        Assert.Equal(HttpStatusCode.OK, (await aluno.Cliente.GetAsync("/api/auth/me")).StatusCode);

        await f.Db(aluno.Instituicao.Id, db => db.Usuarios.Where(u => u.Id == aluno.Usuario.Id).ExecuteUpdateAsync(s => s.SetProperty(u => u.Ativo, false)));

        Assert.Equal(HttpStatusCode.Unauthorized, (await aluno.Cliente.GetAsync("/api/auth/me")).StatusCode);
    }
}
