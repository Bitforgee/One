using Mediator;
using One.Api.Administracao.Shared;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record ListarRespostasProntas : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) => g.MapGet("/respostas-prontas", (IMediator m) => m.Send(new ListarRespostasProntas()));
}

public sealed class ListarRespostasProntasHandler(OneDb db) : IRequestHandler<ListarRespostasProntas, IResult>
{
    public async ValueTask<IResult> Handle(ListarRespostasProntas m, CancellationToken ct) => await CadastroRotas.Listar<RespostaPronta, RespostaProntaResposta>(db, RespostaProntaResposta.De);
}
