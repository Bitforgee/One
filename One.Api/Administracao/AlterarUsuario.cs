using Mediator;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record AlterarUsuario(long Id, AlterarUsuario.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(string? Cpf, string? Nome, string? Email, string? SenhaTemporaria, string[]? Papeis, long[]? Setores);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPut("/usuarios/{id:long}", (long id, AlterarUsuario.Entrada i, IMediator m) => m.Send(new AlterarUsuario(id, i)));
}

public sealed class AlterarUsuarioHandler(OneDb db, IPasswordHasher<Usuario> hasher) : IRequestHandler<AlterarUsuario, IResult>
{
    public async ValueTask<IResult> Handle(AlterarUsuario m, CancellationToken ct)
    {
        var u = await db.Usuarios.Include(x => x.Papeis).Include(x => x.Setores).FirstOrDefaultAsync(x => x.Id == m.Id, ct);
        if (u is null) return ErrosDeAdmin.NaoEncontrado();
        var e = m.Corpo;
        if (await ValidacaoDeUsuario.Validar(db, e.Cpf, e.Nome, e.Email, e.SenhaTemporaria, e.Papeis, e.Setores, m.Id) is { } erro) return erro;
        u.Atualizar(new DadosUsuario(Cpf.Tentar(e.Cpf)!, e.Nome!, e.Email!));
        u.DefinirAcesso(e.Papeis!, e.Setores ?? []);
        if (e.SenhaTemporaria is not null) u.DefinirSenhaTemporaria(hasher.HashPassword(u, e.SenhaTemporaria));
        await db.SaveChangesAsync(ct);
        return Results.Ok(await UsuarioResposta.De(db, u));
    }
}
