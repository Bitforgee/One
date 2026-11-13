using Mediator;
using Microsoft.AspNetCore.Identity;
using One.Api.Dados;

namespace One.Api.Acesso;

public sealed record TrocarSenha(TrocarSenha.Entrada Corpo, Usuario Usuario) : IRequest<IResult>
{
    public sealed record Entrada(string? SenhaAtual, string? NovaSenha);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/auth/senha", (TrocarSenha.Entrada i, HttpContext ctx, IMediator m) => m.Send(new TrocarSenha(i, ctx.Usuario())));
}

public sealed class TrocarSenhaHandler(OneDb db, IPasswordHasher<Usuario> hasher) : IRequestHandler<TrocarSenha, IResult>
{
    public async ValueTask<IResult> Handle(TrocarSenha m, CancellationToken ct)
    {
        var (i, u) = (m.Corpo, m.Usuario);
        if (u.SenhaHash is null || string.IsNullOrEmpty(i.SenhaAtual) ||
            hasher.VerifyHashedPassword(u, u.SenhaHash, i.SenhaAtual) == PasswordVerificationResult.Failed)
            return Problemas.Invalido("A senha atual está incorreta.", "senhaAtual");
        if (!Senha.Valida(i.NovaSenha)) return Problemas.Invalido(Senha.ForaDoTamanho, "novaSenha");

        u.TrocarSenha(hasher.HashPassword(u, i.NovaSenha!));
        await db.SaveChangesAsync();
        return Results.NoContent();
    }
}
