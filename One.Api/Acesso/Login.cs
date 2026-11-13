using System.Security.Claims;
using Mediator;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Acesso;

public sealed record ResultadoLogin(ClaimsPrincipal? Principal, IResult Resposta);

public sealed record Login(Login.Entrada Corpo) : IRequest<ResultadoLogin>
{
    public sealed record Entrada(string? Instituicao, string? Cpf, string? Senha);

    public sealed record Resposta(long Id, string Nome, IReadOnlyList<string> Papeis, bool DeveTrocarSenha, Resposta.DaInstituicao Instituicao)
    {
        public sealed record DaInstituicao(string Slug, string Nome);
    }

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/auth/login", async (Login.Entrada i, HttpContext ctx, IMediator m) =>
        {
            var e = await m.Send(new Login(i));
            if (e.Principal is { } p) await ctx.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, p);
            return e.Resposta;
        }).AllowAnonymous().RequireRateLimiting("auth");
}

public sealed class LoginHandler(OneDb db, IPasswordHasher<Usuario> hasher) : IRequestHandler<Login, ResultadoLogin>
{
    const string CredenciaisInvalidas = "CPF ou senha inválidos.";

    static readonly string HashFicticio = new PasswordHasher<Usuario>().HashPassword(Usuario.Criar(Cpf.Ler(""), "", ""), "senha-ficticia");

    public async ValueTask<ResultadoLogin> Handle(Login m, CancellationToken ct)
    {
        var i = m.Corpo;
        var cpf = Cpf.Tentar(i.Cpf);
        if (cpf is null) return new(null, Problemas.Invalido("CPF inválido.", "cpf"));
        if (string.IsNullOrEmpty(i.Senha)) return new(null, Problemas.Invalido("Informe a senha.", "senha"));

        var instituicao = await db.Instituicoes.FirstOrDefaultAsync(x => x.Slug == i.Instituicao && x.Ativa);
        Usuario? u = null;
        if (instituicao is not null)
        {
            db.InstituicaoAtual = instituicao.Id;
            u = await db.Usuarios.Include(x => x.Papeis).FirstOrDefaultAsync(x => x.Cpf == cpf);
        }
        var podeEntrar = u is { Ativo: true, SenhaHash: not null };
        var confere = hasher.VerifyHashedPassword(u ?? Usuario.Criar(Cpf.Ler(""), "", ""), podeEntrar ? u!.SenhaHash! : HashFicticio, i.Senha) != PasswordVerificationResult.Failed;
        if (!podeEntrar || !confere) return new(null, Problemas.Erro(401, CredenciaisInvalidas));

        return new(CookieDeSessao.Principal(u!), Results.Ok(new Login.Resposta(u!.Id, u.Nome, [.. u.Papeis.Select(p => p.Papel)], u.DeveTrocarSenha,
            new Login.Resposta.DaInstituicao(instituicao!.Slug, instituicao.Nome))));
    }
}
