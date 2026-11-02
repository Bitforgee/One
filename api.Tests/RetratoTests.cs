using System.Net;
using System.Net.Http.Json;
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

        Assert.Equal(61, viva.Count);
        // os fallbacks têm a ordem int.MaxValue; o do MapFallbackToFile atende GET e HEAD
        var fallbacks = endpoints.Where(e => e.Order == int.MaxValue).Select(e => e.RoutePattern.RawText).ToList();
        Assert.Equal(["/api/{**resto}", "{*path:nonfile}"], fallbacks);
        Assert.Equal(59, endpoints.Count(e => e.Order != int.MaxValue && e.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods.Count == 1));
        Assert.Equal(["/api/auth/login", "/api/auth/primeiro-acesso", "/api/auth/definir-senha", "/api/auth/logout", "/api/instituicoes/{slug}"],
            endpoints.Where(e => e.Metadata.GetMetadata<IAllowAnonymous>() is not null).Select(e => e.RoutePattern.RawText));
        Assert.Equal(59, endpoints.Count(e => e.Metadata.GetOrderedMetadata<IAuthorizeData>().Any()));
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
        Assert.Equal(8, gravados.Length);
        Assert.Equal(gravados.Select(SemTraceId), vivos);
    }
}
