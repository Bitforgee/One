using Mediator;

namespace One.Api.Chamados;

public sealed record VerChavePush : IRequest<IResult>
{
    public sealed record Resposta(string ChavePublica);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapGet("/chave", (IMediator m) => m.Send(new VerChavePush()));
}

public sealed class VerChavePushHandler(IConfiguration cfg) : IRequestHandler<VerChavePush, IResult>
{
    public ValueTask<IResult> Handle(VerChavePush m, CancellationToken ct) =>
        ValueTask.FromResult(ConfigPush.Ler(cfg) is { Ligado: true } c ? Results.Ok(new VerChavePush.Resposta(c.ChavePublica)) : Results.NoContent()); // 204, não 404: o navegador não registra erro com o push desligado
}
