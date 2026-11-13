using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using One.Api.Dados;

namespace One.Api.Mcp;

public sealed class AutenticacaoMcp(IOptionsMonitor<AuthenticationSchemeOptions> opcoes, ILoggerFactory logs, UrlEncoder codificador, OneDb db, TimeProvider relogio)
    : AuthenticationHandler<AuthenticationSchemeOptions>(opcoes, logs, codificador)
{
    public const string Esquema = "mcp";
    const string Prefixo = "Bearer ";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var cabecalho = Request.Headers.Authorization.ToString();
        if (!cabecalho.StartsWith(Prefixo, StringComparison.OrdinalIgnoreCase)) return AuthenticateResult.NoResult();
        var token = cabecalho[Prefixo.Length..].Trim();
        var slug = TokenMcp.SlugDoMcp(token);
        if (slug is null || Request.RouteValues["slug"] as string != slug) return AuthenticateResult.Fail("token");

        var instituicao = await db.Instituicoes.FirstOrDefaultAsync(i => i.Slug == slug && i.Ativa);
        if (instituicao is null) return AuthenticateResult.Fail("instituicao");
        db.InstituicaoAtual = instituicao.Id;

        var hash = Tokens.Hash(token);
        var agora = relogio.GetUtcNow().UtcDateTime;
        var registro = await db.TokensMcp.FirstOrDefaultAsync(t => t.Hash == hash);
        if (registro is null || registro.Estado(agora) != TokenMcp.Estados.Ativo) return AuthenticateResult.Fail("token");

        var usuario = await db.Usuarios.Include(u => u.Papeis).FirstOrDefaultAsync(u => u.Id == registro.UsuarioId);
        if (!PodeUsar(usuario)) return AuthenticateResult.Fail("usuario");

        if (registro.RegistrarUso(agora)) await db.SaveChangesAsync();
        var identidade = new ClaimsIdentity([new Claim("sub", usuario!.Id.ToString()), new Claim("instituicao_id", instituicao.Id.ToString())], Esquema);
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identidade), Esquema));
    }

    static bool PodeUsar(Usuario? u) => u is { Ativo: true, DeveTrocarSenha: false } && (u.Tem(Papeis.Atendente) || u.Tem(Papeis.Administrador));

    protected override Task HandleChallengeAsync(AuthenticationProperties propriedades)
    {
        Response.StatusCode = StatusCodes.Status401Unauthorized;
        Response.Headers.WWWAuthenticate = "Bearer";
        return Task.CompletedTask;
    }
}
