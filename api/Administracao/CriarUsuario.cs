using Mediator;
using Microsoft.AspNetCore.Identity;
using One.Api.Dados;
using static One.Api.Administracao.UsuarioRotas;

namespace One.Api.Administracao;

public sealed record CriarUsuario(UsuarioIn Corpo) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/usuarios", (UsuarioIn i, IMediator m) => m.Send(new CriarUsuario(i)));
}

public sealed class CriarUsuarioHandler(OneDb db, IPasswordHasher<Usuario> hasher) : IRequestHandler<CriarUsuario, IResult>
{
    public async ValueTask<IResult> Handle(CriarUsuario m, CancellationToken ct)
    {
        if (await Validar(db, m.Corpo, 0) is { } erro) return erro;
        var u = db.Usuarios.Add(new Usuario()).Entity;
        await Gravar(db, u, m.Corpo, hasher);
        return Results.Created($"/api/admin/usuarios/{u.Id}", await Saida(db, u));
    }
}
