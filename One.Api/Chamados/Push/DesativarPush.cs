using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Chamados.Push;

public sealed record DesativarPush(string? Endpoint, Usuario Usuario) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapDelete("/subscricao", (string? endpoint, HttpContext ctx, IMediator m) => m.Send(new DesativarPush(endpoint, ctx.Usuario())));
}

public sealed class DesativarPushHandler(OneDb db) : IRequestHandler<DesativarPush, IResult>
{
    public async ValueTask<IResult> Handle(DesativarPush m, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(m.Endpoint)) return Problemas.Invalido("O endpoint é obrigatório.", "endpoint");
        db.SubscricoesPush.RemoveRange(await db.SubscricoesPush.Where(x => x.UsuarioId == m.Usuario.Id && x.Endpoint == m.Endpoint).ToListAsync(ct));
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }
}
