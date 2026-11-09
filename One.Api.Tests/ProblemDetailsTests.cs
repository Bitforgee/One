using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class ProblemDetailsTests(OneFactory f) : IClassFixture<OneFactory>
{
    static readonly string[] Ingles = ["One or more validation errors occurred.", "Unauthorized", "Forbidden", "Not Found", "Conflict", "Too Many Requests", "Bad Request", "An error occurred", "Internal Server Error"];

    async Task<List<(int esperado, HttpResponseMessage r)>> Erros()
    {
        var c = await Cenario.Criar(f);
        var (id, _) = await c.Primeira();
        await c.Cliente.PostAsync($"/api/conversas/{id}/encerrar", null);
        var atendente = await f.Entrar(c.Instituicao, await f.Usuario(c.Instituicao, [Papeis.Atendente]));

        var lista = new List<(int, HttpResponseMessage)>
        {
            (400, await f.Cliente().Login(c.Instituicao.Slug, "111")),
            (400, await c.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "" })),
            (400, await f.Cliente().PostAsync("/api/auth/login", new StringContent("{ não é json", Encoding.UTF8, "application/json"))),
            (401, await f.Cliente().GetAsync("/api/auth/me")),
            (401, await f.Cliente().Login(c.Instituicao.Slug, c.Aluno.Usuario.Cpf, "senha-errada")),
            (403, await atendente.PostAsJsonAsync("/api/conversas", new { mensagem = "oi" })),
            (404, await f.Cliente().GetAsync("/api/instituicoes/nao-existe")),
            (404, await f.Cliente().GetAsync("/api/rota-que-nao-existe")),
            (409, await c.Cliente.PostAsync($"/api/conversas/{id}/encerrar", null)),
            (500, await f.Cliente().Login(c.Instituicao.Slug, c.Aluno.Usuario.Cpf, "explode-500")),
        };

        var numero = (await (await c.Cliente.PostAsJsonAsync("/api/atendimento-direto", new { descricao = "oi" })).Json()).GetProperty("numero").GetString()!;
        lista.Add((413, await Balcao.ComAnexos(c.Cliente, numero, "segue", "PUBLICA", ("a.pdf", Balcao.Arquivo(Balcao.Pdf, 10 * 1024 * 1024 + 1)))));
        lista.Add((415, await Balcao.ComAnexos(c.Cliente, numero, "segue", "PUBLICA", ("a.pdf", Balcao.Arquivo(Balcao.Exe, 100)))));

        await using var limitado = new OneFactoryComLimites();
        await limitado.InitializeAsync();
        var cliente = limitado.Cliente();
        HttpResponseMessage ultimo = null!;
        for (var n = 0; n < 6; n++) ultimo = await cliente.Login("qualquer", Semente.NovoCpf(), "x");
        lista.Add((429, ultimo));
        return lista;
    }

    [Fact]
    public async Task Detail_em_portugues()
    {
        foreach (var (esperado, r) in await Erros())
        {
            Assert.Equal(esperado, (int)r.StatusCode);
            var j = await r.Json();
            var title = j.GetProperty("title").GetString()!;
            var detail = j.GetProperty("detail").GetString()!;
            Assert.Equal(Problemas.Titulo(esperado), title);
            Assert.False(string.IsNullOrWhiteSpace(detail), $"{esperado} sem detail");
            foreach (var en in Ingles)
            {
                Assert.DoesNotContain(en, title);
                Assert.DoesNotContain(en, detail);
            }
            Assert.DoesNotContain("One or more validation errors occurred.", await r.Content.ReadAsStringAsync());
        }
    }

    [Fact]
    public async Task Erros_sao_problem_json()
    {
        foreach (var (esperado, r) in await Erros())
        {
            Assert.Equal("application/problem+json", r.Content.Headers.ContentType?.MediaType);
            var j = await r.Json();
            foreach (var campo in new[] { "type", "title", "status", "detail" })
                Assert.True(j.TryGetProperty(campo, out _), $"{esperado} sem {campo}");
            Assert.Equal(esperado, j.GetProperty("status").GetInt32());
        }
        var c = await Cenario.Criar(f);
        var invalido = await (await c.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "" })).Json();
        Assert.Equal(JsonValueKind.Array, invalido.GetProperty("errors").GetProperty("mensagem").ValueKind);
    }
}
