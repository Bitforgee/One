using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api;

public static class Sessao
{
    static readonly HashSet<string> LivresDaTroca = ["/api/auth/login", "/api/auth/logout", "/api/auth/me", "/api/auth/senha"];

    public static ClaimsPrincipal Principal(Usuario u) =>
        new(new ClaimsIdentity([new Claim("sub", u.Id.ToString()), new Claim("instituicao_id", u.InstituicaoId.ToString())],
            CookieAuthenticationDefaults.AuthenticationScheme));

    public static async Task Validar(CookieValidatePrincipalContext ctx)
    {
        var db = ctx.HttpContext.RequestServices.GetRequiredService<OneDb>();
        var sub = long.Parse(ctx.Principal!.FindFirstValue("sub")!);
        var instituicaoId = long.Parse(ctx.Principal!.FindFirstValue("instituicao_id")!);
        db.InstituicaoAtual = instituicaoId;
        var instituicao = await db.Instituicoes.FindAsync(instituicaoId);
        var usuario = await db.Usuarios.Include(u => u.Papeis).FirstOrDefaultAsync(u => u.Id == sub);
        if (instituicao is not { Ativa: true } || usuario is not { Ativo: true })
        {
            db.InstituicaoAtual = null;
            ctx.RejectPrincipal();
            await ctx.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return;
        }
        ctx.HttpContext.Items[typeof(Usuario)] = usuario;
        ctx.HttpContext.Items[typeof(Instituicao)] = instituicao;
        ctx.ShouldRenew = true;
    }

    public static async Task ExigirTrocaDeSenha(HttpContext ctx, RequestDelegate next)
    {
        if (ctx.Items[typeof(Usuario)] is Usuario { DeveTrocarSenha: true } && !LivresDaTroca.Contains(ctx.Request.Path.Value ?? ""))
        {
            await Problemas.Erro(403, "Troque a senha para continuar.").ExecuteAsync(ctx);
            return;
        }
        await next(ctx);
    }

    public static Usuario Usuario(this HttpContext ctx) => (Usuario)ctx.Items[typeof(Usuario)]!;
    public static Instituicao Instituicao(this HttpContext ctx) => (Instituicao)ctx.Items[typeof(Instituicao)]!;
}
