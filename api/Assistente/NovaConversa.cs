using Mediator;
using One.Api.Dados;
using static One.Api.Assistente.ConversaRotas;

namespace One.Api.Assistente;

public sealed record NovaConversa(MensagemIn Corpo, Usuario Usuario) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/conversas", (MensagemIn i, HttpContext ctx, IMediator m) => m.Send(new NovaConversa(i, ctx.Usuario()))).RequireRateLimiting("mensagens");
}

public sealed class NovaConversaHandler(OneDb db, Assistente assistente, TimeProvider relogio) : IRequestHandler<NovaConversa, IResult>
{
    public async ValueTask<IResult> Handle(NovaConversa m, CancellationToken ct)
    {
        var (i, u) = (m.Corpo, m.Usuario);
        if (!await PodeUsarAssistente(db, u)) return Problemas.Erro(403, "O assistente é só para alunos com matrícula ativa.");
        if (ValidarMensagem(i.Mensagem) is { } erro) return erro;

        var agora = relogio.GetUtcNow().UtcDateTime;
        var conversa = new Conversa { AlunoId = u.Id, CriadaEm = agora, UltimaMensagemEm = agora };
        db.Conversas.Add(conversa);
        var resposta = await Responder(db, assistente, conversa, i.Mensagem!, agora);
        return Results.Created($"/api/conversas/{conversa.Id}", new { conversaId = conversa.Id, resposta });
    }
}
