using System.Text.Json;

namespace One.Api.Assistente;

// RAG, door R1: POST {Llm:BaseUrl}/embeddings em lote, pelo mesmo HttpClient "llm" do chat (door R7: sem SDK);
// o Program.cs dá ao cliente a URL base e a chave.
public class Embeddings(IHttpClientFactory http, IConfiguration cfg, TimeProvider relogio)
{
    public const int Dimensoes = 1536;
    public const int Lote = 100;
    public static readonly TimeSpan TempoLimite = TimeSpan.FromSeconds(20);

    record Item(int Index, float[] Embedding);
    record Resposta(List<Item> Data);

    // Lança HttpRequestException (status ou rede), OperationCanceledException (20 s) ou JsonException; quem chama decide.
    public async Task<List<float[]>> Gerar(IReadOnlyList<string> textos)
    {
        using var limite = new CancellationTokenSource(TempoLimite, relogio);
        using var req = new HttpRequestMessage(HttpMethod.Post, "embeddings")
        {
            Content = JsonContent.Create(new { model = cfg["Llm:ModeloEmbeddings"] ?? "text-embedding-3-small", input = textos, encoding_format = "float" }),
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
