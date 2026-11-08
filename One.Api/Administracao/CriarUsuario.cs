using Mediator;
using One.Api.Administracao.Shared;
using Microsoft.AspNetCore.Identity;
using One.Api.Dados;
using static One.Api.Administracao.UsuarioRotas;

namespace One.Api.Administracao;

public sealed record CriarUsuario(CriarUsuario.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(string? Cpf, string? Nome, string? Email, string? SenhaTemporaria, string[]? Papeis, long[]? Setores);

    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/usuarios", (CriarUsuario.Entrada i, IMediator m) => m.Send(new CriarUsuario(i)));
}

public sealed class CriarUsuarioHandler(OneDb db, IPasswordHasher<Usuario> hasher) : IRequestHandler<CriarUsuario, IResult>
{
    public async ValueTask<IResult> Handle(CriarUsuario m, CancellationToken ct)
    {
        var e = m.Corpo;
        if (await Validar(db, e.Cpf, e.Nome, e.Email, e.SenhaTemporaria, e.Papeis, e.Setores, 0) is { } erro) return erro;
        var u = db.Usuarios.Add(new Usuario()).Entity;
        await Gravar(db, u, e.Cpf, e.Nome, e.Email, e.SenhaTemporaria, e.Papeis, e.Setores, hasher);
        return Results.Created($"/api/admin/usuarios/{u.Id}", await UsuarioResposta.De(db, u));
    }
}
