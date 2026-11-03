using Mediator;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Acesso;

public sealed record DefinirSenha(DefinirSenha.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(string? Token, string? NovaSenha);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/auth/definir-senha", (DefinirSenha.Entrada i, IMediator m) => m.Send(new DefinirSenha(i))).AllowAnonymous();
}

public sealed class DefinirSenhaHandler(OneDb db, TimeProvider relogio, IPasswordHasher<Usuario> hasher) : IRequestHandler<DefinirSenha, IResult>
{
    const string LinkInvalido = "Link inválido ou vencido.";

    public async ValueTask<IResult> Handle(DefinirSenha m, CancellationToken ct)
    {
        var i = m.Corpo;
        var agora = relogio.GetUtcNow().UtcDateTime;
        var (token, u) = await TokenValido(i.Token, agora);
        if (token is null || u is null) return Problemas.Erro(400, LinkInvalido);
        if (!Senha.Valida(i.NovaSenha)) return Problemas.Invalido(Senha.ForaDoTamanho, "novaSenha");

        u.SenhaHash = hasher.HashPassword(u, i.NovaSenha!);
        u.DeveTrocarSenha = false;
        token.UsadoEm = agora;
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    // O token do link: da instituição ativa do slug, não usado, não vencido e de um usuário ativo.
    async Task<(TokenAcesso?, Usuario?)> TokenValido(string? texto, DateTime agora)
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
}
