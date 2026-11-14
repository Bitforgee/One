using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Time.Testing;
using Npgsql;
using One.Api.Chamados.Push;
using One.Api.Dados;

namespace One.Api.Tests.Infra;

public class OneFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    const string Servidor = "Host=localhost;Port=5432;Username=postgres;Password=postgres";
    public string Banco { get; } = "one_teste_" + Guid.NewGuid().ToString("N")[..12];
    public FakeTimeProvider Relogio { get; } = new(new DateTimeOffset(2026, 11, 2, 12, 0, 0, TimeSpan.Zero));
    public LlmFalso Llm { get; } = new();
    public LogCapturado Logs { get; } = new();
    public HasherEspiao Hasher { get; } = new();
    public ContadorDeGravacoes Gravacoes { get; } = new();
    public AtrasoDoCommit Commit { get; } = new();
    public static readonly ParVapid Vapid = ParVapid.Gerar();
    public EnviadorFalso Push { get; } = new();
    public MoodleFalso Moodle { get; } = new();
    public static readonly string PemDaFerramenta = RSA.Create(2048).ExportRSAPrivateKeyPem();
    protected virtual bool EnviadorPushReal => false;
    protected virtual bool LimitesReais => false;
    protected virtual int PortaSmtp => 1025;
    protected virtual int PortaMinio => 9000;
    public string Bucket { get; } = "one-teste-" + Guid.NewGuid().ToString("N")[..12];
    int leituras;
    public int LeiturasDeObjeto => leituras;

    sealed class ContaLeituras(OneFactory f) : DelegatingHandler(new HttpClientHandler())
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage r, CancellationToken ct)
        {
            Interlocked.Increment(ref f.leituras);
            return base.SendAsync(r, ct);
        }
    }
    public string? WebRoot { get; set; }

    public string ConnectionString => $"{Servidor};Database={Banco}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:One", ConnectionString);
        builder.UseSetting("Smtp:Host", "localhost");
        builder.UseSetting("Smtp:Porta", PortaSmtp.ToString());
        builder.UseSetting("App:UrlBase", "http://localhost:8080");
        builder.UseSetting("Armazenamento:Endpoint", $"http://localhost:{PortaMinio}");
        builder.UseSetting("Armazenamento:Chave", "one");
        builder.UseSetting("Armazenamento:Segredo", "one-minio-dev");
        builder.UseSetting("Armazenamento:Bucket", Bucket);
        builder.UseSetting("Llm:BaseUrl", "https://llm.teste/v1");
        builder.UseSetting("Llm:ChaveApi", "chave-teste");
        builder.UseSetting("Llm:Modelo", "gpt-6-luna");
        builder.UseSetting("Push:ChavePublica", Vapid.PublicKey);
        builder.UseSetting("Push:ChavePrivada", Vapid.PrivateKey);
        builder.UseSetting("Push:Assunto", "mailto:teste@one.test");
        builder.UseSetting("Agendador:Ativo", "false");
        builder.UseSetting("Moodle:ChavePrivada", PemDaFerramenta);
        if (!LimitesReais)
        {
            builder.UseSetting("Limites:AuthPorMinuto", "100000");
            builder.UseSetting("Limites:MensagensPorMinuto", "100000");
        }
        if (WebRoot is not null)
        {
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
            s.AddHttpClient("moodle").ConfigurePrimaryHttpMessageHandler(() => Moodle);
            s.ConfigureDbContext<OneDb>(o => o.AddInterceptors(Gravacoes, Commit));
            if (!EnviadorPushReal) s.AddSingleton<IEnviadorPush>(Push);
            s.RemoveAll<Armazenamento>();
            s.AddSingleton(sp => new Armazenamento(sp.GetRequiredService<IAmazonS3>(), Bucket, TimeProvider.System, new ContaLeituras(this)));
        });
    }

    public ValueTask InitializeAsync()
    {
        _ = Services;
        ((AmazonS3Client)Services.GetRequiredService<IAmazonS3>()).BeforeRequestEvent += (_, e) =>
        {
            if (e is WebServiceRequestEventArgs { Request: GetObjectRequest }) Interlocked.Increment(ref leituras);
        };
        return ValueTask.CompletedTask;
    }

    public IDisposable MinioFora()
    {
        var config = (AmazonS3Config)((AmazonS3Client)Services.GetRequiredService<IAmazonS3>()).Config;
        var original = config.ServiceURL;
        config.ServiceURL = "http://localhost:1";
        return new Restaurar(() => config.ServiceURL = original);
    }

    sealed class Restaurar(Action acao) : IDisposable
    {
        public void Dispose() => acao();
    }

    public static AmazonS3Client ClienteS3() =>
        new(new BasicAWSCredentials("one", "one-minio-dev"), new AmazonS3Config { ServiceURL = "http://localhost:9000", ForcePathStyle = true, RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED, ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED });

    public async Task<List<string>> Chaves()
    {
        using var s3 = ClienteS3();
        return (await s3.ListObjectsV2Async(new ListObjectsV2Request { BucketName = Bucket })).S3Objects?.Select(o => o.Key).Order().ToList() ?? [];
    }

    public async Task<byte[]> Objeto(string chave)
    {
        using var s3 = ClienteS3();
        using var r = await s3.GetObjectAsync(Bucket, chave);
        using var ms = new MemoryStream();
        await r.ResponseStream.CopyToAsync(ms);
        return ms.ToArray();
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        await ApagarBucket();
        NpgsqlConnection.ClearAllPools();
        await using var con = new NpgsqlConnection(Servidor);
        await con.OpenAsync();
        await using var cmd = new NpgsqlCommand($"DROP DATABASE IF EXISTS {Banco} WITH (FORCE)", con);
        await cmd.ExecuteNonQueryAsync();
        GC.SuppressFinalize(this);
    }

    async Task ApagarBucket()
    {
        using var s3 = ClienteS3();
        try
        {
            var versoes = await s3.ListVersionsAsync(Bucket);
            if (versoes.Versions is { Count: > 0 })
                await s3.DeleteObjectsAsync(new DeleteObjectsRequest { BucketName = Bucket, Objects = [.. versoes.Versions.Select(v => new KeyVersion { Key = v.Key, VersionId = v.VersionId })] });
            await s3.DeleteBucketAsync(Bucket);
        }
        catch (AmazonS3Exception) { }
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

public class ContadorDeGravacoes : SaveChangesInterceptor
{
    int total;
    public int Total => total;
    public void Zerar() => Interlocked.Exchange(ref total, 0);
    public bool FalharAoGravarEmail { get; set; }
    public TimeSpan Atraso { get; set; }

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        Interlocked.Increment(ref total);
        return base.SavingChanges(eventData, result);
    }

    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        Interlocked.Increment(ref total);
        if (FalharAoGravarEmail && eventData.Context!.ChangeTracker.Entries<EmailSaida>().Any(e => e.State == EntityState.Added)) throw new InvalidOperationException("gravação do e-mail simulada");
        if (Atraso > TimeSpan.Zero) await Task.Delay(Atraso, cancellationToken);
        return await base.SavingChangesAsync(eventData, result, cancellationToken);
    }
}

