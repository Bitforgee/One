using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace One.Api.Acesso;

public static class AuthRotas
{
    public const string CpfInvalido = "CPF inválido.";

    public static void Mapear(RouteGroupBuilder api)
    {
        Login.Mapear(api);
        PrimeiroAcesso.Mapear(api);
        DefinirSenha.Mapear(api);
        api.MapPost("/auth/logout", (Delegate)Logout).AllowAnonymous();
        Eu.Mapear(api);
        TrocarSenha.Mapear(api);
    }

    static async Task<IResult> Logout(HttpContext ctx)
    {
        await ctx.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Results.NoContent();
    }
}
