using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Acesso;

public record LoginIn(string? Instituicao, string? Cpf, string? Senha);
public record PrimeiroAcessoIn(string? Instituicao, string? Cpf);
public record DefinirSenhaIn(string? Token, string? NovaSenha);
public record TrocarSenhaIn(string? SenhaAtual, string? NovaSenha);

public static class AuthRotas
{
    const string CpfInvalido = "CPF inválido.";
    const string CredenciaisInvalidas = "CPF ou senha inválidos.";
    const string LinkInvalido = "Link inválido ou vencido.";
    public const string MensagemPrimeiroAcesso = "Se o CPF estiver cadastrado, enviamos um link para o e-mail registrado na instituição.";

    // Hash de uma senha qualquer: o login com CPF desconhecido gasta o mesmo tempo que o de CPF existente.
    static readonly string HashFicticio = new PasswordHasher<Usuario>().HashPassword(new Usuario(), "senha-ficticia");

    public static void Mapear(RouteGroupBuilder api)
    {
        api.MapPost("/auth/login", Login).AllowAnonymous().RequireRateLimiting("auth");
        api.MapPost("/auth/primeiro-acesso", PrimeiroAcesso).AllowAnonymous().RequireRateLimiting("auth");
        api.MapPost("/auth/definir-senha", DefinirSenha).AllowAnonymous();
        // Delegate: o grupo de métodos (HttpContext) -> Task casaria com RequestDelegate e o 204 se perderia
        api.MapPost("/auth/logout", (Delegate)Logout).AllowAnonymous();
        api.MapGet("/auth/me", Eu);
        api.MapPost("/auth/senha", TrocarSenha);
    }

