using Mediator;
using One.Api.Administracao.Shared;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record AlterarRespostaPronta(long Id, AlterarRespostaPronta.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(long? SetorId, string? Titulo, string? Texto);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPut("/respostas-prontas/{id:long}", (long id, AlterarRespostaPronta.Entrada i, IMediator m) => m.Send(new AlterarRespostaPronta(id, i)));
}

public sealed class AlterarRespostaProntaHandler(OneDb db) : IRequestHandler<AlterarRespostaPronta, IResult>
{
    public async ValueTask<IResult> Handle(AlterarRespostaPronta m, CancellationToken ct)
    {
        var e = m.Corpo;
        return await CadastroRotas.Alterar<RespostaPronta, RespostaProntaResposta>(db, m.Id, a => CriarRespostaPronta.Validar(db, e.SetorId, e.Titulo, e.Texto, a), s => CriarRespostaPronta.Aplicar(s, e.SetorId, e.Titulo, e.Texto), RespostaProntaResposta.De);
    }
}
