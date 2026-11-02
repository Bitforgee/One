using System.Net.Http.Json;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Assistente;

public static class Tipos
{
    public const string Resposta = "resposta";
    public const string Pergunta = "pergunta";
    public const string SemBase = "sem_base";
    public const string Transferir = "transferir";
}

public static class Textos
{
    public const string SemBase = "Não encontrei isso nas orientações da instituição. Posso transferir você para um atendente.";
    public const string Transferir = "Vou transferir você para um atendente.";
}

public record Trecho(long ArtigoId, string? Texto);
public record SaidaModelo(string? Tipo, string? Texto, List<long>? ArtigoIds, List<Trecho>? Trechos, long? CategoriaId, string? Resumo);

public class Assistente(IHttpClientFactory http, IConfiguration cfg, TimeProvider relogio, ILogger<Assistente> log, OneDb db)
{
    public const string Autor = "ASSISTENTE";

    static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    const string Regras = """
        Você é o assistente de atendimento ao aluno de uma instituição de ensino superior. Responda em português do Brasil, tratando o aluno por "você", em poucas frases.
        Regras:
        1. Responda só com o que está nos artigos abaixo. Não invente regras, prazos, valores nem exceções.
        2. Não cite nem mencione os artigos, seus títulos ou ids no texto para o aluno.
        3. Em "trechos", copie literalmente, sem mudar nenhuma letra, de 1 a 3 trechos de 20 a 400 caracteres da resposta de cada artigo citado que sustentam o que você escreveu.
        4. Use só links que aparecem nos artigos citados.
        5. Se faltar informação para escolher a orientação certa, faça uma pergunta curta, de até 200 caracteres e terminada em "?", com tipo "pergunta".
        6. Se nenhum artigo responde, devolva tipo "sem_base". Se o aluno pedir um atendente, devolva tipo "transferir".
        7. Em "categoriaId", sugira a categoria do assunto entre as categorias abaixo. Em "resumo", resuma o caso em uma frase para o atendente, sem dados pessoais.
        Devolva apenas um objeto JSON: {"tipo":"resposta"|"pergunta"|"sem_base"|"transferir","texto":"...","artigoIds":[12],"trechos":[{"artigoId":12,"texto":"..."}],"categoriaId":3,"resumo":"..."}
        """;

    // Recebe a conversa com a mensagem nova do aluno já gravada e devolve a mensagem do assistente a gravar.
    public async Task<MensagemConversa> Responder(Conversa conversa)
    {
        var modelo = cfg["Llm:Modelo"] ?? "deepseek-flash";
        // shortcut: o catálogo inteiro vai no prompt; acima de ~100 artigos por instituição, pré-filtrar por busca textual (door 4)
        // AC 150: só artigos dentro da validade, em dias do fuso da instituição
        var fuso = await db.Instituicoes.Where(i => i.Id == conversa.InstituicaoId).Select(i => i.Fuso).SingleAsync();
        var hoje = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(relogio.GetUtcNow().UtcDateTime, TimeZoneInfo.FindSystemTimeZoneById(fuso)));
        var artigos = await db.Artigos.Where(a => a.Estado == EstadosArtigo.Ativo && (a.VisivelDe == null || a.VisivelDe <= hoje) && (a.VisivelAte == null || a.VisivelAte >= hoje))
            .Select(a => a.Versoes.OrderByDescending(v => v.Numero).First()).ToListAsync();
        var categorias = await db.Categorias.Where(c => c.Ativa).OrderBy(c => c.Id).Select(c => new { id = c.Id, nome = c.Nome }).ToListAsync();
        var historico = conversa.Mensagens.OrderBy(m => m.Id).TakeLast(10)
            .Select(m => new { role = m.Autor == Autor ? "assistant" : "user", content = Mascara.Aplicar(m.Texto) });

        var corpo = new
        {
            model = modelo,
            messages = new object[]
            {
                new { role = "system", content = Regras },
                new { role = "system", content = "Artigos (JSON):\n" + JsonSerializer.Serialize(artigos.Select(v => new { id = v.ArtigoId, titulo = v.Titulo, perguntas = v.Perguntas, resposta = v.Resposta, links = v.Links }), Json) },
                new { role = "system", content = "Categorias (JSON):\n" + JsonSerializer.Serialize(categorias, Json) },
            }.Concat(historico),
            response_format = new { type = "json_object" },
            temperature = 0,
            max_tokens = 800,
        };

        var inicio = relogio.GetTimestamp();
        var (saida, motivo, uso) = await Chamar(corpo);

        var citacoes = new List<CitacaoArtigo>();
        var tipoFinal = Tipos.SemBase;
        if (motivo is null)
        {
            switch (saida!.Tipo)
            {
                case Tipos.Resposta:
                    (citacoes, motivo) = Conferir(saida, artigos);
                    if (motivo is null) tipoFinal = Tipos.Resposta;
                    break;
                case Tipos.Pergunta:
                    var ultimas = conversa.Mensagens.Where(m => m.Autor == Autor).OrderByDescending(m => m.Id).Take(2).ToList();
                    var texto = saida.Texto?.Trim() ?? "";
                    if (texto.Length is > 0 and <= 200 && texto.EndsWith('?') && !(ultimas.Count == 2 && ultimas.All(m => m.TipoFinal == Tipos.Pergunta)))
                        tipoFinal = Tipos.Pergunta;
                    else motivo = "pergunta_invalida";
                    break;
                case Tipos.Transferir:
                    tipoFinal = Tipos.Transferir;
                    break;
            }
        }

