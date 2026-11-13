using Mediator;
using One.Api.Dados;
using static One.Api.Assistente.ConversaDoAluno;

namespace One.Api.Assistente;

public sealed record EncerrarConversa(long Id, Usuario Usuario) : IRequest<IResult>
{
    public sealed record Resposta(string? Desfecho);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/conversas/{id:long}/encerrar", (long id, HttpContext ctx, IMediator m) => m.Send(new EncerrarConversa(id, ctx.Usuario())));
}

public sealed class EncerrarConversaHandler(OneDb db, TimeProvider relogio) : IRequestHandler<EncerrarConversa, IResult>
{
    public async ValueTask<IResult> Handle(EncerrarConversa m, CancellationToken ct)
    {
        var conversa = await DoAluno(db, m.Usuario, m.Id);
        if (conversa is null) return NaoEncontrada();
        if (conversa.Encerrar(relogio.GetUtcNow().UtcDateTime) is not null) return JaEncerrada();
        await db.SaveChangesAsync();
        return Results.Ok(new EncerrarConversa.Resposta(conversa.Desfecho));
    }
}
