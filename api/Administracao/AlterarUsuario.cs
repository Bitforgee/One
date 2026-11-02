using Mediator;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using static One.Api.Administracao.UsuarioRotas;

namespace One.Api.Administracao;

public sealed record AlterarUsuario(long Id, UsuarioIn Corpo) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPut("/usuarios/{id:long}", (long id, UsuarioIn i, IMediator m) => m.Send(new AlterarUsuario(id, i)));
}

public sealed class AlterarUsuarioHandler(OneDb db, IPasswordHasher<Usuario> hasher) : IRequestHandler<AlterarUsuario, IResult>
{
    public async ValueTask<IResult> Handle(AlterarUsuario m, CancellationToken ct)
    {
        var u = await db.Usuarios.Include(x => x.Papeis).FirstOrDefaultAsync(x => x.Id == m.Id);
        if (u is null) return AdminRotas.NaoEncontrado();
        if (await Validar(db, m.Corpo, m.Id) is { } erro) return erro;
        await Gravar(db, u, m.Corpo, hasher);
        return Results.Ok(await Saida(db, u));
    }
}
