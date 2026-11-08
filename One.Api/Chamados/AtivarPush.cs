using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Chamados;

public sealed record AtivarPush(AtivarPush.Entrada Corpo, Usuario Usuario) : IRequest<IResult>
{
    public sealed record Entrada(string? Endpoint, Chaves? Chaves);
    public sealed record Chaves(string? P256dh, string? Auth);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/subscricao", (AtivarPush.Entrada? i, HttpContext ctx, IMediator m) => m.Send(new AtivarPush(i ?? new(null, null), ctx.Usuario())));
}

public sealed class AtivarPushHandler(OneDb db, IConfiguration cfg, TimeProvider relogio) : IRequestHandler<AtivarPush, IResult>
{
    const int MaxEndpoint = 2048;
    const int MaxPorUsuario = 10;

    public async ValueTask<IResult> Handle(AtivarPush m, CancellationToken ct)
    {
        if (!ConfigPush.Ler(cfg).Ligado) return Problemas.Erro(404, PushRotas.NaoConfigurado);
        var (endpoint, p256dh, auth, u) = (m.Corpo.Endpoint, m.Corpo.Chaves?.P256dh, m.Corpo.Chaves?.Auth, m.Usuario);
        if (endpoint is not { Length: > 0 and <= MaxEndpoint } || !Uri.TryCreate(endpoint, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
            return Problemas.Invalido($"O endpoint deve ser uma URL https de até {MaxEndpoint} caracteres.", "endpoint");
        if (string.IsNullOrWhiteSpace(p256dh) || string.IsNullOrWhiteSpace(auth)) return Problemas.Invalido("As chaves p256dh e auth são obrigatórias.", "chaves");

        var agora = relogio.GetUtcNow().UtcDateTime;
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        // o endpoint é único no banco inteiro (door 2): a linha de outra instituição não passa pelo filtro global, então vem para esta por SQL
        await db.Database.ExecuteSqlAsync($"UPDATE subscricao_push SET instituicao_id = {u.InstituicaoId} WHERE endpoint = {endpoint} AND instituicao_id <> {u.InstituicaoId}", ct);
        var s = await db.SubscricoesPush.SingleOrDefaultAsync(x => x.Endpoint == endpoint, ct);
        if (s is null) db.SubscricoesPush.Add(SubscricaoPush.Registrar(u.Id, u.InstituicaoId, endpoint, p256dh, auth, agora));
        else s.Reatribuir(u.Id, u.InstituicaoId, p256dh, auth, agora);
        await db.SaveChangesAsync(ct);

        var antigas = await db.SubscricoesPush.Where(x => x.UsuarioId == u.Id).OrderByDescending(x => x.RegistradaEm).ThenByDescending(x => x.Id).Skip(MaxPorUsuario).ToListAsync(ct);
        db.SubscricoesPush.RemoveRange(antigas);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return Results.NoContent();
    }
}
