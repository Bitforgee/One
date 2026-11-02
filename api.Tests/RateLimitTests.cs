using System.Net;
using System.Net.Http.Json;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

// Cada teste usa um host próprio com os limites reais, para uma janela não contaminar a outra.
public class RateLimitTests : IAsyncLifetime
{
    readonly OneFactoryComLimites f = new();

    public ValueTask InitializeAsync() => f.InitializeAsync();
    public ValueTask DisposeAsync() => f.DisposeAsync();

    [Fact]
    public async Task Login_e_primeiro_acesso_somam_5_por_minuto()
    {
        var i = await f.Instituicao();
        var u = await f.Usuario(i, [Papeis.Aluno]);
        var c = f.Cliente();

        for (var n = 0; n < 3; n++) Assert.Equal(HttpStatusCode.OK, (await c.Login(i.Slug, u.Cpf)).StatusCode);
        for (var n = 0; n < 2; n++)
            Assert.Equal(HttpStatusCode.Accepted, (await c.PostAsJsonAsync("/api/auth/primeiro-acesso", new { instituicao = i.Slug, cpf = Semente.NovoCpf() })).StatusCode);

        Assert.Equal(HttpStatusCode.TooManyRequests, (await c.Login(i.Slug, u.Cpf)).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await c.PostAsJsonAsync("/api/auth/primeiro-acesso", new { instituicao = i.Slug, cpf = Semente.NovoCpf() })).StatusCode);
    }

    [Fact]
    public async Task Onze_mensagens_em_60s_429()
    {
        var aluno = await f.AlunoLogado();
        var outra = (await (await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "primeira" })).Json()).GetProperty("conversaId").GetInt64();
        var segunda = (await (await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "segunda" })).Json()).GetProperty("conversaId").GetInt64();

        for (var n = 3; n <= 10; n++)
        {
            var conversa = n % 2 == 0 ? outra : segunda;
            Assert.Equal(HttpStatusCode.OK, (await aluno.Cliente.PostAsJsonAsync($"/api/conversas/{conversa}/mensagens", new { mensagem = $"mensagem {n}" })).StatusCode);
        }

        Assert.Equal(HttpStatusCode.TooManyRequests, (await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "décima primeira" })).StatusCode);
    }
}
