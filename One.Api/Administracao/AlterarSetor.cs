using Mediator;
using One.Api.Administracao.Shared;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record AlterarSetor(long Id, AlterarSetor.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(string? Nome, bool? Triagem, bool? Ativo);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPut("/setores/{id:long}", (long id, AlterarSetor.Entrada i, IMediator m) => m.Send(new AlterarSetor(id, i)));
}

public sealed class AlterarSetorHandler(OneDb db) : IRequestHandler<AlterarSetor, IResult>
{
    public async ValueTask<IResult> Handle(AlterarSetor m, CancellationToken ct)
    {
        var e = new CriarSetor.Entrada(m.Corpo.Nome, m.Corpo.Triagem, m.Corpo.Ativo);
        return await CadastroRotas.Alterar<Setor, SetorResposta>(db, m.Id, a => CriarSetor.Validar(db, e, a), s => CriarSetor.Aplicar(s, e), SetorResposta.De);
    }
}
