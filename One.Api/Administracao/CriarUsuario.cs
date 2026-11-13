using Mediator;
using Microsoft.AspNetCore.Identity;
using One.Api.Dados;

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
        if (await ValidacaoDeUsuario.Validar(db, e.Cpf, e.Nome, e.Email, e.SenhaTemporaria, e.Papeis, e.Setores, 0) is { } erro) return erro;
        var u = db.Usuarios.Add(Usuario.Criar(Cpf.Tentar(e.Cpf)!, e.Nome!, e.Email!)).Entity;
        u.DefinirAcesso(e.Papeis!, e.Setores ?? []);
        if (e.SenhaTemporaria is not null) u.DefinirSenhaTemporaria(hasher.HashPassword(u, e.SenhaTemporaria));
        await db.SaveChangesAsync(ct);
        return Results.Created($"/api/admin/usuarios/{u.Id}", await UsuarioResposta.De(db, u));
    }
}
