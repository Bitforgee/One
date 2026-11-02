using Mediator;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record AlterarRespostaPronta(long Id, RespostaProntaIn Corpo) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPut("/respostas-prontas/{id:long}", (long id, RespostaProntaIn i, IMediator m) => m.Send(new AlterarRespostaPronta(id, i)));
}

public sealed class AlterarRespostaProntaHandler(OneDb db) : IRequestHandler<AlterarRespostaPronta, IResult>
{
    public async ValueTask<IResult> Handle(AlterarRespostaPronta m, CancellationToken ct) =>
        await CadastroRotas.Alterar<RespostaPronta, RespostaProntaIn>(db, m.Id, m.Corpo, CriarRespostaPronta.Saida, CriarRespostaPronta.Validar, CriarRespostaPronta.Aplicar);
}
