using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection.Extensions;
using One.Api;
using One.Api.Comando;
using One.Api.Dados;
using One.Api.Rotas;

var comando = args is ["instituicao", ..];
var builder = WebApplication.CreateBuilder(args);
if (comando) builder.Logging.ClearProviders();

builder.Services.AddDbContext<OneDb>((sp, o) => o.UseNpgsql(sp.GetRequiredService<IConfiguration>().GetConnectionString("One"), n => n.UseVector()));
builder.Services.TryAddSingleton(TimeProvider.System);
builder.Services.AddScoped<IPasswordHasher<Usuario>, PasswordHasher<Usuario>>();
builder.Services.AddSingleton<Email>();
builder.Services.AddScoped<One.Api.Assistente.Assistente>();
builder.Services.AddSingleton<One.Api.Assistente.Embeddings>();
builder.Services.AddSingleton<Agendador>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<Agendador>());
builder.Services.AddHttpClient("llm", c => c.Timeout = Timeout.InfiniteTimeSpan);
builder.Services.Configure<RouteHandlerOptions>(o => o.ThrowOnBadRequest = false);

builder.Services.AddProblemDetails(o => o.CustomizeProblemDetails = c =>
{
    var status = c.ProblemDetails.Status ?? c.HttpContext.Response.StatusCode;
    c.ProblemDetails.Title = Problemas.Titulo(status);
    if (c.Exception is not null && Problemas.Conflito(c.Exception)) c.ProblemDetails.Detail = Problemas.AlteradoPorOutro;
    c.ProblemDetails.Detail ??= Problemas.Detalhe(status);
    c.ProblemDetails.Type ??= $"https://developer.mozilla.org/docs/Web/HTTP/Reference/Status/{status}";
});

// door 14: xmin divergente ou chave única violada por pedido simultâneo viram 409, sem mudar nada
builder.Services.AddExceptionHandler(o => o.StatusCodeSelector = e => Problemas.Conflito(e) ? 409 : 500);

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(o =>
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
builder.Services.AddAuthorization();

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.AddPolicy("auth", c => RateLimitPartition.GetFixedWindowLimiter(c.Connection.RemoteIpAddress?.ToString() ?? "",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = Limite(c, "Limites:AuthPorMinuto", 5), Window = TimeSpan.FromSeconds(60) }));
    o.AddPolicy("mensagens", c => RateLimitPartition.GetFixedWindowLimiter(c.User.FindFirstValue("sub") ?? "",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = Limite(c, "Limites:MensagensPorMinuto", 10), Window = TimeSpan.FromSeconds(60) }));
});

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

var api = app.MapGroup("/api").RequireAuthorization();
AuthRotas.Mapear(api);
InstituicaoRotas.Mapear(api);
ConversaRotas.Mapear(api);
ChamadoRotas.Mapear(api);
ArtigoRotas.Mapear(api);
AdminRotas.Mapear(api);
IndicadorRotas.Mapear(api);

app.MapFallback("/api/{**resto}", () => Problemas.Erro(404, "Recurso não encontrado."));
app.MapFallbackToFile("index.html");

app.Run();
return 0;

static int Limite(HttpContext c, string chave, int padrao) => c.RequestServices.GetRequiredService<IConfiguration>().GetValue(chave, padrao);

public partial class Program;
