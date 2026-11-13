using System.Text.Json;
using System.Text.Json.Serialization;

namespace One.Api.Assistente;

public class Embeddings(IHttpClientFactory http, IConfiguration cfg, TimeProvider relogio)
{
    public const int Dimensoes = 1536;
    public const int Lote = 100;
    public static readonly TimeSpan TempoLimite = TimeSpan.FromSeconds(20);

    record Item(int Index, float[] Embedding);
    record Resposta(List<Item> Data);

    record Pedido(string Model, IReadOnlyList<string> Input, [property: JsonPropertyName("encoding_format")] string EncodingFormat);

    public async Task<List<float[]>> Gerar(IReadOnlyList<string> textos)
    {
        using var limite = new CancellationTokenSource(TempoLimite, relogio);
        using var req = new HttpRequestMessage(HttpMethod.Post, "embeddings")
        {
            Content = JsonContent.Create(new Pedido(cfg["Llm:ModeloEmbeddings"] ?? "text-embedding-3-small", textos, "float")),
        };
        using var resp = await http.CreateClient("llm").SendAsync(req, limite.Token);
        resp.EnsureSuccessStatusCode();
        var corpo = await resp.Content.ReadFromJsonAsync<Resposta>(JsonSerializerOptions.Web, limite.Token)
            ?? throw new JsonException("resposta de embeddings vazia");
        if (corpo.Data.Count != textos.Count || corpo.Data.Any(d => d.Embedding.Length != Dimensoes))
            throw new JsonException("resposta de embeddings fora do formato");
        return corpo.Data.OrderBy(d => d.Index).Select(d => d.Embedding).ToList();
    }
}

