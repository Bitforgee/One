using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection.Extensions;
using One.Api.Acesso;
using One.Api.Administracao;
using One.Api.Assistente;
using One.Api.Chamados;
using One.Api.Conhecimento;
using One.Api.Dados;
using One.Api.Indicadores;
using One.Api.Instituicoes;

namespace One.Api;

public class Program
{
    public static async Task<int> Main(string[] args)
    {
        var comando = args is ["instituicao", ..];
        var builder = WebApplication.CreateBuilder(args);
        if (comando) builder.Logging.ClearProviders();
        Servicos(builder.Services);
        Seguranca(builder.Services);

        var app = builder.Build();

        using (var scope = app.Services.CreateScope())
            scope.ServiceProvider.GetRequiredService<OneDb>().Database.Migrate();

        if (comando)
            return await InstituicaoComando.Executar(app.Services, args[1..], Console.Out, Console.Error);

        app.UseExceptionHandler();
        app.UseStatusCodePages();
        app.UseStaticFiles();
        app.UseAuthentication();
        app.Use(Sessao.ExigirTrocaDeSenha);
        app.UseAuthorization();
        app.UseRateLimiter();
        Rotas(app);

        app.Run();
        return 0;
    }

    static void Servicos(IServiceCollection s)
    {
        s.AddDbContext<OneDb>((sp, o) => o.UseNpgsql(sp.GetRequiredService<IConfiguration>().GetConnectionString("One"), n => n.UseVector()));
        s.TryAddSingleton(TimeProvider.System);
        s.AddScoped<IPasswordHasher<Usuario>, PasswordHasher<Usuario>>();
        s.AddSingleton<Email>();
        s.AddScoped<Assistente.Assistente>();
        s.AddSingleton<Embeddings>();
        s.AddSingleton(sp => Prazos.Ler(sp.GetRequiredService<IConfiguration>()));
        s.AddSingleton<Agendador>();
        s.AddHostedService(sp => sp.GetRequiredService<Agendador>());
        s.AddHttpClient("llm", Llm);
        // vertical-slice-completa door 2: Scoped, para o handler usar o OneDb que Sessao.Validar filtrou nesta requisição
        s.AddMediator(o => { o.ServiceLifetime = ServiceLifetime.Scoped; o.PipelineBehaviors = [typeof(AgirNoChamado<,>)]; });
        s.AddScoped<AcessoChamado>();
        s.Configure<RouteHandlerOptions>(o => o.ThrowOnBadRequest = false);

        s.AddProblemDetails(o => o.CustomizeProblemDetails = c =>
        {
            var status = c.ProblemDetails.Status ?? c.HttpContext.Response.StatusCode;
            c.ProblemDetails.Title = Problemas.Titulo(status);
            if (c.Exception is not null && Problemas.Conflito(c.Exception)) c.ProblemDetails.Detail = Problemas.AlteradoPorOutro;
            c.ProblemDetails.Detail ??= Problemas.Detalhe(status);
            c.ProblemDetails.Type ??= $"https://developer.mozilla.org/docs/Web/HTTP/Reference/Status/{status}";
        });

        // door 14: xmin divergente ou chave única violada por pedido simultâneo viram 409, sem mudar nada
        s.AddExceptionHandler(o => o.StatusCodeSelector = e => Problemas.Conflito(e) ? 409 : 500);
    }

    // RAG door R1: chat e embeddings pelo mesmo cliente; o limite de 20 s é do relógio injetado (Embeddings.TempoLimite)
    static void Llm(IServiceProvider sp, HttpClient c)
    {
        var cfg = sp.GetRequiredService<IConfiguration>();
        c.BaseAddress = new Uri((cfg["Llm:BaseUrl"] ?? "https://api.openai.com/v1").TrimEnd('/') + "/");
        if (cfg["Llm:ChaveApi"] is { Length: > 0 } chave) c.DefaultRequestHeaders.Authorization = new("Bearer", chave);
        c.Timeout = Timeout.InfiniteTimeSpan;
    }

    static void Seguranca(IServiceCollection s)
    {
        s.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(o =>
        {
            o.Cookie.Name = "one.auth";
            o.Cookie.HttpOnly = true;
            o.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            o.Cookie.SameSite = SameSiteMode.Strict;
            o.ExpireTimeSpan = TimeSpan.FromHours(8);
            o.SlidingExpiration = true;
            o.Events.OnRedirectToLogin = c => { c.Response.StatusCode = 401; return Task.CompletedTask; };
            o.Events.OnRedirectToAccessDenied = c => { c.Response.StatusCode = 403; return Task.CompletedTask; };
            o.Events.OnValidatePrincipal = Sessao.Validar;
        });
        s.AddAuthorization();

        s.AddRateLimiter(o =>
        {
            o.RejectionStatusCode = 429;
            o.AddPolicy("auth", c => RateLimitPartition.GetFixedWindowLimiter(c.Connection.RemoteIpAddress?.ToString() ?? "",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = Limite(c, "Limites:AuthPorMinuto", 5), Window = TimeSpan.FromSeconds(60) }));
            o.AddPolicy("mensagens", c => RateLimitPartition.GetFixedWindowLimiter(c.User.FindFirstValue("sub") ?? "",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = Limite(c, "Limites:MensagensPorMinuto", 10), Window = TimeSpan.FromSeconds(60) }));
        });
    }

    static int Limite(HttpContext c, string chave, int padrao) => c.RequestServices.GetRequiredService<IConfiguration>().GetValue(chave, padrao);

    static void Rotas(WebApplication app)
    {
        var api = app.MapGroup("/api").RequireAuthorization();
        AuthRotas.Mapear(api);
        InstituicaoRotas.Mapear(api);
        ConversaRotas.Mapear(api);
        ChamadoRotas.Mapear(api);
        ArtigoRotas.Mapear(api);
        AdminRotas.Mapear(api);
        IndicadorRotas.Mapear(api);
        DocumentoRotas.Mapear(api);

        app.MapFallback("/api/{**resto}", () => Problemas.Erro(404, "Recurso não encontrado."));
        app.MapFallbackToFile("index.html");
    }
}