        if (motivo is not null)
            log.LogWarning("Assistente respondeu sem_base por {Motivo} (instituição {InstituicaoId}, conversa {ConversaId})", motivo, conversa.InstituicaoId, conversa.Id);
        log.LogInformation(
            "Chamada ao provedor de IA: instituicao={InstituicaoId} modelo={Modelo} duracaoMs={DuracaoMs} entradaComCache={EntradaComCache} entradaSemCache={EntradaSemCache} saida={TokensSaida} tipoDevolvido={TipoDevolvido} tipoFinal={TipoFinal} artigos={Artigos}",
            conversa.InstituicaoId, modelo, (long)relogio.GetElapsedTime(inicio).TotalMilliseconds, uso.ComCache, uso.SemCache, uso.Saida,
            saida?.Tipo, tipoFinal, string.Join(",", saida?.ArtigoIds ?? []));

        return new MensagemConversa
        {
            Autor = Autor,
            Texto = tipoFinal switch
            {
                Tipos.Resposta => saida!.Texto!,
                Tipos.Pergunta => saida!.Texto!.Trim(),
                Tipos.Transferir => Textos.Transferir,
                _ => Textos.SemBase,
            },
            TipoDevolvido = saida?.Tipo,
            TipoFinal = tipoFinal,
            Modelo = modelo,
            CategoriaIdSugerida = saida?.CategoriaId,
            Resumo = saida?.Resumo,
            CriadaEm = relogio.GetUtcNow().UtcDateTime,
            Citacoes = citacoes,
        };
    }

    static (List<CitacaoArtigo>, string?) Conferir(SaidaModelo saida, List<VersaoArtigo> ativos)
    {
        var ids = saida.ArtigoIds?.Distinct().ToList() ?? [];
        var citados = ids.Select(id => ativos.FirstOrDefault(v => v.ArtigoId == id)).ToList();
        if (ids.Count == 0 || citados.Any(v => v is null)) return ([], "artigo_invalido");
        if (string.IsNullOrWhiteSpace(saida.Texto)) return ([], "texto_vazio");

        var trechos = saida.Trechos ?? [];
        var trechosConferem = trechos.All(t => citados.FirstOrDefault(v => v!.ArtigoId == t.ArtigoId) is { } v && Conferencia.TrechoConfere(t.Texto, v.Resposta))
            && citados.All(v => trechos.Any(t => t.ArtigoId == v!.ArtigoId));
        if (!trechosConferem) return ([], "trecho_invalido");
        if (!Conferencia.LinksConferem(saida.Texto, citados.SelectMany(v => v!.Links))) return ([], "link_invalido");

        return (citados.Select(v => new CitacaoArtigo
        {
            VersaoArtigoId = v!.Id,
            Trechos = trechos.Where(t => t.ArtigoId == v.ArtigoId).Select(t => t.Texto!).ToList(),
        }).ToList(), null);
    }

    record struct Uso(int ComCache, int SemCache, int Saida);

    async Task<(SaidaModelo?, string?, Uso)> Chamar(object corpo)
    {
        using var limite = new CancellationTokenSource(TimeSpan.FromSeconds(20), relogio);
        var uso = new Uso();
        try
        {
            var url = (cfg["Llm:BaseUrl"] ?? "https://api.deepseek.com").TrimEnd('/') + "/chat/completions";
            using var req = new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(corpo, options: Json) };
            if (!string.IsNullOrEmpty(cfg["Llm:ChaveApi"])) req.Headers.Authorization = new("Bearer", cfg["Llm:ChaveApi"]);
            using var resp = await http.CreateClient("llm").SendAsync(req, limite.Token);
            if (!resp.IsSuccessStatusCode) return (null, $"provedor_http_{(int)resp.StatusCode}", uso);

            using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync(limite.Token));
            uso = LerUso(doc.RootElement);
            var conteudo = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
            if (string.IsNullOrWhiteSpace(conteudo)) return (null, "provedor_conteudo_vazio", uso);
            var saida = JsonSerializer.Deserialize<SaidaModelo>(conteudo, Json);
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
        // DeepSeek informa acerto e falta de cache; o formato OpenAI informa prompt_tokens_details.cached_tokens.
        var comCache = u.TryGetProperty("prompt_cache_hit_tokens", out _) ? Ler(u, "prompt_cache_hit_tokens")
            : u.TryGetProperty("prompt_tokens_details", out var d) && d.ValueKind == JsonValueKind.Object ? Ler(d, "cached_tokens") : 0;
        var semCache = u.TryGetProperty("prompt_cache_miss_tokens", out _) ? Ler(u, "prompt_cache_miss_tokens") : entrada - comCache;
        return new(comCache, semCache, Ler(u, "completion_tokens"));
    }
}
