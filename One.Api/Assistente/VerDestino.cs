using Mediator;
using One.Api.Chamados;
using One.Api.Dados;
using One.Api.Dados.Fluxos;
using static One.Api.Assistente.ConversaRotas;

namespace One.Api.Assistente;

// Informa, sem gravar, se a transferência desta conversa passaria primeiro pela liderança do semestre (door 6).
public sealed record VerDestino(long Id, long? MatriculaId, Usuario Usuario) : IRequest<IResult>
{
    public sealed record Resposta(bool Lideranca);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapGet("/conversas/{id:long}/destino", (long id, long? matriculaId, HttpContext ctx, IMediator m) => m.Send(new VerDestino(id, matriculaId, ctx.Usuario())));
}

public sealed class VerDestinoHandler(OneDb db) : IRequestHandler<VerDestino, IResult>
{
    public async ValueTask<IResult> Handle(VerDestino m, CancellationToken ct)
    {
        var conversa = await DoAluno(db, m.Usuario, m.Id);
        if (conversa is null) return NaoEncontrada();
        if (conversa.Desfecho is not null) return JaEncerrada();
        var matricula = await Transferencia.Matricula(db, conversa.AlunoId, m.MatriculaId);
        if (matricula is null) return Transferencia.MatriculaInvalida();
        var (categoria, _) = await Transferencia.EscolherCategoria(db, conversa);
        var rota = await ResolverFluxo.Rotear(db, categoria, matricula, true);
        return Results.Ok(new VerDestino.Resposta(rota.Passo is { } p && DestinosEtapa.PedeCiencia(p.Etapa.Destino)));
    }
}
