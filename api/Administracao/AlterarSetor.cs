using Mediator;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record AlterarSetor(long Id, SetorIn Corpo) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPut("/setores/{id:long}", (long id, SetorIn i, IMediator m) => m.Send(new AlterarSetor(id, i)));
}

public sealed class AlterarSetorHandler(OneDb db) : IRequestHandler<AlterarSetor, IResult>
{
    public async ValueTask<IResult> Handle(AlterarSetor m, CancellationToken ct) =>
        await CadastroRotas.Alterar<Setor, SetorIn>(db, m.Id, m.Corpo, CriarSetor.Saida, CriarSetor.Validar, CriarSetor.Aplicar);
}
