using System.Security.Claims;
using Mediator;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Acesso;

// door 6: o handler devolve o principal e a resposta; o cookie é emitido no lambda, que tem o HttpContext.
public sealed record Entrada(ClaimsPrincipal? Principal, IResult Resposta);

public sealed record Login(LoginIn Corpo) : IRequest<Entrada>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/auth/login", async (LoginIn i, HttpContext ctx, IMediator m) =>
        {
            var e = await m.Send(new Login(i));
            if (e.Principal is { } p) await ctx.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, p);
            return e.Resposta;
        }).AllowAnonymous().RequireRateLimiting("auth");
}

public sealed class LoginHandler(OneDb db, IPasswordHasher<Usuario> hasher) : IRequestHandler<Login, Entrada>
{
    const string CredenciaisInvalidas = "CPF ou senha inválidos.";

    // Hash de uma senha qualquer: o login com CPF desconhecido gasta o mesmo tempo que o de CPF existente.
    static readonly string HashFicticio = new PasswordHasher<Usuario>().HashPassword(new Usuario(), "senha-ficticia");

    public async ValueTask<Entrada> Handle(Login m, CancellationToken ct)
    {
        var i = m.Corpo;
        var cpf = Cpf.Normalizar(i.Cpf);
        if (cpf is null) return new(null, Problemas.Invalido(AuthRotas.CpfInvalido, "cpf"));
        if (string.IsNullOrEmpty(i.Senha)) return new(null, Problemas.Invalido("Informe a senha.", "senha"));

        var instituicao = await db.Instituicoes.FirstOrDefaultAsync(x => x.Slug == i.Instituicao && x.Ativa);
        Usuario? u = null;
        if (instituicao is not null)
        {
            db.InstituicaoAtual = instituicao.Id;
            u = await db.Usuarios.Include(x => x.Papeis).FirstOrDefaultAsync(x => x.Cpf == cpf);
        }
        var podeEntrar = u is { Ativo: true, SenhaHash: not null };
        var confere = hasher.VerifyHashedPassword(u ?? new Usuario(), podeEntrar ? u!.SenhaHash! : HashFicticio, i.Senha) != PasswordVerificationResult.Failed;
        if (!podeEntrar || !confere) return new(null, Problemas.Erro(401, CredenciaisInvalidas));

        return new(Sessao.Principal(u!), Results.Ok(new
        {
            id = u!.Id,
            nome = u.Nome,
            papeis = u.Papeis.Select(p => p.Papel),
            deveTrocarSenha = u.DeveTrocarSenha,
            instituicao = new { slug = instituicao!.Slug, nome = instituicao.Nome },
        }));
    }
}
