namespace One.Api.Assistente;

public static class AssistenteExtensoes
{
    public static IServiceCollection AddAssistente(this IServiceCollection s)
    {
        s.AddScoped<Assistente>();
        s.AddSingleton<Embeddings>();
        s.AddHttpClient("llm", Llm);
        s.AddSingleton<ITarefaAgendada, AbandonarConversas>();
        return s;
    }

    public static IServiceCollection AddIndexacaoDeTrechos(this IServiceCollection s) => s.AddSingleton<ITarefaAgendada, IndexarTrechos>();

    public static void MapAssistente(this RouteGroupBuilder api)
    {
        NovaConversa.Mapear(api);
        NovaMensagem.Mapear(api);
        VerConversa.Mapear(api);
        BaixarAnexoConversa.Mapear(api);
        AvaliarConversa.Mapear(api);
        TransferirConversa.Mapear(api);
        VerDestino.Mapear(api);
        AtendimentoDireto.Mapear(api);
        EncerrarConversa.Mapear(api);
    }

    static void Llm(IServiceProvider sp, HttpClient c)
    {
        var cfg = sp.GetRequiredService<IConfiguration>();
        c.BaseAddress = new Uri((cfg["Llm:BaseUrl"] ?? "https://api.openai.com/v1").TrimEnd('/') + "/");
        if (cfg["Llm:ChaveApi"] is { Length: > 0 } chave) c.DefaultRequestHeaders.Authorization = new("Bearer", chave);
        c.Timeout = Timeout.InfiniteTimeSpan;
    }
}