using System.Net.Http.Json;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Conhecimento;
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

public record Trecho(long FonteId, string? Texto);
public record SaidaModelo(string? Tipo, string? Texto, List<long>? FonteIds, List<Trecho>? Trechos, long? CategoriaId, string? Resumo);

public class Assistente(IHttpClientFactory http, IConfiguration cfg, TimeProvider relogio, ILogger<Assistente> log, OneDb db, Embeddings embeddings)
{
    public const string Autor = "ASSISTENTE";

    static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    const string Regras = """
        Você é o assistente de atendimento ao aluno de uma instituição de ensino superior. Responda em português do Brasil, tratando o aluno por "você", em poucas frases.
        Regras:
        1. Responda só com o que está nas fontes abaixo. Não invente regras, prazos, valores nem exceções.
        2. Não cite nem mencione as fontes, seus títulos ou ids no texto para o aluno.
        3. Em "trechos", copie literalmente, sem mudar nenhuma letra, de 1 a 3 trechos de 20 a 400 caracteres do texto de cada fonte citada que sustentam o que você escreveu.
        4. Use só links que aparecem nas fontes citadas.
        5. Se faltar informação para escolher a orientação certa, faça uma pergunta curta, de até 200 caracteres e terminada em "?", com tipo "pergunta".
        6. Se nenhuma fonte responde, devolva tipo "sem_base". Se o aluno pedir um atendente, devolva tipo "transferir".
        7. Em "categoriaId", sugira a categoria do assunto entre as categorias abaixo. Em "resumo", resuma o caso em uma frase para o atendente, sem dados pessoais.
        Devolva apenas um objeto JSON: {"tipo":"resposta"|"pergunta"|"sem_base"|"transferir","texto":"...","fonteIds":[12],"trechos":[{"fonteId":12,"texto":"..."}],"categoriaId":3,"resumo":"..."}
        """;

    // RAG, AC 7: a consulta são as últimas 3 mensagens do aluno, mascaradas como as do chat (AC 34 do mvp-one)
    public static string Consulta(IEnumerable<MensagemConversa> mensagens) =>
        string.Join("\n", mensagens.Where(m => m.Autor != Autor).OrderBy(m => m.Id).TakeLast(3).Select(m => Mascara.Aplicar(m.Texto)));

