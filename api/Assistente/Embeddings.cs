using System.Text.Json;
using One.Api.Dados;

namespace One.Api.Assistente;

// RAG, door R1: POST {Llm:BaseUrl}/embeddings em lote, pelo mesmo HttpClient "llm" do chat (door R7: sem SDK).
public class Embeddings(IHttpClientFactory http, IConfiguration cfg, TimeProvider relogio)
{
    public const int Dimensoes = 1536;
    public const int Lote = 100;

    record Item(int Index, float[] Embedding);
    record Resposta(List<Item> Data);

    // Lança HttpRequestException (status ou rede), OperationCanceledException (20 s) ou JsonException; quem chama decide.
    public async Task<List<float[]>> Gerar(IReadOnlyList<string> textos)
    {
        using var limite = new CancellationTokenSource(TimeSpan.FromSeconds(20), relogio);
        var url = (cfg["Llm:BaseUrl"] ?? "https://api.openai.com/v1").TrimEnd('/') + "/embeddings";
        using var req = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(new { model = cfg["Llm:ModeloEmbeddings"] ?? "text-embedding-3-small", input = textos, encoding_format = "float" }),
        };
        if (!string.IsNullOrEmpty(cfg["Llm:ChaveApi"])) req.Headers.Authorization = new("Bearer", cfg["Llm:ChaveApi"]);
        using var resp = await http.CreateClient("llm").SendAsync(req, limite.Token);
        resp.EnsureSuccessStatusCode();
        var corpo = await resp.Content.ReadFromJsonAsync<Resposta>(JsonSerializerOptions.Web, limite.Token)
            ?? throw new JsonException("resposta de embeddings vazia");
        if (corpo.Data.Count != textos.Count || corpo.Data.Any(d => d.Embedding.Length != Dimensoes))
            throw new JsonException("resposta de embeddings fora do formato");
        return corpo.Data.OrderBy(d => d.Index).Select(d => d.Embedding).ToList();
    }
}

public static class Fontes
{
    // RAG, AC 4: o trecho de um artigo é a versão inteira: título, perguntas e resposta
    public static string TextoDoArtigo(VersaoArtigo v) => $"{v.Titulo}\n{string.Join("\n", v.Perguntas)}\n{v.Resposta}";

    public static TrechoFonte DoArtigo(VersaoArtigo v, DateTime agora) =>
        new() { VersaoArtigo = v, Ordem = 0, Texto = TextoDoArtigo(v), ProximaTentativa = agora };
}
