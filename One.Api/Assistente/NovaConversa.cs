using System.Text.Json.Serialization;
using Mediator;
using One.Api.Dados;
using static One.Api.Assistente.ConversaRotas;

namespace One.Api.Assistente;

public sealed record NovaConversa(NovaConversa.Entrada Corpo, Usuario Usuario) : IRequest<IResult>
{
    public sealed record Entrada(string? Mensagem, IReadOnlyList<IFormFile> Anexos)
    {
        public static async ValueTask<Entrada?> BindAsync(HttpContext ctx) => await LerEntrada(ctx) is { } e ? new(e.Mensagem, e.Anexos) : null;
    }

    public sealed record Resposta(long ConversaId, [property: JsonPropertyName("resposta")] Resposta.DoAssistente Assistente)
    {
        public sealed record DoAssistente(string Tipo, string Texto);
    }

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/conversas", (NovaConversa.Entrada i, HttpContext ctx, IMediator m) => m.Send(new NovaConversa(i, ctx.Usuario())))
            .Accepts<NovaConversa.Entrada>("application/json", "multipart/form-data").RequireRateLimiting("mensagens").WithMetadata(LimiteDoCorpo);
}

public sealed class NovaConversaHandler(OneDb db, Assistente assistente, Armazenamento armazenamento, TimeProvider relogio) : IRequestHandler<NovaConversa, IResult>
{
    public async ValueTask<IResult> Handle(NovaConversa m, CancellationToken ct)
    {
        var (i, u) = (m.Corpo, m.Usuario);
        if (!await PodeUsarAssistente(db, u)) return Problemas.Erro(403, "O assistente é só para alunos com matrícula ativa.");
        if (ValidarMensagem(i.Mensagem) is { } erro) return erro;
        var (lidos, recusa) = await LerAnexos(i.Anexos, 0);
        if (recusa is not null) return recusa;

        var agora = relogio.GetUtcNow().UtcDateTime;
        var conversa = Conversa.Iniciar(u.Id, agora);
        db.Conversas.Add(conversa);
        var r = await Responder(db, assistente, armazenamento, conversa, u.InstituicaoId, i.Mensagem!, lidos, agora);
        return Results.Created($"/api/conversas/{conversa.Id}", new NovaConversa.Resposta(conversa.Id, new(r.TipoFinal, r.Texto)));
    }
}
