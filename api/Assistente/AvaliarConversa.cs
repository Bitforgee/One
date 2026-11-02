using Mediator;
using One.Api.Dados;
using static One.Api.Assistente.ConversaRotas;

namespace One.Api.Assistente;

public sealed record AvaliarConversa(long Id, AvaliacaoIn Corpo, Usuario Usuario) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/conversas/{id:long}/avaliacao", (long id, AvaliacaoIn i, HttpContext ctx, IMediator m) => m.Send(new AvaliarConversa(id, i, ctx.Usuario())));
}

public sealed class AvaliarConversaHandler(OneDb db, TimeProvider relogio) : IRequestHandler<AvaliarConversa, IResult>
{
    public async ValueTask<IResult> Handle(AvaliarConversa m, CancellationToken ct)
    {
        var conversa = await DoAluno(db, m.Usuario, m.Id);
        if (conversa is null) return NaoEncontrada();
        if (m.Corpo.Resolveu is null) return Problemas.Invalido("Informe se a resposta resolveu.", "resolveu");
        if (conversa.Desfecho is not null) return JaEncerrada();
        if (m.Corpo.Resolveu.Value)
        {
            conversa.Desfecho = Desfechos.Resolvida;
            conversa.DesfechoEm = relogio.GetUtcNow().UtcDateTime;
            await db.SaveChangesAsync();
        }
        return Results.Ok(new { desfecho = conversa.Desfecho });
    }
}
