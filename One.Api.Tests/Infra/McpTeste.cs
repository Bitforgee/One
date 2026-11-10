using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using One.Api.Dados;

namespace One.Api.Tests.Infra;

public sealed record RespostaFerramenta(bool Erro, string Texto)
{
    public JsonElement Json() => JsonDocument.Parse(Texto).RootElement;
}

public class OneFactoryMcpComLimite : OneFactory
{
    protected override bool LimitesReais => true;

    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.UseSetting("Limites:McpPorMinuto", "3");
    }
}

public static class McpTeste
{
    public static async Task<string> NovoTokenMcp(this OneFactory f, Instituicao i, Usuario u, int dias = 90, string nome = "teste", DateTime? agora = null)
    {
        var token = Tokens.NovoMcp(i.Slug);
        await f.Db(i.Id, async db =>
        {
            db.TokensMcp.Add(TokenMcp.Criar(u.Id, nome, Tokens.Hash(token), token[^4..], agora ?? f.Relogio.GetUtcNow().UtcDateTime, dias));
            await db.SaveChangesAsync();
        });
        return token;
    }

    public static async Task<(HttpResponseMessage Resposta, JsonElement Corpo)> Rpc(this OneFactory f, string slug, string? autorizacao, string metodo, object? parametros = null, HttpClient? cliente = null)
    {
        var c = cliente ?? f.Cliente();
        using var pedido = new HttpRequestMessage(HttpMethod.Post, $"/api/mcp/{slug}")
        {
            Content = new StringContent(JsonSerializer.Serialize(new { jsonrpc = "2.0", id = 1, method = metodo, @params = parametros }), Encoding.UTF8, "application/json"),
        };
        pedido.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        pedido.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("text/event-stream"));
        if (autorizacao is not null) pedido.Headers.TryAddWithoutValidation("Authorization", autorizacao);
        var resposta = await c.SendAsync(pedido);
        var texto = await resposta.Content.ReadAsStringAsync();
        var json = texto.TrimStart().StartsWith('{') ? texto : texto.Split('\n').Where(l => l.StartsWith("data:")).Select(l => l[5..].Trim()).FirstOrDefault(l => l.StartsWith('{')) ?? "{}";
        return (resposta, JsonDocument.Parse(json).RootElement);
    }

    public static async Task<HttpResponseMessage> RpcStatus(this OneFactory f, string slug, string? autorizacao, HttpClient? cliente = null) =>
        (await f.Rpc(slug, autorizacao, "tools/list", cliente: cliente)).Resposta;

    public static async Task<RespostaFerramenta> Chamar(this OneFactory f, string slug, string token, string ferramenta, object? argumentos = null)
    {
        var (resposta, corpo) = await f.Rpc(slug, $"Bearer {token}", "tools/call", new { name = ferramenta, arguments = argumentos ?? new { } });
        Assert.Equal(System.Net.HttpStatusCode.OK, resposta.StatusCode);
        Assert.False(corpo.TryGetProperty("error", out var erro), erro.ToString());
        var resultado = corpo.GetProperty("result");
        var erroDeFerramenta = resultado.TryGetProperty("isError", out var e) && e.GetBoolean();
        return new RespostaFerramenta(erroDeFerramenta, resultado.GetProperty("content")[0].GetProperty("text").GetString()!);
    }
}
