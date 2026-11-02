using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace One.Api.Acesso;

public record LoginIn(string? Instituicao, string? Cpf, string? Senha);
public record PrimeiroAcessoIn(string? Instituicao, string? Cpf);
public record DefinirSenhaIn(string? Token, string? NovaSenha);
public record TrocarSenhaIn(string? SenhaAtual, string? NovaSenha);

public static class AuthRotas
{
    public const string CpfInvalido = "CPF inválido.";

    public static void Mapear(RouteGroupBuilder api)
    {
        Login.Mapear(api);
        PrimeiroAcesso.Mapear(api);
        DefinirSenha.Mapear(api);
        // fora do mediator; Delegate: o grupo de métodos (HttpContext) -> Task casaria com RequestDelegate e o 204 se perderia
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
