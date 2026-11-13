using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace One.Api.Acesso;

public static class Logout
{
    public static void Mapear(RouteGroupBuilder api) => api.MapPost("/auth/logout", (Delegate)Sair).AllowAnonymous();

    static async Task<IResult> Sair(HttpContext ctx)
    {
        await ctx.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Results.NoContent();
    }
}