    // RAG, AC 7 e AC 8: os K trechos mais próximos, só de fontes buscáveis da instituição da sessão (door 16)
    public async Task<List<Fonte>> Buscar(float[] vetor, long instituicaoId)
    {
        var k = cfg.GetValue("Rag:K", 5);
        var fuso = await db.Instituicoes.Where(i => i.Id == instituicaoId).Select(i => i.Fuso).SingleAsync();
        var hoje = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(relogio.GetUtcNow().UtcDateTime, TimeZoneInfo.FindSystemTimeZoneById(fuso)));
        return await Fontes.Buscar(db, vetor, hoje, k);
    }

    // Recebe a conversa com a mensagem nova do aluno já gravada e devolve a mensagem do assistente a gravar.
    public async Task<MensagemConversa> Responder(Conversa conversa)
    {
        var modelo = cfg["Llm:Modelo"] ?? "gpt-6-luna";
        var inicioBusca = relogio.GetTimestamp();
        List<Fonte> fontes;
        try
        {
            fontes = await Buscar((await embeddings.Gerar([Consulta(conversa.Mensagens)]))[0], conversa.InstituicaoId);
        }
        catch (Exception e) when (e is HttpRequestException or OperationCanceledException or JsonException or InvalidOperationException)
        {
            // AC 14: sem embedding da consulta não há busca nem chamada ao chat
            log.LogWarning(e, "Assistente respondeu sem_base por {Motivo} (instituição {InstituicaoId}, conversa {ConversaId})", "busca_indisponivel", conversa.InstituicaoId, conversa.Id);
            return new MensagemConversa { Autor = Autor, Texto = Textos.SemBase, TipoFinal = Tipos.SemBase, Modelo = modelo, CriadaEm = relogio.GetUtcNow().UtcDateTime, TrechosBuscados = [] };
        }
        log.LogInformation("Busca de fontes: instituicao={InstituicaoId} conversa={ConversaId} trechos={Trechos} distancias={Distancias} duracaoMs={DuracaoMs}",
            conversa.InstituicaoId, conversa.Id, string.Join(",", fontes.Select(f => f.Id)),
            string.Join(",", fontes.Select(f => f.Distancia.ToString("0.####", System.Globalization.CultureInfo.InvariantCulture))),
            (long)relogio.GetElapsedTime(inicioBusca).TotalMilliseconds);

        var categorias = await db.Categorias.Where(c => c.Ativa).OrderBy(c => c.Id).Select(c => new { id = c.Id, nome = c.Nome }).ToListAsync();
        var historico = conversa.Mensagens.OrderBy(m => m.Id).TakeLast(10)
            .Select(m => new { role = m.Autor == Autor ? "assistant" : "user", content = Mascara.Aplicar(m.Texto) });

        // RAG, door R1: corpo do Chat Completions da OpenAI, sem max_tokens nem temperature (pergunta 1 do plano)
        var corpo = new
        {
            model = modelo,
            messages = new object[]
            {
                new { role = "system", content = Regras },
                new { role = "system", content = "Fontes (JSON):\n" + JsonSerializer.Serialize(fontes.Select(f => new { id = f.Id, titulo = f.Titulo, texto = f.Texto, links = f.Links }), Json) },
                new { role = "system", content = "Categorias (JSON):\n" + JsonSerializer.Serialize(categorias, Json) },
            }.Concat(historico),
            response_format = new { type = "json_object" },
            max_completion_tokens = 800,
            reasoning_effort = "none",
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
                    (citacoes, motivo) = Conferir(saida, fontes);
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
            saida?.Tipo, tipoFinal, string.Join(",", (saida?.FonteIds ?? []).Select(id => fontes.FirstOrDefault(f => f.Id == id)?.ArtigoId).OfType<long>()));

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
            TrechosBuscados = fontes.Select(f => f.Id).ToList(),
        };
    }

    // door 19 contra o trecho de fonte citado (AC 11 e AC 12): só fontes buscadas; trecho literal no texto da fonte; links do artigo de origem
    static (List<CitacaoArtigo>, string?) Conferir(SaidaModelo saida, List<Fonte> buscadas)
    {
        var ids = saida.FonteIds?.Distinct().ToList() ?? [];
        var citadas = ids.Select(id => buscadas.FirstOrDefault(f => f.Id == id)).ToList();
        if (ids.Count == 0 || citadas.Any(f => f is null)) return ([], "fonte_invalida");
        if (string.IsNullOrWhiteSpace(saida.Texto)) return ([], "texto_vazio");

        var trechos = saida.Trechos ?? [];
        var trechosConferem = trechos.All(t => citadas.FirstOrDefault(f => f!.Id == t.FonteId) is { } f && Conferencia.TrechoConfere(t.Texto, f.Texto))
            && citadas.All(f => trechos.Any(t => t.FonteId == f!.Id));
        if (!trechosConferem) return ([], "trecho_invalido");
        if (!Conferencia.LinksConferem(saida.Texto, citadas.SelectMany(f => f!.Links))) return ([], "link_invalido");

        return (citadas.Select(f => new CitacaoArtigo
        {
            TrechoFonteId = f!.Id,
            Trechos = trechos.Where(t => t.FonteId == f.Id).Select(t => t.Texto!).ToList(),
        }).ToList(), null);
    }

    record struct Uso(int ComCache, int SemCache, int Saida);

    async Task<(SaidaModelo?, string?, Uso)> Chamar(object corpo)
    {
        using var limite = new CancellationTokenSource(Embeddings.TempoLimite, relogio);
        var uso = new Uso();
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, "chat/completions") { Content = JsonContent.Create(corpo, options: Json) };
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