    static async Task<IResult> Login(LoginIn i, OneDb db, IPasswordHasher<Usuario> hasher, HttpContext ctx)
    {
        var cpf = Cpf.Normalizar(i.Cpf);
        if (cpf is null) return Problemas.Invalido(CpfInvalido, "cpf");
        if (string.IsNullOrEmpty(i.Senha)) return Problemas.Invalido("Informe a senha.", "senha");

        var instituicao = await db.Instituicoes.FirstOrDefaultAsync(x => x.Slug == i.Instituicao && x.Ativa);
        Usuario? u = null;
        if (instituicao is not null)
        {
            db.InstituicaoAtual = instituicao.Id;
            u = await db.Usuarios.Include(x => x.Papeis).FirstOrDefaultAsync(x => x.Cpf == cpf);
        }
        var podeEntrar = u is { Ativo: true, SenhaHash: not null };
        var confere = hasher.VerifyHashedPassword(u ?? new Usuario(), podeEntrar ? u!.SenhaHash! : HashFicticio, i.Senha) != PasswordVerificationResult.Failed;
        if (!podeEntrar || !confere) return Problemas.Erro(401, CredenciaisInvalidas);

        await ctx.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, Sessao.Principal(u!));
        return Results.Ok(new
        {
            id = u!.Id,
            nome = u.Nome,
            papeis = u.Papeis.Select(p => p.Papel),
            deveTrocarSenha = u.DeveTrocarSenha,
            instituicao = new { slug = instituicao!.Slug, nome = instituicao.Nome },
        });
    }

    static async Task<IResult> PrimeiroAcesso(PrimeiroAcessoIn i, OneDb db, TimeProvider relogio, Email email, IConfiguration cfg, ILogger<Email> log)
    {
        var cpf = Cpf.Normalizar(i.Cpf);
        if (cpf is null) return Problemas.Invalido(CpfInvalido, "cpf");

        var instituicao = await db.Instituicoes.FirstOrDefaultAsync(x => x.Slug == i.Instituicao && x.Ativa);
        if (instituicao is not null)
        {
            db.InstituicaoAtual = instituicao.Id;
            var u = await db.Usuarios.FirstOrDefaultAsync(x => x.Cpf == cpf && x.Ativo);
            if (u is not null)
            {
                var (token, registro) = Tokens.Novo(instituicao.Slug, u.Id, relogio.GetUtcNow().UtcDateTime);
                db.Tokens.Add(registro);
                await db.SaveChangesAsync();
                try
                {
                    await email.Enviar(instituicao.Nome, u.Email, $"[{instituicao.Nome}] Crie sua senha",
                        $"Olá, {u.Nome}.\n\nPara criar sua senha no One, abra o link abaixo. Ele vale por 60 minutos e só pode ser usado uma vez.\n\n{Tokens.Link(cfg, instituicao.Slug, token)}\n");
                }
                catch (Exception e)
                {
                    log.LogError(e, "Falha ao enviar o e-mail de primeiro acesso da instituição {InstituicaoId} ({Slug})", instituicao.Id, instituicao.Slug);
                }
            }
        }
        return Results.Json(new { mensagem = MensagemPrimeiroAcesso }, statusCode: 202);
    }

    static async Task<IResult> DefinirSenha(DefinirSenhaIn i, OneDb db, TimeProvider relogio, IPasswordHasher<Usuario> hasher)
    {
        var agora = relogio.GetUtcNow().UtcDateTime;
        var (token, u) = await TokenValido(db, i.Token, agora);
        if (token is null || u is null) return Problemas.Erro(400, LinkInvalido);
        if (!Senha.Valida(i.NovaSenha)) return Problemas.Invalido(Senha.ForaDoTamanho, "novaSenha");

        u.SenhaHash = hasher.HashPassword(u, i.NovaSenha!);
        u.DeveTrocarSenha = false;
        token.UsadoEm = agora;
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    // O token do link: da instituição ativa do slug, não usado, não vencido e de um usuário ativo.
    static async Task<(TokenAcesso?, Usuario?)> TokenValido(OneDb db, string? texto, DateTime agora)
    {
        var slug = texto?.Split('.')[0];
        var instituicao = await db.Instituicoes.FirstOrDefaultAsync(x => x.Slug == slug && x.Ativa);
        if (instituicao is null) return (null, null);
        db.InstituicaoAtual = instituicao.Id;
        var hash = Tokens.Hash(texto!);
        var token = await db.Tokens.FirstOrDefaultAsync(t => t.Hash == hash);
        if (token is null || token.UsadoEm is not null || token.ExpiraEm <= agora) return (null, null);
        return (token, await db.Usuarios.FirstOrDefaultAsync(x => x.Id == token.UsuarioId && x.Ativo));
    }

    static async Task<IResult> Logout(HttpContext ctx)
    {
        await ctx.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Results.NoContent();
    }

    static async Task<IResult> Eu(HttpContext ctx, OneDb db)
    {
        var u = ctx.Usuario();
        var i = ctx.Instituicao();
        var matriculas = await db.Matriculas.Where(m => m.UsuarioId == u.Id).OrderBy(m => m.Numero)
            .Select(m => new { id = m.Id, numero = m.Numero, curso = m.Curso!.Nome, semestre = m.Semestre, situacao = m.Situacao })
            .ToListAsync();
        return Results.Ok(new
        {
            id = u.Id,
            nome = u.Nome,
            cpfMascarado = Cpf.Mascarar(u.Cpf),
            papeis = u.Papeis.Select(p => p.Papel),
            deveTrocarSenha = u.DeveTrocarSenha,
            instituicao = new { slug = i.Slug, nome = i.Nome, fuso = i.Fuso },
            matriculas,
        });
    }

    static async Task<IResult> TrocarSenha(TrocarSenhaIn i, HttpContext ctx, OneDb db, IPasswordHasher<Usuario> hasher)
    {
        var u = ctx.Usuario();
        if (u.SenhaHash is null || string.IsNullOrEmpty(i.SenhaAtual) ||
            hasher.VerifyHashedPassword(u, u.SenhaHash, i.SenhaAtual) == PasswordVerificationResult.Failed)
            return Problemas.Invalido("A senha atual está incorreta.", "senhaAtual");
        if (!Senha.Valida(i.NovaSenha)) return Problemas.Invalido(Senha.ForaDoTamanho, "novaSenha");

        u.SenhaHash = hasher.HashPassword(u, i.NovaSenha!);
        u.DeveTrocarSenha = false;
        await db.SaveChangesAsync();
        return Results.NoContent();
    }
}
