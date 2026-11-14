using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace One.Api.Assistente.Respostas;

public sealed record CorpoDoProvedor(
    [property: JsonPropertyName("model")] string Modelo,
    [property: JsonPropertyName("messages")] IReadOnlyList<MensagemDoProvedor> Mensagens,
    [property: JsonPropertyName("response_format")] FormatoDaResposta FormatoDaResposta,
    [property: JsonPropertyName("max_completion_tokens")] int MaximoDeTokens,
    [property: JsonPropertyName("reasoning_effort")] string EsforcoDeRaciocinio);

public sealed record MensagemDoProvedor(
    [property: JsonPropertyName("role")] string Papel,
    [property: JsonPropertyName("content")] JsonNode Conteudo);

public sealed record FormatoDaResposta([property: JsonPropertyName("type")] string Tipo);

public sealed record ParteTexto([property: JsonPropertyName("type")] string Tipo, [property: JsonPropertyName("text")] string Texto);

public sealed record ParteImagem([property: JsonPropertyName("type")] string Tipo, [property: JsonPropertyName("image_url")] UrlDaImagem Imagem);

public sealed record ParteArquivo([property: JsonPropertyName("type")] string Tipo, [property: JsonPropertyName("file")] ArquivoDoProvedor Arquivo);

public sealed record UrlDaImagem([property: JsonPropertyName("url")] string Endereco);

public sealed record ArquivoDoProvedor([property: JsonPropertyName("filename")] string Nome, [property: JsonPropertyName("file_data")] string Dados);

public sealed record FonteDoPrompt(
    [property: JsonPropertyName("id")] long Id,
    [property: JsonPropertyName("titulo")] string Titulo,
    [property: JsonPropertyName("texto")] string Texto,
    [property: JsonPropertyName("links")] List<string> Links);

public sealed record CategoriaDoPrompt([property: JsonPropertyName("id")] long Id, [property: JsonPropertyName("nome")] string Nome);
