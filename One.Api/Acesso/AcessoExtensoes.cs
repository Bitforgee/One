using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using One.Api.Dados;

namespace One.Api.Acesso;

public static class AcessoExtensoes
{
    public static IServiceCollection AddAcesso(this IServiceCollection s)
    {
        s.AddScoped<IPasswordHasher<Usuario>, PasswordHasher<Usuario>>();
        s.AddHttpClient("moodle", c => c.Timeout = TimeSpan.FromSeconds(10));
        s.AddSingleton<ChaveLti>();
        s.AddScoped<ValidadorLti>();
        s.AddSingleton<ITarefaAgendada, ApagarLancamentos>();
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
            o.Events.OnValidatePrincipal = CookieDeSessao.Validar;
        });
        return s;
    }

    public static void MapAcesso(this RouteGroupBuilder api)
    {
        Login.Mapear(api);
        PrimeiroAcesso.Mapear(api);
        DefinirSenha.Mapear(api);
        Logout.Mapear(api);
        Eu.Mapear(api);
        TrocarSenha.Mapear(api);
        IniciarLoginMoodle.Mapear(api);
        LancamentoMoodle.Mapear(api);
        ChavesMoodle.Mapear(api);
        VerInstituicao.Mapear(api);
    }

    public static IApplicationBuilder UseAcesso(this IApplicationBuilder app) => app.Use(CookieDeSessao.ExigirTrocaDeSenha);
}