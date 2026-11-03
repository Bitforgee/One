using System.Text.Json.Serialization;
using Mediator;
using One.Api.Dados;
using static One.Api.Assistente.ConversaRotas;

namespace One.Api.Assistente;

public sealed record NovaMensagem(long Id, NovaMensagem.Entrada Corpo, Usuario Usuario) : IRequest<IResult>
{
    public sealed record Entrada(string? Mensagem);

    public sealed record Resposta([property: JsonPropertyName("resposta")] Resposta.DoAssistente Assistente)
    {
        public sealed record DoAssistente(string Tipo, string Texto);
    }

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/conversas/{id:long}/mensagens", (long id, NovaMensagem.Entrada i, HttpContext ctx, IMediator m) => m.Send(new NovaMensagem(id, i, ctx.Usuario()))).RequireRateLimiting("mensagens");
}

public sealed class NovaMensagemHandler(OneDb db, Assistente assistente, TimeProvider relogio) : IRequestHandler<NovaMensagem, IResult>
{
    const int LimiteMensagensDoAluno = 10;

    public async ValueTask<IResult> Handle(NovaMensagem m, CancellationToken ct)
    {
        var conversa = await DoAluno(db, m.Usuario, m.Id);
        if (conversa is null) return NaoEncontrada();
        if (ValidarMensagem(m.Corpo.Mensagem) is { } erro) return erro;
        if (conversa.Desfecho is not null) return JaEncerrada();
        if (conversa.Mensagens.Count(x => x.Autor == Aluno) >= LimiteMensagensDoAluno)
            return Problemas.Erro(409, "A conversa chegou ao limite de 10 mensagens. Fale com um atendente ou encerre.");

        var r = await Responder(db, assistente, conversa, m.Corpo.Mensagem!, relogio.GetUtcNow().UtcDateTime);
        return Results.Ok(new NovaMensagem.Resposta(new(r.TipoFinal, r.Texto)));
    }
}
