using Mediator;
using One.Api.Administracao.Shared;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using static One.Api.Administracao.UsuarioRotas;

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
        var u = await db.Usuarios.Include(x => x.Papeis).FirstOrDefaultAsync(x => x.Id == m.Id);
        if (u is null) return AdminRotas.NaoEncontrado();
        var e = m.Corpo;
        if (await Validar(db, e.Cpf, e.Nome, e.Email, e.SenhaTemporaria, e.Papeis, e.Setores, m.Id) is { } erro) return erro;
        await Gravar(db, u, e.Cpf, e.Nome, e.Email, e.SenhaTemporaria, e.Papeis, e.Setores, hasher);
        return Results.Ok(await UsuarioResposta.De(db, u));
    }
}
