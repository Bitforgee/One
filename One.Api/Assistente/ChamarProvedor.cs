using System.Net.Http.Json;
using System.Text.Json;

namespace One.Api.Assistente;

public static class ChamarProvedor
{
    public record struct Uso(int ComCache, int SemCache, int Saida);

    public static async Task<(SaidaModelo?, string?, Uso)> Chamar(IHttpClientFactory http, TimeProvider relogio, ILogger log, CorpoDoProvedor corpo)
    {
        using var limite = new CancellationTokenSource(Embeddings.TempoLimite, relogio);
        var uso = new Uso();
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, "chat/completions") { Content = JsonContent.Create(corpo, options: MontarPrompt.Json) };
            using var resp = await http.CreateClient("llm").SendAsync(req, limite.Token);
            if (!resp.IsSuccessStatusCode) return (null, $"provedor_http_{(int)resp.StatusCode}", uso);

            using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync(limite.Token));
            uso = LerUso(doc.RootElement);
            var conteudo = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
            if (string.IsNullOrWhiteSpace(conteudo)) return (null, "provedor_conteudo_vazio", uso);
            var saida = JsonSerializer.Deserialize<SaidaModelo>(conteudo, MontarPrompt.Json);
            if (saida?.Tipo is not (Tipos.Resposta or Tipos.Pergunta or Tipos.SemBase or Tipos.Transferir))
                return (saida, "provedor_tipo_desconhecido", uso);
            return (saida, null, uso);
        }
        catch (OperationCanceledException) { return (null, "provedor_tempo_esgotado", uso); }
        catch (Exception e) when (e is JsonException or InvalidOperationException or KeyNotFoundException or IndexOutOfRangeException)
        {
            return (null, "provedor_json_invalido", uso);
        }
        catch (HttpRequestException e)
        {
            log.LogWarning(e, "Falha de rede ao chamar o provedor de IA");
            return (null, "provedor_indisponivel", uso);
        }
    }

    static Uso LerUso(JsonElement raiz)
    {
        if (!raiz.TryGetProperty("usage", out var u) || u.ValueKind != JsonValueKind.Object) return new();
        int Ler(JsonElement e, string nome) => e.TryGetProperty(nome, out var p) && p.ValueKind == JsonValueKind.Number ? p.GetInt32() : 0;
        var entrada = Ler(u, "prompt_tokens");
        var comCache = u.TryGetProperty("prompt_cache_hit_tokens", out _) ? Ler(u, "prompt_cache_hit_tokens")
            : u.TryGetProperty("prompt_tokens_details", out var d) && d.ValueKind == JsonValueKind.Object ? Ler(d, "cached_tokens") : 0;
        var semCache = u.TryGetProperty("prompt_cache_miss_tokens", out _) ? Ler(u, "prompt_cache_miss_tokens") : entrada - comCache;
        return new(comCache, semCache, Ler(u, "completion_tokens"));
    }
}
