using Mediator;
using One.Api.Administracao.Shared;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using static One.Api.Dados.Chamados.EstadosChamado;

namespace One.Api.Administracao;

public sealed record DesativarUsuario(long Id, Usuario Admin) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/usuarios/{id:long}/desativar", (long id, HttpContext ctx, IMediator m) => m.Send(new DesativarUsuario(id, ctx.Usuario())));
}

public sealed class DesativarUsuarioHandler(OneDb db, TimeProvider relogio) : IRequestHandler<DesativarUsuario, IResult>
{
    public async ValueTask<IResult> Handle(DesativarUsuario m, CancellationToken ct)
    {
        var id = m.Id;
        var u = await db.Usuarios.Include(x => x.Papeis).FirstOrDefaultAsync(x => x.Id == id);
        if (u is null) return AdminRotas.NaoEncontrado();
        var agora = relogio.GetUtcNow().UtcDateTime;
        var adminId = m.Admin.Id;
        u.Desativar();
        foreach (var c in await db.Chamados.Where(c => c.ResponsavelId == id && c.Estado != Fechado).ToListAsync())
            c.DevolverAFila(adminId, u.Nome, agora);
        await db.SaveChangesAsync();
        return Results.Ok(await UsuarioResposta.De(db, u));
    }
}
