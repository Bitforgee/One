using Mediator;
using One.Api.Chamados;
using One.Api.Dados;
using static One.Api.Assistente.ConversaRotas;

namespace One.Api.Assistente;

public sealed record TransferirConversa(long Id, TransferirConversa.Entrada? Corpo, Usuario Usuario, Instituicao Instituicao) : IRequest<IResult>
{
    public sealed record Entrada(long? MatriculaId, bool? AceitaLideranca);

    public sealed record Resposta(string Numero, string Estado, string Setor);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/conversas/{id:long}/transferir", (long id, TransferirConversa.Entrada? i, HttpContext ctx, IMediator m) => m.Send(new TransferirConversa(id, i, ctx.Usuario(), ctx.Instituicao())));
}

public sealed class TransferirConversaHandler(OneDb db, TimeProvider relogio) : IRequestHandler<TransferirConversa, IResult>
{
    public async ValueTask<IResult> Handle(TransferirConversa m, CancellationToken ct)
    {
        var conversa = await DoAluno(db, m.Usuario, m.Id);
        if (conversa is null) return NaoEncontrada();
        if (conversa.Desfecho is not null) return JaEncerrada();
        var matricula = await Transferencia.Matricula(db, conversa.AlunoId, m.Corpo?.MatriculaId);
        if (matricula is null) return Transferencia.MatriculaInvalida();
        return await Transferido(db, await Transferencia.Criar(db, m.Instituicao, conversa, matricula, relogio.GetUtcNow().UtcDateTime, m.Corpo?.AceitaLideranca == true),
            (numero, estado, setor) => new TransferirConversa.Resposta(numero, estado, setor));
    }
}
