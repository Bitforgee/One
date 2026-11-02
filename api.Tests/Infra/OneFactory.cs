using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Time.Testing;
using Npgsql;
using One.Api.Dados;

namespace One.Api.Tests.Infra;

// Uma instância por classe de teste: banco próprio no PostgreSQL do compose, relógio e provedor de IA falsos.
public class OneFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    const string Servidor = "Host=localhost;Port=5432;Username=postgres;Password=postgres";
    public string Banco { get; } = "one_teste_" + Guid.NewGuid().ToString("N")[..12];
    public FakeTimeProvider Relogio { get; } = new(new DateTimeOffset(2026, 11, 2, 12, 0, 0, TimeSpan.Zero));
    public LlmFalso Llm { get; } = new();
    public LogCapturado Logs { get; } = new();
    public HasherEspiao Hasher { get; } = new();
    protected virtual bool LimitesReais => false;
    protected virtual int PortaSmtp => 1025;
    public string? WebRoot { get; set; }

    public string ConnectionString => $"{Servidor};Database={Banco}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:One", ConnectionString);
        builder.UseSetting("Smtp:Host", "localhost");
        builder.UseSetting("Smtp:Porta", PortaSmtp.ToString());
        builder.UseSetting("App:UrlBase", "http://localhost:8080");
        builder.UseSetting("Llm:BaseUrl", "https://llm.teste/v1");
        builder.UseSetting("Llm:Modelo", "deepseek-flash");
        builder.UseSetting("Agendador:Ativo", "false"); // os testes chamam Agendador.Executar com o relógio falso
        if (!LimitesReais)
        {
            builder.UseSetting("Limites:AuthPorMinuto", "100000");
            builder.UseSetting("Limites:MensagensPorMinuto", "100000");
        }
        if (WebRoot is not null)
        {
            // com e sem api/wwwroot compilado: o caminho e o provedor de arquivos apontam para a pasta do teste
            builder.UseWebRoot(WebRoot);
            builder.ConfigureServices((ctx, _) => ctx.HostingEnvironment.WebRootFileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(WebRoot));
        }
        builder.ConfigureLogging(l => l.AddProvider(Logs));
        builder.ConfigureTestServices(s =>
        {
            s.RemoveAll<TimeProvider>();
            s.AddSingleton<TimeProvider>(Relogio);
            s.RemoveAll<IPasswordHasher<Usuario>>();
            s.AddSingleton<IPasswordHasher<Usuario>>(Hasher);
            s.AddHttpClient("llm").ConfigurePrimaryHttpMessageHandler(() => Llm);
        });
    }

    public ValueTask InitializeAsync()
    {
        _ = Services; // sobe o host e aplica as migrações
        return ValueTask.CompletedTask;
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        NpgsqlConnection.ClearAllPools();
        await using var con = new NpgsqlConnection(Servidor);
        await con.OpenAsync();
        await using var cmd = new NpgsqlCommand($"DROP DATABASE IF EXISTS {Banco} WITH (FORCE)", con);
        await cmd.ExecuteNonQueryAsync();
        GC.SuppressFinalize(this);
    }

    public HttpClient Cliente() =>
        CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost"), AllowAutoRedirect = false });

    public async Task<T> Db<T>(long? instituicaoId, Func<OneDb, Task<T>> acao)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<OneDb>();
        db.InstituicaoAtual = instituicaoId;
        return await acao(db);
    }

    public Task Db(long? instituicaoId, Func<OneDb, Task> acao) => Db(instituicaoId, async db => { await acao(db); return 0; });
}

public class OneFactoryComLimites : OneFactory
{
    protected override bool LimitesReais => true;
}

public class OneFactorySmtpFora : OneFactory
{
    protected override int PortaSmtp => 1;
}

public class HasherEspiao : IPasswordHasher<Usuario>
{
    readonly PasswordHasher<Usuario> real = new();
    public int Verificacoes;
    public string HashPassword(Usuario user, string password) => real.HashPassword(user, password);
    public PasswordVerificationResult VerifyHashedPassword(Usuario user, string hashedPassword, string providedPassword)
    {
        Interlocked.Increment(ref Verificacoes);
        if (providedPassword == "explode-500") throw new InvalidOperationException("falha simulada");
        return real.VerifyHashedPassword(user, hashedPassword, providedPassword);
    }
}

public class LlmFalso : HttpMessageHandler
{
    public List<string> Corpos { get; } = [];
    public List<HttpRequestMessage> Pedidos { get; } = [];
    public Func<CancellationToken, Task<HttpResponseMessage>> Responder { get; set; } = _ => Task.FromResult(Conteudo(new { tipo = "sem_base", texto = "" }));

    public static readonly object UsoPadrao = new { prompt_tokens = 1200, completion_tokens = 80, prompt_cache_hit_tokens = 1000, prompt_cache_miss_tokens = 200 };

    public static HttpResponseMessage Conteudo(object saidaModelo) => Bruto(JsonSerializer.Serialize(saidaModelo));

    public static HttpResponseMessage Bruto(string? content) => new(System.Net.HttpStatusCode.OK)
    {
        Content = new StringContent(JsonSerializer.Serialize(new { choices = new[] { new { message = new { role = "assistant", content } } }, usage = UsoPadrao }), Encoding.UTF8, "application/json"),
    };

    public void Devolver(object saidaModelo) => Responder = _ => Task.FromResult(Conteudo(saidaModelo));

    public JsonElement UltimoCorpo => JsonDocument.Parse(Corpos[^1]).RootElement;

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var corpo = request.Content is null ? "" : await request.Content.ReadAsStringAsync(cancellationToken);
        Pedidos.Add(request);
        Corpos.Add(corpo);
        return await Responder(cancellationToken);
    }
}

public record Log(string Categoria, LogLevel Nivel, string Mensagem, Dictionary<string, object?> Campos);

public class LogCapturado : ILoggerProvider
{
    public ConcurrentQueue<Log> Entradas { get; } = new();
    public ILogger CreateLogger(string categoryName) => new Registrador(this, categoryName);
    public void Dispose() { }

    class Registrador(LogCapturado dono, string categoria) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            var campos = state is IEnumerable<KeyValuePair<string, object?>> kv ? kv.ToDictionary(x => x.Key, x => x.Value) : [];
            dono.Entradas.Enqueue(new Log(categoria, logLevel, formatter(state, exception) + (exception is null ? "" : " " + exception.Message), campos));
        }
    }
}