public class AtrasoDoCommit : DbTransactionInterceptor
{
    public TimeSpan Atraso { get; set; }
    public bool Falhar { get; set; }

    public override async ValueTask<InterceptionResult> TransactionCommittingAsync(System.Data.Common.DbTransaction transaction, TransactionEventData eventData, InterceptionResult result, CancellationToken cancellationToken = default)
    {
        if (Falhar) throw new InvalidOperationException("commit simulado");
        if (Atraso > TimeSpan.Zero) await Task.Delay(Atraso, cancellationToken);
        return result;
    }
}

public class OneFactoryComLimites : OneFactory
{
    protected override bool LimitesReais => true;
}

public class OneFactoryEnviadorReal : OneFactory
{
    protected override bool EnviadorPushReal => true;
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
    public List<string> CorposEmbeddings { get; } = [];
    public List<Uri> UrisEmbeddings { get; } = [];
    public List<string?> AutorizacoesEmbeddings { get; } = [];
    public Func<string, CancellationToken, Task<HttpResponseMessage>>? ResponderEmbeddings { get; set; }

    public static float[] Vetor(string texto)
    {
        var v = new float[1536];
        var limpo = new string(texto.ToLowerInvariant().Normalize(NormalizationForm.FormD).Where(ch => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(ch) != System.Globalization.UnicodeCategory.NonSpacingMark).ToArray());
        foreach (var palavra in System.Text.RegularExpressions.Regex.Split(limpo, "[^a-z0-9]+").Where(p => p.Length > 2))
        {
            var h = 2166136261u;
            foreach (var ch in palavra) h = (h ^ ch) * 16777619u;
            v[h % 1536] += 1;
        }
        if (v.All(x => x == 0)) v[0] = 1;
        var norma = (float)Math.Sqrt(v.Sum(x => x * x));
        return v.Select(x => x / norma).ToArray();
    }

    public static HttpResponseMessage RespostaEmbeddings(IEnumerable<string> textos) => new(System.Net.HttpStatusCode.OK)
    {
        Content = new StringContent(JsonSerializer.Serialize(new
        {
            data = textos.Select((t, i) => new { index = i, embedding = Vetor(t) }),
            usage = new { prompt_tokens = 10, total_tokens = 10 },
        }), Encoding.UTF8, "application/json"),
    };
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
        if (request.RequestUri!.AbsolutePath.EndsWith("/embeddings"))
        {
            lock (CorposEmbeddings) { CorposEmbeddings.Add(corpo); UrisEmbeddings.Add(request.RequestUri); AutorizacoesEmbeddings.Add(request.Headers.Authorization?.ToString()); }
            if (ResponderEmbeddings is { } r) return await r(corpo, cancellationToken);
            return RespostaEmbeddings(JsonDocument.Parse(corpo).RootElement.GetProperty("input").EnumerateArray().Select(e => e.GetString()!));
        }
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

public class OneFactoryPrazos : OneFactory
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.UseSetting("Prazos:ConfirmacaoDias", "10");
        builder.UseSetting("Prazos:LembreteAguardandoDias", "4");
    }
}
